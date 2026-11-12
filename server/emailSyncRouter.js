const express = require('express');
const crypto = require('crypto');
const { parseEmailReceipt } = require('./parsers/engine');
const { encrypt, decrypt, redactPII } = require('./crypto');

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

    CREATE INDEX IF NOT EXISTS idx_pending_user_status ON pending_imports (user_id, status);
    CREATE INDEX IF NOT EXISTS idx_pending_hash ON pending_imports (user_id, dedup_hash);
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

    // Return existing token if valid for at least 2 more minutes
    if (rawAccessToken && conn.token_expires_at && conn.token_expires_at > now + 120000 && !conn.requires_reauth) {
      return rawAccessToken;
    }

    const { clientId, clientSecret } = getGoogleOAuthConfig();
    if (!clientId || !clientSecret || !rawRefreshToken) return null;

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

      res.json({
        success: true,
        googleConfigured: config.isConfigured,
        isConnected: Boolean(conn && !conn.requires_reauth),
        requiresReauth: Boolean(conn?.requires_reauth),
        connectedEmail: conn?.email || null,
        connectedAt: conn?.connected_at || null,
        lastSyncedAt: conn?.last_synced_at || null,
        pendingCount: pendingCount?.count || 0
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

      // Verify HMAC state and 10-minute validity
      let userId;
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        const expectedSig = crypto.createHmac('sha256', jwtSecret).update(decoded.payload).digest('hex');
        if (expectedSig !== decoded.sig) {
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
                  // Mobile or standalone tab
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

  // 5. Trigger Gmail Sync (with incremental sync & PII redaction)
  router.post('/sync', authenticateToken, async (req, res) => {
    try {
      const accessToken = await getValidAccessToken(req.user.id);
      if (!accessToken) {
        const conn = db.prepare('SELECT requires_reauth FROM google_connections WHERE user_id = ?').get(req.user.id);
        const isReauth = Boolean(conn?.requires_reauth);
        return res.status(400).json({
          success: false,
          requiresReauth: isReauth,
          message: isReauth
            ? 'Your Google authorization has expired (e.g. 7-day test token limit). Please reconnect your Google account.'
            : 'Google account is not connected or token expired. Please connect your Google account.'
        });
      }

      // Check last synced timestamp for incremental sync (saves quota and time)
      const conn = db.prepare('SELECT last_synced_at FROM google_connections WHERE user_id = ?').get(req.user.id);
      let incrementalFilter = '';
      if (conn?.last_synced_at) {
        const lastEpoch = Math.floor(new Date(conn.last_synced_at).getTime() / 1000);
        // Overlap buffer of 5 minutes (300 seconds)
        const safeAfter = Math.max(0, lastEpoch - 300);
        incrementalFilter = ` after:${safeAfter}`;
      }

      // Search Gmail for bank and payment notification emails
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
          db.prepare('UPDATE google_connections SET requires_reauth = 1 WHERE user_id = ?').run(req.user.id);
          return res.status(401).json({
            success: false,
            requiresReauth: true,
            message: 'Google authorization expired. Please reconnect your account.'
          });
        }
        return res.status(502).json({
          success: false,
          message: 'Failed to query Gmail messages: ' + errText
        });
      }

      const listData = await listRes.json();
      const messages = listData.messages || [];

      let importedCount = 0;
      let duplicateCount = 0;

      for (const msg of messages) {
        // Check if messageId already exists in pending_imports
        const existing = db.prepare('SELECT id FROM pending_imports WHERE user_id = ? AND message_id = ?').get(req.user.id, msg.id);
        if (existing) {
          duplicateCount++;
          continue;
        }

        // Fetch message detail
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

        // Recursively extract text parts
        function extractParts(payload) {
          if (!payload) return '';
          let text = '';
          if (payload.body && payload.body.data) {
            try {
              text += Buffer.from(payload.body.data, 'base64url').toString('utf8') + ' ';
            } catch {}
          }
          if (payload.parts && Array.isArray(payload.parts)) {
            for (const p of payload.parts) {
              text += extractParts(p);
            }
          }
          return text;
        }

        const fullExtractedText = extractParts(msgData.payload) || msgData.snippet || '';

        const parsed = await parseEmailReceipt({
          from: fromHeader,
          subject: subjectHeader,
          text: fullExtractedText,
          date: dateHeader,
          messageId: msg.id
        });

        if (parsed && parsed.amount > 0) {
          const insertId = 'imp_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
          const now = new Date().toISOString();
          const cleanSnippet = redactPII(parsed.rawSnippet || '').slice(0, 300);

          try {
            db.prepare(`
              INSERT OR IGNORE INTO pending_imports (
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
            importedCount++;
          } catch (e) {
            console.warn('[Sync] Insert skipped or duplicate:', e.message);
          }
        }
      }

      // Update last synced timestamp
      const nowIso = new Date().toISOString();
      db.prepare('UPDATE google_connections SET last_synced_at = ? WHERE user_id = ?').run(nowIso, req.user.id);

      res.json({
        success: true,
        importedCount,
        duplicateCount,
        lastSyncedAt: nowIso,
        message: `Sync complete. ${importedCount} new transactions imported to pending review.`
      });
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
      const parsed = await parseEmailReceipt({
        text: text || '',
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

  // 8. Atomic & Safe Approve Import(s)
  router.post('/approve', authenticateToken, (req, res) => {
    try {
      const { id, all, updates } = req.body;

      if (all) {
        // Safe Approve All: Only approve items with confidence >= 0.8
        // Low confidence items are kept for manual individual review!
        const approvedItems = db.prepare(`
          SELECT * FROM pending_imports
          WHERE user_id = ? AND status = 'pending' AND confidence >= 0.8
        `).all(req.user.id);

        if (approvedItems.length > 0) {
          const ids = approvedItems.map(i => i.id);
          const placeholders = ids.map(() => '?').join(',');

          db.prepare(`
            UPDATE pending_imports
            SET status = 'approved', raw_snippet = NULL
            WHERE user_id = ? AND id IN (${placeholders})
          `).run(req.user.id, ...ids);
        }

        const remainingPending = db.prepare(`
          SELECT COUNT(*) as count FROM pending_imports
          WHERE user_id = ? AND status = 'pending'
        `).get(req.user.id);

        return res.json({
          success: true,
          approvedItems,
          remainingPendingCount: remainingPending?.count || 0,
          message: `Approved ${approvedItems.length} transactions. ${remainingPending?.count || 0} low-confidence items kept for manual review.`
        });
      }

      if (!id) {
        return res.status(400).json({ success: false, message: 'Transaction ID is required' });
      }

      // Atomic single approve: check changes === 1 to prevent double-clicks
      let updateInfo;
      if (updates) {
        updateInfo = db.prepare(`
          UPDATE pending_imports
          SET merchant = COALESCE(?, merchant),
              amount = COALESCE(?, amount),
              category = COALESCE(?, category),
              source = COALESCE(?, source),
              currency = COALESCE(?, currency),
              occurred_at = COALESCE(?, occurred_at),
              status = 'approved',
              raw_snippet = NULL
          WHERE id = ? AND user_id = ? AND status = 'pending'
        `).run(
          updates.merchant || null,
          updates.amount || null,
          updates.category || null,
          updates.source || null,
          updates.currency || null,
          updates.occurred_at || null,
          id,
          req.user.id
        );
      } else {
        updateInfo = db.prepare(`
          UPDATE pending_imports
          SET status = 'approved', raw_snippet = NULL
          WHERE id = ? AND user_id = ? AND status = 'pending'
        `).run(id, req.user.id);
      }

      if (updateInfo.changes === 0) {
        return res.status(409).json({
          success: false,
          message: 'Transaction is already processed or does not exist'
        });
      }

      const updatedItem = db.prepare('SELECT * FROM pending_imports WHERE id = ?').get(id);

      res.json({
        success: true,
        approvedItem: updatedItem,
        message: 'Transaction approved successfully'
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

  // 10. Delete / Clear Processed History
  router.delete('/clear', authenticateToken, (req, res) => {
    try {
      db.prepare(`
        DELETE FROM pending_imports
        WHERE user_id = ? AND status IN ('approved', 'rejected')
      `).run(req.user.id);

      res.json({
        success: true,
        message: 'Processed import history cleared'
      });
    } catch (err) {
      console.error('Clear error:', err);
      res.status(500).json({ success: false, message: 'Server error clearing imports' });
    }
  });

  return router;
}

module.exports = createEmailSyncRouter;
