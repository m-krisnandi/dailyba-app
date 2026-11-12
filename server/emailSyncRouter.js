const express = require('express');
const crypto = require('crypto');
const { parseEmailReceipt } = require('./parsers/engine');
const { cleanMimeText } = require('./parsers/types');
const { encrypt, decrypt, timingSafeEqual, redactPII, stripGreetings } = require('./crypto');

const ALLOWED_CATEGORIES = new Set([
  'food_drinks',
  'shopping',
  'train',
  'ride',
  'laundry',
  'rent',
  'family',
  'gifts',
  'vps',
  'mobile',
  'others'
]);

const ALLOWED_SOURCES = new Set(['bank', 'ewallet', 'credit_card', 'cash']);
const ALLOWED_CURRENCIES = new Set(['IDR', 'JPY', 'USD', 'MMK']);

/**
 * Creates the Email & Bank Sync Router
 * @param {import('better-sqlite3').Database} db
 * @param {Function} authenticateToken
 * @param {string} jwtSecret
 */
function createEmailSyncRouter(db, authenticateToken, jwtSecret) {
  const router = express.Router();

  // Create tables if not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS google_connections (
      user_id TEXT PRIMARY KEY,
      email TEXT,
      refresh_token TEXT NOT NULL,
      access_token TEXT,
      token_expires_at INTEGER,
      requires_reauth INTEGER DEFAULT 0,
      connected_at TEXT NOT NULL,
      last_synced_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_imports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      dedup_hash TEXT NOT NULL,
      source TEXT NOT NULL,
      provider TEXT NOT NULL,
      merchant TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      category TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      occurred_time TEXT,
      raw_snippet TEXT,
      confidence REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, message_id)
    );

    -- Permanent tombstone registry of all processed email message_ids.
    -- Never deleted by user clearing pending imports, preventing duplicate imports upon re-sync or re-connect.
    CREATE TABLE IF NOT EXISTS imported_message_ids (
      user_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY(user_id, message_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_pending_user_status ON pending_imports (user_id, status);
    CREATE INDEX IF NOT EXISTS idx_pending_hash ON pending_imports (user_id, dedup_hash);

    -- Purge invalid non-positive amounts
    DELETE FROM pending_imports WHERE amount <= 0;
  `);

  // Helper: check if Google OAuth is configured via environment
  function getGoogleOAuthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_API_URL || 'https://dailyba.pdfumi.com').replace(/\/+$/, '');
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/email-sync/google-callback`;

    return {
      isConfigured: Boolean(clientId && clientSecret),
      clientId,
      clientSecret,
      redirectUri
    };
  }

  // Helper: Refresh access token if expired, handles invalid_grant
  async function getValidAccessToken(userId) {
    const conn = db.prepare('SELECT * FROM google_connections WHERE user_id = ?').get(userId);
    if (!conn) return null;

    const rawRefreshToken = decrypt(conn.refresh_token);
    const rawAccessToken = decrypt(conn.access_token);
    const now = Date.now();

    // If token decryption failed (e.g. key changed or legacy plaintext), force reconnect
    if (!rawRefreshToken) {
      db.prepare('UPDATE google_connections SET requires_reauth = 1 WHERE user_id = ?').run(userId);
      return null;
    }

    // Return existing token if valid for at least 2 more minutes
    if (rawAccessToken && conn.token_expires_at && conn.token_expires_at > now + 120000 && !conn.requires_reauth) {
      return rawAccessToken;
    }

    const { clientId, clientSecret } = getGoogleOAuthConfig();
    if (!clientId || !clientSecret) return null;

    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: rawRefreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[Google OAuth] Token refresh failed:', errText);
        // Detect revoked token or 7-day test mode expiration
        if (errText.includes('invalid_grant')) {
          db.prepare('UPDATE google_connections SET requires_reauth = 1 WHERE user_id = ?').run(userId);
        }
        return null;
      }

      const tokenData = await res.json();
      const newAccessToken = tokenData.access_token;
      const newExpiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

      db.prepare(`
        UPDATE google_connections
        SET access_token = ?, token_expires_at = ?, requires_reauth = 0
        WHERE user_id = ?
      `).run(encrypt(newAccessToken), newExpiresAt, userId);

      return newAccessToken;
    } catch (err) {
      console.error('[Google OAuth] Token refresh exception:', err.message);
      return null;
    }
  }

  // 1. Status: Check Google configuration & user connection
  router.get('/status', authenticateToken, (req, res) => {
    try {
      const config = getGoogleOAuthConfig();
      const conn = db.prepare('SELECT email, requires_reauth, connected_at, last_synced_at FROM google_connections WHERE user_id = ?').get(req.user.id);
      const pendingCount = db.prepare(`
        SELECT COUNT(*) as count FROM pending_imports
        WHERE user_id = ? AND status = 'pending'
      `).get(req.user.id);

      const statusData = {
        googleConfigured: config.isConfigured,
        isConnected: Boolean(conn && !conn.requires_reauth),
        requiresReauth: Boolean(conn?.requires_reauth),
        connectedEmail: conn?.email || null,
        connectedAt: conn?.connected_at || null,
        lastSyncedAt: conn?.last_synced_at || null,
        pendingCount: pendingCount?.count || 0
      };

      res.json({
        success: true,
        data: statusData,
        ...statusData
      });
    } catch (err) {
      console.error('Status error:', err);
      res.status(500).json({ success: false, message: 'Server error retrieving sync status' });
    }
  });

  // 2. Google OAuth: Get Authorization URL with random nonce and expiration
  router.get('/google-auth-url', authenticateToken, (req, res) => {
    try {
      const config = getGoogleOAuthConfig();
      if (!config.isConfigured) {
        return res.status(400).json({
          success: false,
          message: 'Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.'
        });
      }

      // Encode userId with random nonce and timestamp (valid for 10 minutes)
      const nonce = crypto.randomBytes(16).toString('hex');
      const statePayload = JSON.stringify({ userId: req.user.id, nonce, timestamp: Date.now() });
      const signature = crypto.createHmac('sha256', jwtSecret).update(statePayload).digest('hex');
      const state = Buffer.from(JSON.stringify({ payload: statePayload, sig: signature })).toString('base64url');

      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: scopes,
        access_type: 'offline',
        prompt: 'consent',
        state
      }).toString();

      res.json({
        success: true,
        authUrl
      });
    } catch (err) {
      console.error('Auth URL error:', err);
      res.status(500).json({ success: false, message: 'Error generating Google authorization URL' });
    }
  });

  // 3. Google OAuth: Callback (Public endpoint called by Google)
  router.get('/google-callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #f8fafc;">
              <h2 style="color: #ef4444;">Authorization Cancelled</h2>
              <p>${error}</p>
              <button onclick="window.close()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">Close Window</button>
            </body>
          </html>
        `);
      }

      if (!code || !state) {
        return res.status(400).send('Missing code or state parameter');
      }

      // Verify HMAC state with timingSafeEqual and 10-minute validity
      let userId;
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        const expectedSig = crypto.createHmac('sha256', jwtSecret).update(decoded.payload).digest('hex');
        if (!timingSafeEqual(expectedSig, decoded.sig)) {
          return res.status(400).send('Invalid state signature');
        }
        const payload = JSON.parse(decoded.payload);
        if (Date.now() - payload.timestamp > 10 * 60 * 1000) {
          return res.status(400).send('State parameter has expired. Please initiate connection again.');
        }
        userId = payload.userId;
      } catch {
        return res.status(400).send('Malformed state parameter');
      }

      const config = getGoogleOAuthConfig();
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('[Google OAuth] Token exchange failed:', errText);
        return res.status(500).send('Failed to exchange authorization code for tokens: ' + errText);
      }

      const tokenData = await tokenRes.json();
      const refreshToken = tokenData.refresh_token;
      const accessToken = tokenData.access_token;
      const tokenExpiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

      // Fetch user's Google email
      let googleEmail = '';
      try {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userinfoRes.ok) {
          const uData = await userinfoRes.json();
          googleEmail = uData.email || '';
        }
      } catch (e) {
        console.warn('Could not fetch Google profile email:', e.message);
      }

      const now = new Date().toISOString();

      // Upsert into google_connections with AES-256-GCM encryption
      const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;
      const encryptedAccess = encrypt(accessToken);

      db.prepare(`
        INSERT INTO google_connections (user_id, email, refresh_token, access_token, token_expires_at, requires_reauth, connected_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          email = excluded.email,
          refresh_token = CASE WHEN excluded.refresh_token IS NOT NULL AND excluded.refresh_token != '' THEN excluded.refresh_token ELSE google_connections.refresh_token END,
          access_token = excluded.access_token,
          token_expires_at = excluded.token_expires_at,
          requires_reauth = 0,
          connected_at = excluded.connected_at
      `).run(userId, googleEmail, encryptedRefresh || '', encryptedAccess, tokenExpiresAt, now);

      // Render graceful callback page supporting both Web popup and Mobile deep link
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Dailyba - Google Connected</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body {
                background: #090d16;
                color: #f8fafc;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                text-align: center;
              }
              .card {
                background: #131b2e;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                padding: 32px 24px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
              }
              .badge {
                width: 56px;
                height: 56px;
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                font-size: 28px;
              }
              h2 { margin: 0 0 8px; font-size: 20px; }
              p { margin: 0 0 20px; color: #94a3b8; font-size: 14px; line-height: 1.5; }
              .btn {
                background: #2563eb;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                width: 100%;
                text-decoration: none;
                display: inline-block;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">✓</div>
              <h2>Google Account Connected</h2>
              <p>Your Gmail account (<strong>${googleEmail || 'Connected'}</strong>) has been securely linked to Dailyba.</p>
              <a class="btn" href="dailyba://app?emailSync=connected" onclick="finishAndClose(event)">Return to Dailyba</a>
            </div>
            <script>
              function finishAndClose(e) {
                if (window.opener) {
                  try {
                    window.opener.postMessage({ type: 'DAILYBA_GOOGLE_CONNECTED', email: '${googleEmail}' }, '*');
                  } catch (err) {}
                  window.close();
                } else {
                  // Mobile deep link fallback
                  window.location.href = 'dailyba://app?emailSync=connected';
                  setTimeout(() => { window.location.href = '/'; }, 1000);
                }
              }
              // Auto-trigger if opened as popup
              if (window.opener) {
                try {
                  window.opener.postMessage({ type: 'DAILYBA_GOOGLE_CONNECTED', email: '${googleEmail}' }, '*');
                  setTimeout(() => window.close(), 1800);
                } catch (e) {}
              }
            </script>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('Callback error:', err);
      res.status(500).send('Internal Server Error: ' + err.message);
    }
  });

  // 4. Disconnect Google Account
  router.post('/disconnect', authenticateToken, (req, res) => {
    try {
      db.prepare('DELETE FROM google_connections WHERE user_id = ?').run(req.user.id);
      res.json({
        success: true,
        message: 'Google account disconnected successfully'
      });
    } catch (err) {
      console.error('Disconnect error:', err);
      res.status(500).json({ success: false, message: 'Server error disconnecting account' });
    }
  });

  // Core Sync Engine: can be called by HTTP route /sync or by background interval
  async function syncUserGmail(userId, options = { autoRecordHighConfidence: true }) {
    const syncStartTime = new Date().toISOString();

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      const conn = db.prepare('SELECT requires_reauth FROM google_connections WHERE user_id = ?').get(userId);
      return {
        success: false,
        requiresReauth: Boolean(conn?.requires_reauth),
        message: conn?.requires_reauth
          ? 'Google authorization expired. Please reconnect your account.'
          : 'Google account not connected.'
      };
    }

    const conn = db.prepare('SELECT last_synced_at FROM google_connections WHERE user_id = ?').get(userId);
    let incrementalFilter = '';
    if (conn?.last_synced_at) {
      const lastEpoch = Math.floor(new Date(conn.last_synced_at).getTime() / 1000);
      const safeAfter = Math.max(0, lastEpoch - 300);
      incrementalFilter = ` after:${safeAfter}`;
    }

    const baseQuery = [
      '(from:(noreply@jago.com OR bankmandiri.co.id OR bca.co.id OR paypay.ne.jp OR gojek.com OR ovo.id OR shopee.co.id OR dana.id OR rakuten-card.co.jp OR vpass.ne.jp OR paypal.com)',
      'OR subject:("You have made a payment" OR "Pembayaran Berhasil" OR "お支払い完了" OR "Payment receipt" OR "Bukti Transfer"))'
    ].join(' ');

    const query = `${baseQuery}${incrementalFilter}`;
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?` + new URLSearchParams({
      q: query,
      maxResults: '25'
    }).toString();

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      if (errText.includes('invalid_grant')) {
        db.prepare('UPDATE google_connections SET requires_reauth = 1 WHERE user_id = ?').run(userId);
        return { success: false, requiresReauth: true, message: 'Google authorization expired.' };
      }
      return { success: false, message: 'Failed to query Gmail messages: ' + errText };
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    let importedCount = 0;
    let autoRecordedCount = 0;
    let pendingCount = 0;
    let duplicateCount = 0;

    const record = db.prepare('SELECT data_json, version FROM user_data WHERE user_id = ?').get(userId);
    let userState = record && record.data_json ? JSON.parse(record.data_json) : { transactions: [] };
    if (!Array.isArray(userState.transactions)) userState.transactions = [];
    let stateModified = false;

    function extractMimeParts(payload) {
      if (!payload) return '';
      let text = '';
      if (payload.body && payload.body.data) {
        try {
          const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf8');
          text += cleanMimeText(decoded) + '\\n';
        } catch {}
      }
      if (payload.parts && Array.isArray(payload.parts)) {
        for (const p of payload.parts) {
          text += extractMimeParts(p);
        }
      }
      return text;
    }

    for (const msg of messages) {
      const seen = db.prepare('SELECT 1 FROM imported_message_ids WHERE user_id = ? AND message_id = ?').get(userId, msg.id);
      if (seen) {
        duplicateCount++;
        continue;
      }

      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      const msgRes = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!msgRes.ok) continue;

      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];
      const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
      const authResults = headers.find(h => h.name.toLowerCase() === 'authentication-results')?.value || '';

      const isDkimFailed = authResults.includes('dkim=fail') || authResults.includes('spf=fail');
      const decodedBody = extractMimeParts(msgData.payload) || cleanMimeText(msgData.snippet || '');

      const parsed = await parseEmailReceipt({
        from: fromHeader,
        subject: subjectHeader,
        text: decodedBody,
        date: dateHeader,
        messageId: msg.id
      });

      const now = new Date().toISOString();

      if (parsed && parsed.amount > 0) {
        if (parsed.amount <= 0) {
          continue;
        }

        let finalConfidence = parsed.confidence;
        if (isDkimFailed) {
          finalConfidence = 0.2;
        }

        const insertId = 'imp_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
        const cleanSnippet = redactPII(parsed.rawSnippet || '').slice(0, 300);

        // Check for existing transaction to prevent duplicate auto-recording
        const isDuplicate = userState.transactions.some(
          t => t.amount === parsed.amount && t.date === parsed.occurredAt
        );

        const canAutoApprove = options.autoRecordHighConfidence && finalConfidence >= 0.85 && !isDuplicate;

        try {
          db.transaction(() => {
            db.prepare(`
              INSERT OR IGNORE INTO imported_message_ids (user_id, message_id, created_at)
              VALUES (?, ?, ?)
            `).run(userId, parsed.messageId, now);

            if (canAutoApprove) {
              const newTx = {
                id: 'tx_email_' + insertId + '_' + crypto.randomBytes(3).toString('hex'),
                type: 'expense',
                amount: parsed.amount,
                category: ALLOWED_CATEGORIES.has(parsed.category) ? parsed.category : 'others',
                source: ALLOWED_SOURCES.has(parsed.source) ? parsed.source : 'bank',
                currency: parsed.currency,
                date: parsed.occurredAt,
                note: `${parsed.provider.toUpperCase()}: ${parsed.merchant}`,
                isEmailImported: true,
                importPendingId: insertId
              };

              userState.transactions.unshift(newTx);
              stateModified = true;
              autoRecordedCount++;

              db.prepare(`
                INSERT OR IGNORE INTO pending_imports (
                  id, user_id, message_id, dedup_hash, source, provider,
                  merchant, amount, currency, category, occurred_at, occurred_time,
                  raw_snippet, confidence, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)
              `).run(
                insertId,
                userId,
                parsed.messageId,
                parsed.dedupHash,
                parsed.source,
                parsed.provider,
                parsed.merchant,
                parsed.amount,
                parsed.currency,
                parsed.category,
                parsed.occurredAt,
                parsed.occurredTime || null,
                cleanSnippet,
                finalConfidence,
                now
              );
            } else {
              db.prepare(`
                INSERT OR IGNORE INTO pending_imports (
                  id, user_id, message_id, dedup_hash, source, provider,
                  merchant, amount, currency, category, occurred_at, occurred_time,
                  raw_snippet, confidence, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
              `).run(
                insertId,
                userId,
                parsed.messageId,
                parsed.dedupHash,
                parsed.source,
                parsed.provider,
                parsed.merchant,
                parsed.amount,
                parsed.currency,
                parsed.category,
                parsed.occurredAt,
                parsed.occurredTime || null,
                cleanSnippet,
                finalConfidence,
                now
              );
              pendingCount++;
            }
          })();

          importedCount++;
        } catch (e) {
          console.warn('[Sync] Insert skipped or duplicate:', e.message);
        }
      }
    }

    if (stateModified) {
      const now = new Date().toISOString();
      const version = (record?.version || 0) + 1;
      db.prepare(`
        INSERT INTO user_data (user_id, data_json, version, synced_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          data_json = excluded.data_json,
          version = user_data.version + 1,
          synced_at = excluded.synced_at
      `).run(userId, JSON.stringify(userState), version, now);
    }

    db.prepare('UPDATE google_connections SET last_synced_at = ? WHERE user_id = ?').run(syncStartTime, userId);

    return {
      success: true,
      importedCount,
      autoRecordedCount,
      pendingCount,
      duplicateCount,
      lastSyncedAt: syncStartTime,
      message: autoRecordedCount > 0
        ? `Sync complete. ${autoRecordedCount} verified transactions auto-recorded to Recent Transactions.`
        : `Sync complete. ${importedCount} items imported.`
    };
  }

  // 5. Trigger Gmail Sync (HTTP endpoint)
  router.post('/sync', authenticateToken, async (req, res) => {
    try {
      const result = await syncUserGmail(req.user.id, { autoRecordHighConfidence: true });
      if (!result.success) {
        return res.status(result.requiresReauth ? 401 : 500).json(result);
      }
      res.json(result);
    } catch (err) {
      console.error('Sync error:', err);
      res.status(500).json({ success: false, message: 'Server error during sync: ' + err.message });
    }
  });

  // 6. Parse Raw Email Text / Instant Test Receipt
  router.post('/parse-raw', authenticateToken, async (req, res) => {
    try {
      const { text, subject, from, date, save } = req.body;
      if (!text && !subject) {
        return res.status(400).json({ success: false, message: 'Email text or subject is required' });
      }

      const syntheticMsgId = 'raw_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
      const cleanText = cleanMimeText(text || '');

      const parsed = await parseEmailReceipt({
        text: cleanText,
        subject: subject || '',
        from: from || '',
        date: date || new Date().toISOString(),
        messageId: syntheticMsgId
      });

      if (!parsed || parsed.amount <= 0) {
        return res.status(422).json({
          success: false,
          message: 'Could not detect a valid transaction amount or merchant from this text'
        });
      }

      // If save = true, stage it into pending_imports with PII redacted
      let stagedItem = null;
      if (save !== false) {
        const insertId = 'imp_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
        const now = new Date().toISOString();
        const cleanSnippet = redactPII(parsed.rawSnippet || '').slice(0, 300);

        db.transaction(() => {
          db.prepare(`
            INSERT OR IGNORE INTO imported_message_ids (user_id, message_id, created_at)
            VALUES (?, ?, ?)
          `).run(req.user.id, parsed.messageId, now);

          db.prepare(`
            INSERT INTO pending_imports (
              id, user_id, message_id, dedup_hash, source, provider,
              merchant, amount, currency, category, occurred_at, occurred_time,
              raw_snippet, confidence, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
          `).run(
            insertId,
            req.user.id,
            parsed.messageId,
            parsed.dedupHash,
            parsed.source,
            parsed.provider,
            parsed.merchant,
            parsed.amount,
            parsed.currency,
            parsed.category,
            parsed.occurredAt,
            parsed.occurredTime || null,
            cleanSnippet,
            parsed.confidence,
            now
          );
        })();

        stagedItem = db.prepare('SELECT * FROM pending_imports WHERE id = ?').get(insertId);
      }

      res.json({
        success: true,
        parsed,
        stagedItem
      });
    } catch (err) {
      console.error('Parse raw error:', err);
      res.status(500).json({ success: false, message: 'Server error parsing raw receipt' });
    }
  });

  // 7. Get Pending Imports List
  router.get('/pending', authenticateToken, (req, res) => {
    try {
      const items = db.prepare(`
        SELECT * FROM pending_imports
        WHERE user_id = ? AND status = 'pending'
        ORDER BY occurred_at DESC, created_at DESC
      `).all(req.user.id);

      res.json({
        success: true,
        items
      });
    } catch (err) {
      console.error('Get pending error:', err);
      res.status(500).json({ success: false, message: 'Server error fetching pending imports' });
    }
  });

  // 8. Atomic, Server-Authoritative Approve
  // In a single SQLite transaction:
  // - Validates category & source allowlists
  // - Updates pending_imports status to 'approved' (guaranteeing changes === 1)
  // - Automatically commits the new transaction into the user's finance state in user_data
  router.post('/approve', authenticateToken, (req, res) => {
    try {
      const { id, all, updates } = req.body;

      if (all) {
        // Safe Approve All: Only approve items with confidence >= 0.8
        const itemsToApprove = db.prepare(`
          SELECT * FROM pending_imports
          WHERE user_id = ? AND status = 'pending' AND confidence >= 0.8
        `).all(req.user.id);

        if (itemsToApprove.length === 0) {
          return res.json({
            success: true,
            approvedItems: [],
            newTransactions: [],
            message: 'No pending items eligible for batch approval (confidence >= 0.8)'
          });
        }

        const newTransactions = [];
        let updatedState = null;

        db.transaction(() => {
          // 1. Fetch user finance state
          const record = db.prepare('SELECT data_json, version FROM user_data WHERE user_id = ?').get(req.user.id);
          let state = record && record.data_json ? JSON.parse(record.data_json) : { transactions: [] };
          if (!Array.isArray(state.transactions)) state.transactions = [];

          // 2. Process each item into finance state
          for (const item of itemsToApprove) {
            const finalCategory = ALLOWED_CATEGORIES.has(item.category) ? item.category : 'others';
            const finalSource = ALLOWED_SOURCES.has(item.source) ? item.source : 'bank';

            const newTx = {
              id: 'tx_email_' + item.id + '_' + crypto.randomBytes(3).toString('hex'),
              type: 'expense',
              amount: item.amount,
              category: finalCategory,
              source: finalSource,
              currency: item.currency,
              date: item.occurred_at,
              note: `${item.provider.toUpperCase()}: ${item.merchant}`,
              isEmailImported: true,
              importPendingId: item.id
            };

            state.transactions.unshift(newTx);
            newTransactions.push(newTx);

            db.prepare(`
              UPDATE pending_imports
              SET status = 'approved', raw_snippet = NULL
              WHERE id = ? AND user_id = ?
            `).run(item.id, req.user.id);
          }

          // 3. Save state in user_data
          const now = new Date().toISOString();
          const version = (record?.version || 0) + 1;
          db.prepare(`
            INSERT INTO user_data (user_id, data_json, version, synced_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              data_json = excluded.data_json,
              version = user_data.version + 1,
              synced_at = excluded.synced_at
          `).run(req.user.id, JSON.stringify(state), version, now);

          updatedState = state;
        })();

        const remainingPending = db.prepare(`
          SELECT COUNT(*) as count FROM pending_imports
          WHERE user_id = ? AND status = 'pending'
        `).get(req.user.id);

        return res.json({
          success: true,
          approvedItems: itemsToApprove,
          newTransactions,
          updatedState,
          remainingPendingCount: remainingPending?.count || 0,
          message: `Approved ${itemsToApprove.length} transactions. ${remainingPending?.count || 0} low-confidence items kept for manual review.`
        });
      }

      if (!id) {
        return res.status(400).json({ success: false, message: 'Transaction ID is required' });
      }

      // Strict validation of client updates
      if (updates) {
        if (updates.amount !== undefined) {
          const amt = Number(updates.amount);
          if (!Number.isFinite(amt) || amt <= 0 || amt > 100000000000) {
            return res.status(400).json({ success: false, message: 'Invalid amount: must be a positive finite number' });
          }
        }
        if (updates.currency !== undefined && !ALLOWED_CURRENCIES.has(updates.currency)) {
          return res.status(400).json({ success: false, message: 'Invalid currency. Supported: IDR, JPY, USD, MMK' });
        }
        if (updates.category !== undefined && !ALLOWED_CATEGORIES.has(updates.category)) {
          return res.status(400).json({ success: false, message: 'Invalid expense category' });
        }
        if (updates.source !== undefined && !ALLOWED_SOURCES.has(updates.source)) {
          return res.status(400).json({ success: false, message: 'Invalid funding source' });
        }
        if (updates.merchant !== undefined) {
          const m = String(updates.merchant).trim();
          if (!m || m.length > 100) {
            return res.status(400).json({ success: false, message: 'Merchant must be between 1 and 100 characters' });
          }
        }
        if (updates.occurred_at !== undefined) {
          const d = String(updates.occurred_at).trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            return res.status(400).json({ success: false, message: 'Invalid date format. Expected YYYY-MM-DD' });
          }
        }
      }

      // Single item approval with category/source validation
      let updatedItem = null;
      let newTransaction = null;
      let updatedState = null;

      const approveTxn = db.transaction(() => {
        const item = db.prepare("SELECT * FROM pending_imports WHERE id = ? AND user_id = ? AND status = 'pending'").get(id, req.user.id);
        if (!item) return false;

        const targetCategory = updates?.category || item.category;
        const targetSource = updates?.source || item.source;

        const finalCategory = ALLOWED_CATEGORIES.has(targetCategory) ? targetCategory : 'others';
        const finalSource = ALLOWED_SOURCES.has(targetSource) ? targetSource : 'bank';
        const finalMerchant = updates?.merchant || item.merchant;
        const finalAmount = updates?.amount !== undefined ? Number(updates.amount) : item.amount;
        const finalCurrency = updates?.currency || item.currency;
        const finalDate = updates?.occurred_at || item.occurred_at;

        // 1. Update pending_imports
        const info = db.prepare(`
          UPDATE pending_imports
          SET merchant = ?, amount = ?, category = ?, source = ?, currency = ?, occurred_at = ?, status = 'approved', raw_snippet = NULL
          WHERE id = ? AND user_id = ? AND status = 'pending'
        `).run(finalMerchant, finalAmount, finalCategory, finalSource, finalCurrency, finalDate, id, req.user.id);

        if (info.changes === 0) return false;

        // 2. Fetch and append to user_data.transactions
        const record = db.prepare('SELECT data_json, version FROM user_data WHERE user_id = ?').get(req.user.id);
        let state = record && record.data_json ? JSON.parse(record.data_json) : { transactions: [] };
        if (!Array.isArray(state.transactions)) state.transactions = [];

        const finalNote = updates?.note
          ? String(updates.note).trim().slice(0, 200)
          : (updates?.merchant
              ? String(updates.merchant).trim().slice(0, 100)
              : `${item.provider.toUpperCase()}: ${finalMerchant}`);

        newTransaction = {
          id: 'tx_email_' + item.id + '_' + crypto.randomBytes(3).toString('hex'),
          type: 'expense',
          amount: finalAmount,
          category: finalCategory,
          source: finalSource,
          currency: finalCurrency,
          date: finalDate,
          note: finalNote,
          isEmailImported: true,
          importPendingId: item.id
        };

        state.transactions.unshift(newTransaction);

        // 3. Save user_data
        const now = new Date().toISOString();
        const version = (record?.version || 0) + 1;
        db.prepare(`
          INSERT INTO user_data (user_id, data_json, version, synced_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            data_json = excluded.data_json,
            version = user_data.version + 1,
            synced_at = excluded.synced_at
        `).run(req.user.id, JSON.stringify(state), version, now);

        updatedItem = db.prepare('SELECT * FROM pending_imports WHERE id = ?').get(id);
        updatedState = state;
        return true;
      });

      const success = approveTxn();

      if (!success) {
        return res.status(409).json({
          success: false,
          message: 'Transaction is already processed or does not exist'
        });
      }

      res.json({
        success: true,
        approvedItem: updatedItem,
        newTransaction,
        updatedState,
        message: 'Transaction approved and recorded into your balance ledger'
      });
    } catch (err) {
      console.error('Approve error:', err);
      res.status(500).json({ success: false, message: 'Server error approving import' });
    }
  });

  // 9. Reject / Dismiss Import(s)
  router.post('/reject', authenticateToken, (req, res) => {
    try {
      const { id, all } = req.body;

      if (all) {
        db.prepare(`
          UPDATE pending_imports
          SET status = 'rejected', raw_snippet = NULL
          WHERE user_id = ? AND status = 'pending'
        `).run(req.user.id);

        return res.json({
          success: true,
          message: 'All pending items dismissed'
        });
      }

      if (!id) {
        return res.status(400).json({ success: false, message: 'Transaction ID is required' });
      }

      const updateInfo = db.prepare(`
        UPDATE pending_imports
        SET status = 'rejected', raw_snippet = NULL
        WHERE id = ? AND user_id = ? AND status = 'pending'
      `).run(id, req.user.id);

      if (updateInfo.changes === 0) {
        return res.status(409).json({
          success: false,
          message: 'Transaction is already processed or does not exist'
        });
      }

      res.json({
        success: true,
        message: 'Transaction dismissed'
      });
    } catch (err) {
      console.error('Reject error:', err);
      res.status(500).json({ success: false, message: 'Server error dismissing import' });
    }
  });

  // 10. Delete / Clear Processed History (Tombstones remain in imported_message_ids)
  router.delete('/clear', authenticateToken, (req, res) => {
    try {
      db.prepare(`
        DELETE FROM pending_imports
        WHERE user_id = ? AND status IN ('approved', 'rejected')
      `).run(req.user.id);

      res.json({
        success: true,
        message: 'Processed import history cleared from staging view'
      });
    } catch (err) {
      console.error('Clear error:', err);
      res.status(500).json({ success: false, message: 'Server error clearing imports' });
    }
  });

  router.syncUserGmail = syncUserGmail;
  return router;
}

module.exports = createEmailSyncRouter;
