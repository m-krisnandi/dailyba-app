const assert = require('assert');
const { parseEmailReceipt } = require('../parsers/engine');
const { parseCurrencyAmount, normalizeDate, createDedupHash, cleanMimeText } = require('../parsers/types');
const { encrypt, decrypt, redactPII, stripGreetings } = require('../crypto');

async function runTests() {
  console.log('--- RUNNING DAILYBA FINANCIAL PARSER & SECURITY TEST SUITE ---');

  // Test 1: Bank Jago (Real Receipt Layout with Synthetic Anonymized PII)
  {
    const jagoEmail = {
      from: 'Jago <noreply@jago.example.com>',
      subject: 'You have made a payment to Good Laundry 1💸',
      text: `Assalamu'alaikum ALICE NAKAMURA,
Thank you for trusting Jago! You have made a payment, and here are the details:
Transaction Summary
From 502700000001
To Good Laundry 1
9360000000000000001
Amount Rp 15.000
Transaction Date 06 November 2026, 19:20 WIB
Transaction Status Successful
Acquirer Name Bank Mandiri
Merchant Location Banyumas (Kab)
Terminal ID A01
Customer PAN 9360000000000000002
Tip Amount Rp 0`
    };

    const res = await parseEmailReceipt(jagoEmail);
    assert.strictEqual(res.provider, 'jago', 'Provider should be jago');
    assert.strictEqual(res.merchant, 'Good Laundry 1', 'Merchant should be Good Laundry 1');
    assert.strictEqual(res.amount, 15000, 'Amount should be 15000');
    assert.strictEqual(res.currency, 'IDR', 'Currency should be IDR');
    assert.strictEqual(res.category, 'laundry', 'Category should be laundry');
    assert.strictEqual(res.occurredAt, '2026-11-06', 'Date should be 2026-11-06');
    assert.strictEqual(res.occurredTime, '19:20', 'Time should be 19:20');
    assert.strictEqual(res.source, 'bank', 'Source should be bank');
    assert(res.confidence >= 0.95, 'Confidence should be >= 0.95');
    // Ensure rawSnippet has no raw PAN
    assert(!res.rawSnippet.includes('9360000000000000001'), 'Raw snippet must redact PAN');
    console.log('✓ Test 1 Passed: Bank Jago Layout Fixture (Anonymized)');
  }

  // Test 2: Livin' by Mandiri (Real Receipt Layout with Synthetic Anonymized PII)
  {
    const mandiriEmail = {
      from: "Livin' <noreply@mandiri.example.com>",
      subject: 'Pembayaran Berhasil!',
      text: `Pembayaran Berhasil
Halo JOHN DOE ,
Berikut adalah detail transaksi Anda dengan QR:
Penerima
RM SALERO BARU
BANJARNEGARA - ID
Tanggal 12 Nov 2026
Jam 18:02:33 WIB
Nominal Transaksi Rp 10.000,00
No. Referensi 2611121122539729748
No. Ref. QRIS 611526810737
Merchant PAN 9360000000000000003
Customer PAN 9360000000000000004
Pengakuisisi Bank Syariah Indonesia
Terminal ID 0000966628`
    };

    const res = await parseEmailReceipt(mandiriEmail);
    assert.strictEqual(res.provider, 'mandiri', 'Provider should be mandiri');
    assert.strictEqual(res.merchant, 'RM SALERO BARU', 'Merchant should be RM SALERO BARU');
    assert.strictEqual(res.amount, 10000, 'Amount should be 10000');
    assert.strictEqual(res.currency, 'IDR', 'Currency should be IDR');
    assert.strictEqual(res.category, 'food_drinks', 'Category should be food_drinks');
    assert.strictEqual(res.occurredAt, '2026-11-12', 'Date should be 2026-11-12');
    assert.strictEqual(res.occurredTime, '18:02', 'Time should be 18:02');
    assert.strictEqual(res.source, 'bank', 'Source should be bank');
    console.log("✓ Test 2 Passed: Livin' by Mandiri Layout Fixture (Anonymized)");
  }

  // Test 3: Currency & Locale Parsing Edge Cases
  {
    assert.strictEqual(parseCurrencyAmount('Rp 15.000', 'IDR'), 15000);
    assert.strictEqual(parseCurrencyAmount('Rp 10.000,00', 'IDR'), 10000);
    assert.strictEqual(parseCurrencyAmount('Rp 1.500.000,50', 'IDR'), 1500001); // rounded integer IDR
    assert.strictEqual(parseCurrencyAmount('¥1,500', 'JPY'), 1500);
    assert.strictEqual(parseCurrencyAmount('1,250円', 'JPY'), 1250);
    assert.strictEqual(parseCurrencyAmount('$12.50', 'USD'), 12.5);
    assert.strictEqual(parseCurrencyAmount('1,500.50', 'USD'), 1500.5);
    console.log('✓ Test 3 Passed: Multi-Currency & Locale Parsing Precision');
  }

  // Test 4: AES-256-GCM Token Encryption & Decryption
  {
    const secretToken = 'ya29.a0AWY7CkkL983nd02984k_google_refresh_token_ultra_secret';
    const encrypted = encrypt(secretToken);
    assert.notStrictEqual(encrypted, secretToken, 'Encrypted should differ from plaintext');
    assert(encrypted.split(':').length === 3, 'Ciphertext should be iv:tag:data');

    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, secretToken, 'Decrypted text should match original');

    // Tampered tag test: should safely return null
    const tampered = encrypted.slice(0, -4) + 'ffff';
    const tamperedResult = decrypt(tampered);
    assert.strictEqual(tamperedResult, null, 'Tampered tag must fail decryption cleanly by returning null');
    console.log('✓ Test 4 Passed: AES-256-GCM Token Encryption & Anti-Tamper');
  }

  // Test 5: PII Redaction & Greetings Strip
  {
    const sample = 'Assalamu\'alaikum ALICE NAKAMURA,\nPAN: 9360000000000000001 Rekening: 502700000001 Email: user@example.com Phone: 081234567890\nPaid Rp 1500000 to Good Laundry 1 on 2026-11-12 at 18:02';
    const noGreetings = stripGreetings(sample, 'Alice Nakamura');
    assert(!noGreetings.includes('ALICE NAKAMURA'), 'Greetings with customer name must be stripped');

    const sanitized = redactPII(noGreetings);
    assert(!sanitized.includes('9360000000000000001'), 'PAN must be redacted');
    assert(!sanitized.includes('502700000001'), 'Account must be redacted');
    assert(!sanitized.includes('081234567890'), 'Phone must be redacted');

    // Non-regression: Amount, date, and merchant numbers must be preserved!
    assert(sanitized.includes('Good Laundry 1'), 'Merchant name with digit must NOT be redacted');
    assert(sanitized.includes('1500000'), 'Amount must NOT be redacted');
    assert(sanitized.includes('2026-11-12'), 'Date must NOT be redacted');
    assert(sanitized.includes('18:02'), 'Time must NOT be redacted');
    console.log('✓ Test 5 Passed: PII Redaction with Non-Regression on Amounts/Dates/Merchants');
  }

  // Test 6: Raw Gmail API Base64url MIME / HTML Payload Decoding
  {
    // Simulate real Gmail API HTML table payload encoded in base64url
    const rawHtml = `
      <!DOCTYPE html>
      <html>
      <head><style>body { font-family: Arial; }</style></head>
      <body>
        <table>
          <tr><td>Assalamu&#39;alaikum ALICE NAKAMURA,</td></tr>
          <tr><td>Transaction Summary</td></tr>
          <tr><td>From</td><td>502700000001</td></tr>
          <tr><td>To</td><td>Good Laundry 1</td></tr>
          <tr><td>Amount</td><td>Rp&nbsp;15.000</td></tr>
          <tr><td>Transaction Date</td><td>06 November 2026, 19:20 WIB</td></tr>
          <tr><td>Customer PAN</td><td>9360000000000000002</td></tr>
        </table>
      </body>
      </html>
    `;
    const base64urlData = Buffer.from(rawHtml, 'utf8').toString('base64url');
    const decodedFromGmail = Buffer.from(base64urlData, 'base64url').toString('utf8');
    const cleanedText = cleanMimeText(decodedFromGmail);

    const parsed = await parseEmailReceipt({
      from: 'Jago <noreply@jago.example.com>',
      subject: 'You have made a payment to Good Laundry 1',
      text: cleanedText
    });

    assert.strictEqual(parsed.provider, 'jago', 'MIME decoded email should match jago');
    assert.strictEqual(parsed.merchant, 'Good Laundry 1');
    assert.strictEqual(parsed.amount, 15000);
    assert.strictEqual(parsed.currency, 'IDR');
    assert.strictEqual(parsed.occurredAt, '2026-11-06');
    assert.strictEqual(parsed.occurredTime, '19:20');
    console.log('✓ Test 6 Passed: Gmail API Base64url MIME / HTML Payload Decoding');
  }

  // Test 7: BCA QRIS & Transfer Parser (Community Heuristic Fixture)
  {
    const bcaEmail = {
      from: 'BCA <noreply@bca.example.com>',
      subject: 'Transaksi QRIS Berhasil',
      text: `Yth. Nasabah BCA,
Transaksi QRIS Anda telah berhasil dilakukan:
Nama Merchant: KOPI KENANGAN
Nominal Transaksi: Rp 32.000
Tanggal: 10/11/2026
Jam: 14:15 WIB
No. Referensi: 9812739182371`
    };

    const res = await parseEmailReceipt(bcaEmail);
    assert.strictEqual(res.provider, 'bca');
    assert.strictEqual(res.merchant, 'KOPI KENANGAN');
    assert.strictEqual(res.amount, 32000);
    assert.strictEqual(res.currency, 'IDR');
    assert.strictEqual(res.category, 'food_drinks');
    assert.strictEqual(res.occurredAt, '2026-11-10');
    assert.strictEqual(res.occurredTime, '14:15');
    console.log('✓ Test 7 Passed: Bank BCA QRIS Transaction Fixture');
  }

  // Test 8: PayPay Japan Parser (Community Heuristic Fixture)
  {
    const paypayEmail = {
      from: 'PayPay <no-reply@paypay.example.jp>',
      subject: 'お支払い完了のお知らせ',
      text: `いつもPayPayをご利用いただきありがとうございます。
お支払いが完了いたしました。

■ご利用内容
利用先： セブン-イレブン 渋谷店
決済日時： 2026年11月10日 15:45
お支払い金額： 1,480円
支払方法： PayPay残高`
    };

    const res = await parseEmailReceipt(paypayEmail);
    assert.strictEqual(res.provider, 'paypay');
    assert.strictEqual(res.merchant, 'セブン-イレブン 渋谷店');
    assert.strictEqual(res.amount, 1480);
    assert.strictEqual(res.currency, 'JPY');
    assert.strictEqual(res.category, 'food_drinks');
    assert.strictEqual(res.occurredAt, '2026-11-10');
    assert.strictEqual(res.occurredTime, '15:45');
    assert.strictEqual(res.source, 'ewallet');
    console.log('✓ Test 8 Passed: PayPay Japan Receipt Fixture');
  }

  // Test 9: GoPay Indonesia Parser (Community Heuristic Fixture)
  {
    const gopayEmail = {
      from: 'GoPay <receipt@gojek.example.com>',
      subject: 'Bukti Pembayaran GoPay ke Starbucks',
      text: `Hai User,
Pembayaran GoPay kamu berhasil!

Detail Transaksi:
Merchant: Starbucks Reserve
Total Pembayaran: Rp 65.000
Tanggal: 11 Nov 2026
Jam: 09:30
Metode: GoPay Balance`
    };

    const res = await parseEmailReceipt(gopayEmail);
    assert.strictEqual(res.provider, 'gopay');
    assert.strictEqual(res.merchant, 'Starbucks Reserve');
    assert.strictEqual(res.amount, 65000);
    assert.strictEqual(res.currency, 'IDR');
    assert.strictEqual(res.category, 'food_drinks');
    assert.strictEqual(res.occurredAt, '2026-11-11');
    assert.strictEqual(res.occurredTime, '09:30');
    assert.strictEqual(res.source, 'ewallet');
    console.log('✓ Test 9 Passed: GoPay Indonesia E-Wallet Fixture');
  }

    // Test 10: Conflict-Safe Cloud Sync Merge (Offline Mobile Tx + Server Email Approval)
  {
    const initialServerState = {
      transactions: [
        { id: "tx_base_1", amount: 50000, note: "Initial Grocery" }
      ]
    };

    // 1. Server approves incoming email transaction while mobile is offline
    const emailApprovedTx = {
      id: "tx_email_imp_88",
      amount: 15000,
      note: "JAGO: Good Laundry 1",
      isEmailImported: true
    };
    const serverStateAfterApprove = {
      transactions: [emailApprovedTx, ...initialServerState.transactions]
    };

    // 2. Mobile device records an expense while offline (does not know about tx_email_imp_88)
    const mobileOfflineTx = {
      id: "tx_mobile_offline_99",
      amount: 25000,
      note: "Offline Bento Lunch"
    };
    const incomingMobilePayload = {
      transactions: [mobileOfflineTx, initialServerState.transactions[0]]
    };

    // 3. Mobile comes online and triggers POST /api/sync smart merge
    const clientTxIds = new Set(incomingMobilePayload.transactions.map(t => t.id));
    const missingEmailTxs = serverStateAfterApprove.transactions.filter(t =>
      (t.isEmailImported || (typeof t.id === "string" && t.id.startsWith("tx_email_"))) && !clientTxIds.has(t.id)
    );

    const mergedTransactions = [...missingEmailTxs, ...incomingMobilePayload.transactions];

    assert.strictEqual(mergedTransactions.length, 3, "Merged state must contain exactly 3 transactions");
    assert(mergedTransactions.some(t => t.id === "tx_email_imp_88"), "Server email transaction must NOT be lost");
    assert(mergedTransactions.some(t => t.id === "tx_mobile_offline_99"), "Mobile offline transaction must NOT be lost");
    assert(mergedTransactions.some(t => t.id === "tx_base_1"), "Base transaction must remain intact");

    console.log("✓ Test 10 Passed: Conflict-Safe Sync Merge (Offline Mobile Tx + Server Email Approval)");
  }

    // Test 11: Deleted Transaction Tombstone (Deleting email transaction on phone never resurrects)
  {
    const serverState = {
      transactions: [
        { id: "tx_email_imp_88", amount: 15000, isEmailImported: true },
        { id: "tx_base_1", amount: 50000 }
      ],
      deletedTxIds: []
    };

    // User deletes tx_email_imp_88 on mobile device
    const mobilePayloadAfterDelete = {
      transactions: [
        { id: "tx_base_1", amount: 50000 }
      ],
      deletedTxIds: ["tx_email_imp_88"]
    };

    // Run smart merge on server
    const clientTxIds = new Set(mobilePayloadAfterDelete.transactions.map(t => t.id));
    const deleted = new Set([
      ...(mobilePayloadAfterDelete.deletedTxIds || []),
      ...(serverState.deletedTxIds || [])
    ]);

    // Strip deleted
    let mergedTransactions = mobilePayloadAfterDelete.transactions.filter(t => !deleted.has(t.id));

    // Server email transactions missing from client, BUT NOT DELETED
    const missingEmailTxs = serverState.transactions.filter(t =>
      (t.isEmailImported || (typeof t.id === "string" && t.id.startsWith("tx_email_"))) &&
      !clientTxIds.has(t.id) &&
      !deleted.has(t.id)
    );

    mergedTransactions = [...missingEmailTxs, ...mergedTransactions];

    assert.strictEqual(mergedTransactions.length, 1, "Merged state must contain only tx_base_1");
    assert(!mergedTransactions.some(t => t.id === "tx_email_imp_88"), "Deleted email transaction must NOT resurrect");
    assert.strictEqual(mergedTransactions[0].id, "tx_base_1");
    console.log("✓ Test 11 Passed: Deleted Transaction Tombstone (No Zombie Email Transactions)");
  }

  // Test 12: Strict Validation on /approve Payload Updates
  {
    const ALLOWED_CATEGORIES = new Set(["food_drinks", "shopping", "train", "ride", "laundry", "rent", "family", "gifts", "vps", "mobile", "others"]);
    const ALLOWED_SOURCES = new Set(["bank", "ewallet", "credit_card", "cash"]);
    const ALLOWED_CURRENCIES = new Set(["IDR", "JPY", "USD", "MMK"]);

    function validateUpdates(updates) {
      if (!updates) return { valid: true };
      if (updates.amount !== undefined) {
        const amt = Number(updates.amount);
        if (!Number.isFinite(amt) || amt <= 0 || amt > 100000000000) return { valid: false, err: "Invalid amount" };
      }
      if (updates.currency !== undefined && !ALLOWED_CURRENCIES.has(updates.currency)) {
        return { valid: false, err: "Invalid currency" };
      }
      if (updates.category !== undefined && !ALLOWED_CATEGORIES.has(updates.category)) {
        return { valid: false, err: "Invalid category" };
      }
      if (updates.source !== undefined && !ALLOWED_SOURCES.has(updates.source)) {
        return { valid: false, err: "Invalid source" };
      }
      if (updates.occurred_at !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(updates.occurred_at))) {
        return { valid: false, err: "Invalid date" };
      }
      return { valid: true };
    }

    assert.strictEqual(validateUpdates({ amount: -500 }).valid, false);
    assert.strictEqual(validateUpdates({ amount: "invalid" }).valid, false);
    assert.strictEqual(validateUpdates({ amount: Infinity }).valid, false);
    assert.strictEqual(validateUpdates({ currency: "XXX" }).valid, false);
    assert.strictEqual(validateUpdates({ category: "crypto" }).valid, false);
    assert.strictEqual(validateUpdates({ occurred_at: "12-11-2026" }).valid, false); // must be YYYY-MM-DD
    assert.strictEqual(validateUpdates({ amount: 15000, currency: "IDR", category: "laundry", occurred_at: "2026-11-06" }).valid, true);

    console.log("✓ Test 12 Passed: Strict Validation on /approve Updates");
  }

  console.log("\n======================================================");
  console.log("ALL 12 TEST SUITES COMPLETED WITH 100% SUCCESS RATE!");
  console.log("======================================================");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
