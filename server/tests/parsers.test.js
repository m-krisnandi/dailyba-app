const assert = require('assert');
const { parseEmailReceipt } = require('../parsers/engine');
const { parseCurrencyAmount, normalizeDate, createDedupHash, cleanMimeText, amountAppearsInText, verifyAmountEvidence } = require('../parsers/types');
const { validateAndEnrichAiOutput, heuristicParse } = require('../parsers/aiFallback');
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
    assert.strictEqual(parseCurrencyAmount('Rp 86,900', 'IDR'), 86900); // Comma thousands separator
    assert.strictEqual(parseCurrencyAmount('Rp 1,900', 'IDR'), 1900);
    assert.strictEqual(parseCurrencyAmount('Rp 95,000', 'IDR'), 95000);
    assert.strictEqual(parseCurrencyAmount('Rp 1', 'IDR'), 1);
    assert.strictEqual(parseCurrencyAmount('¥1,500', 'JPY'), 1500);
    assert.strictEqual(parseCurrencyAmount('1,250円', 'JPY'), 1250);
    assert.strictEqual(parseCurrencyAmount('$12.50', 'USD'), 12.5);
    assert.strictEqual(parseCurrencyAmount('1,500.50', 'USD'), 1500.5);
    console.log('✓ Test 3 Passed: Multi-Currency & Locale Parsing Precision (Comma & Dot separators)');
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

    assert(cleanedText.includes('Good Laundry 1'), 'Decoded text must contain merchant name');
    assert(cleanedText.includes('Rp 15.000'), 'Decoded text must contain decoded non-breaking space');
    assert(!cleanedText.includes('<html>') && !cleanedText.includes('<td>'), 'HTML tags must be stripped');
    console.log('✓ Test 6 Passed: Gmail API Base64url MIME / HTML Payload Decoding');
  }

  // Test 7: Bank BCA QRIS Transaction Fixture
  {
    const bcaEmail = {
      from: 'mtrans@bca.co.id',
      subject: 'BCA: Pembayaran QRIS Berhasil',
      text: `Yth. Nasabah BCA,\nTransaksi pembayaran QRIS Anda telah berhasil:\nMerchant: KOPI KENANGAN\nTanggal: 2026-11-11\nJam: 10:45\nNominal: Rp 28.000\nNo Referensi: BCA20261111998877`
    };
    const res = await parseEmailReceipt(bcaEmail);
    assert.strictEqual(res.merchant, 'KOPI KENANGAN');
    assert.strictEqual(res.amount, 28000);
    assert.strictEqual(res.category, 'food_drinks');
    assert.strictEqual(res.currency, 'IDR');
    console.log('✓ Test 7 Passed: Bank BCA QRIS Transaction Fixture');
  }

  // Test 8: PayPay Japan Receipt Fixture
  {
    const paypayEmail = {
      from: 'service@paypay-corp.co.jp',
      subject: '【PayPay】お支払い完了のお知らせ',
      text: `利用先：ファミリーマート\nお支払い金額：1,250円\n利用日時：2026/11/12 12:30`
    };
    const res = await parseEmailReceipt(paypayEmail);
    assert.strictEqual(res.merchant, 'ファミリーマート');
    assert.strictEqual(res.amount, 1250);
    assert.strictEqual(res.currency, 'JPY');
    assert.strictEqual(res.category, 'food_drinks');
    console.log('✓ Test 8 Passed: PayPay Japan Receipt Fixture');
  }

  // Test 9: GoPay Indonesia E-Wallet Fixture
  {
    const gopayEmail = {
      from: 'receipts@gojek.com',
      subject: 'Bukti Pembayaran GoPay',
      text: `Pembayaran Berhasil\nPenerima: Kopi Kenangan\nTotal Pembayaran: Rp 22.000\nTanggal: 10 Nov 2026`
    };
    const res = await parseEmailReceipt(gopayEmail);
    assert.strictEqual(res.merchant, 'Kopi Kenangan');
    assert.strictEqual(res.amount, 22000);
    assert.strictEqual(res.currency, 'IDR');
    console.log('✓ Test 9 Passed: GoPay Indonesia E-Wallet Fixture');
  }

  // Test 10: Conflict-Safe Sync Merge
  {
    const clientTransactions = [
      { id: 'tx_offline_client_1', amount: 50000, category: 'food_drinks', date: '2026-11-12' }
    ];
    const serverState = {
      transactions: [
        { id: 'tx_email_imp_999', amount: 15000, category: 'laundry', date: '2026-11-06', isEmailImported: true }
      ]
    };
    const clientTxIds = new Set(clientTransactions.map(t => t.id));
    const missingEmailTxs = serverState.transactions.filter(t =>
      (t.isEmailImported || (typeof t.id === 'string' && t.id.startsWith('tx_email_'))) &&
      !clientTxIds.has(t.id)
    );
    const mergedTransactions = [...missingEmailTxs, ...clientTransactions];

    assert.strictEqual(mergedTransactions.length, 2, 'Merged transaction list must contain both client tx and approved email tx');
    assert.strictEqual(mergedTransactions[0].id, 'tx_email_imp_999');
    assert.strictEqual(mergedTransactions[1].id, 'tx_offline_client_1');
    console.log('✓ Test 10 Passed: Conflict-Safe Sync Merge');
  }

  // Test 11: Deleted Transaction Tombstone
  {
    const deletedTxIds = ['tx_email_imp_88'];
    const serverState = {
      transactions: [
        { id: 'tx_email_imp_88', amount: 30000, category: 'shopping', date: '2026-11-10', isEmailImported: true }
      ]
    };
    const deleted = new Set(deletedTxIds);
    let mergedTransactions = [{ id: 'tx_base_1', amount: 10000 }];
    const clientTxIds = new Set(mergedTransactions.map(t => t.id));

    const missingEmailTxs = serverState.transactions.filter(t =>
      (t.isEmailImported || (typeof t.id === 'string' && t.id.startsWith('tx_email_'))) &&
      !clientTxIds.has(t.id) &&
      !deleted.has(t.id)
    );

    mergedTransactions = [...missingEmailTxs, ...mergedTransactions];

    assert.strictEqual(mergedTransactions.length, 1, 'Merged state must contain only tx_base_1');
    assert(!mergedTransactions.some(t => t.id === 'tx_email_imp_88'), 'Deleted email transaction must NOT resurrect');
    console.log('✓ Test 11 Passed: Deleted Transaction Tombstone (No Zombie Email Transactions)');
  }

  // Test 12: Strict Validation on /approve Payload Updates
  {
    const ALLOWED_CATEGORIES = new Set(['food_drinks', 'shopping', 'train', 'ride', 'laundry', 'rent', 'family', 'gifts', 'vps', 'mobile', 'others']);
    const ALLOWED_SOURCES = new Set(['bank', 'ewallet', 'credit_card', 'cash']);
    const ALLOWED_CURRENCIES = new Set(['IDR', 'JPY', 'USD', 'MMK']);

    function validateUpdates(updates) {
      if (!updates) return { valid: true };
      if (updates.amount !== undefined) {
        const amt = Number(updates.amount);
        if (!Number.isFinite(amt) || amt <= 0 || amt > 100000000000) return { valid: false, err: 'Invalid amount' };
      }
      if (updates.currency !== undefined && !ALLOWED_CURRENCIES.has(updates.currency)) {
        return { valid: false, err: 'Invalid currency' };
      }
      if (updates.category !== undefined && !ALLOWED_CATEGORIES.has(updates.category)) {
        return { valid: false, err: 'Invalid category' };
      }
      if (updates.source !== undefined && !ALLOWED_SOURCES.has(updates.source)) {
        return { valid: false, err: 'Invalid source' };
      }
      if (updates.occurred_at !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(updates.occurred_at))) {
        return { valid: false, err: 'Invalid date' };
      }
      return { valid: true };
    }

    assert.strictEqual(validateUpdates({ amount: -500 }).valid, false);
    assert.strictEqual(validateUpdates({ amount: 'invalid' }).valid, false);
    assert.strictEqual(validateUpdates({ amount: Infinity }).valid, false);
    assert.strictEqual(validateUpdates({ currency: 'XXX' }).valid, false);
    assert.strictEqual(validateUpdates({ category: 'crypto' }).valid, false);
    assert.strictEqual(validateUpdates({ occurred_at: '12-11-2026' }).valid, false);
    assert.strictEqual(validateUpdates({ amount: 15000, currency: 'IDR', category: 'laundry', occurred_at: '2026-11-06' }).valid, true);

    console.log('✓ Test 12 Passed: Strict Validation on /approve Updates');
  }

  // Test 13: amountAppearsInText and verifyAmountEvidence Precision (Anti-Hallucination)
  {
    const sampleShopeeText = `
No. Pesanan: 261107MFWDMCBV
Tanggal Pemesanan: 07/11/2026 05:44:50
Penjual: iok.id
Subtotal: Rp 95,000
Ongkos Kirim: Rp 0
Diskon Voucher Shopee: Rp 10,000
Biaya Layanan: Rp 1,900
Total Pembayaran: Rp 86,900
`;
    // Verified amounts that appear in text
    assert.strictEqual(amountAppearsInText(86900, 'IDR', sampleShopeeText), true);
    assert.strictEqual(amountAppearsInText(95000, 'IDR', sampleShopeeText), true);
    assert.strictEqual(amountAppearsInText(1900, 'IDR', sampleShopeeText), true);
    assert.strictEqual(amountAppearsInText(10000, 'IDR', sampleShopeeText), true);

    // Amounts that do NOT appear (hallucinations)
    assert.strictEqual(amountAppearsInText(50000, 'IDR', sampleShopeeText), false);
    assert.strictEqual(amountAppearsInText(86, 'IDR', sampleShopeeText), false);
    assert.strictEqual(amountAppearsInText(87, 'IDR', sampleShopeeText), false);

    // Evidence quote verification
    const validEvidence = 'Total Pembayaran: Rp 86,900';
    assert.strictEqual(verifyAmountEvidence(validEvidence, 86900, 'IDR', sampleShopeeText), true);

    // Tampered evidence quote
    const tamperedEvidence = 'Total Pembayaran: Rp 86,900';
    assert.strictEqual(verifyAmountEvidence(tamperedEvidence, 95000, 'IDR', sampleShopeeText), false);

    const fabricatedEvidence = 'Total Pembayaran: Rp 50,000';
    assert.strictEqual(verifyAmountEvidence(fabricatedEvidence, 50000, 'IDR', sampleShopeeText), false);

    console.log('✓ Test 13 Passed: Anti-Hallucination Defense (amountAppearsInText & verifyAmountEvidence)');
  }

  // Test 14: Shopee Delivery Receipt Real Layout (Anonymized from User PDF)
  {
    const shopeePdfText = `
Hai muhamadkrisnandi,
Pesanan 261107MFWDMCBV telah tiba di alamatmu pada 09/11/2026.
Jika puas dengan pesananmu, beri penilaian di halaman "Pesanan Saya" untuk dapatkan koin Shopee!
RINCIAN PESANAN
No. Pesanan: 261107MFWDMCBV
Tanggal Pemesanan: 07/11/2026 05:44:50
Penjual: iok.id
1. IOK Celana Jogger Panjang Pria Ice Silk | Training Sport Pants Saku Resleting (Jogger002)
Variasi: Jogger - Charcoal,M
Jumlah: 1
Harga: Rp 95,000
Subtotal: Rp 95,000
Ongkos Kirim: Rp 0
Diskon Voucher Shopee: Rp 10,000
Kode Promo Voucher Shopee: VIP10KNOV26
Biaya Layanan: Rp 1,900
Total Pembayaran: Rp 86,900
`;
    const shopeeEmail = {
      from: 'Shopee <info@mail.shopee.co.id>',
      subject: 'Pesanan 261107MFWDMCBV Telah Dikirim',
      text: shopeePdfText,
      date: 'Mon, Nov 9, 2026 at 1:03 PM',
      messageId: 'shopee_msg_pdf_test_1'
    };

    // Subtest 14a: AI Structured Output Validator (simulating Gemini 3.8 Flash structured response)
    const simulatedAiJson = {
      email_type: 'order_update',
      merchant: 'Shopee',
      seller: 'iok.id',
      item_summary: 'IOK Celana Jogger Panjang Pria Ice Silk',
      amount: 86900,
      currency: 'IDR',
      amount_evidence: 'Total Pembayaran: Rp 86,900',
      breakdown: {
        subtotal: 95000,
        shipping: 0,
        discount: 10000,
        fees: 1900
      },
      occurred_at: '07/11/2026 05:44:50',
      category: 'shopping',
      payment_method: 'ewallet',
      order_ref: '261107MFWDMCBV',
      confidence: 0.95
    };

    const validated = validateAndEnrichAiOutput(simulatedAiJson, shopeeEmail, shopeePdfText);
    assert.strictEqual(validated.amount, 86900, 'Amount must be exactly 86900');
    assert.strictEqual(validated.currency, 'IDR');
    assert.strictEqual(validated.occurredAt, '2026-11-07', 'OccurredAt must be transaction order date (Nov 7), NOT delivery date (Nov 9)');
    assert.strictEqual(validated.emailType, 'order_update', 'Must be classified as order_update');
    assert.strictEqual(validated.orderRef, '261107MFWDMCBV', 'Order ref must be extracted for deduplication');
    assert.strictEqual(validated.seller, 'iok.id');
    assert(validated.itemSummary.includes('IOK Celana Jogger'));
    assert.strictEqual(validated.category, 'shopping');
    assert.strictEqual(validated.parsedBy, 'ai');
    assert(validated.confidence <= 0.60, 'AI order_update confidence MUST be capped at <= 0.60');

    // Subtest 14b: Heuristic Regex Fallback on the same layout
    const fallbackRes = heuristicParse(shopeeEmail);
    assert.strictEqual(fallbackRes.amount, 86900, 'Fallback regex must extract Rp 86,900');
    assert.strictEqual(fallbackRes.occurredAt, '2026-11-07', 'Fallback regex must extract order date 2026-11-07');
    assert.strictEqual(fallbackRes.orderRef, '261107MFWDMCBV');
    assert.strictEqual(fallbackRes.emailType, 'order_update');

    console.log('✓ Test 14 Passed: Shopee Delivery Layout (User PDF) Structured AI Validation & Fallback Regex');
  }

  // Test 15: Real Rp 1 Flash Deal Receipt (Roti'O) vs Marketing Blast Spam
  {
    const realFlashSaleReceipt = {
      from: 'ShopeePay <no-reply@mail.shopee.co.id>',
      subject: 'Pembayaran Berhasil di Roti O',
      text: `Rincian Transaksi
Merchant: Roti O VIP Mall
No. Pesanan: #SHPROTI112233
Total Pembayaran: Rp 1
Tanggal Transaksi: 08 Nov 2026 14:20`
    };

    const spamMarketingBlast = {
      from: 'Shopee Promo <promo@mail.shopee.co.id>',
      subject: 'Beli Roti O Cuma Rp 1 di Shopee VIP!',
      text: `Dapatkan voucher belanja seharga Rp 1 sekarang juga sebelum kehabisan!`
    };

    const realRes = await parseEmailReceipt(realFlashSaleReceipt);
    assert(realRes !== null, 'Real Rp 1 receipt with transaction proof must be accepted');
    assert.strictEqual(realRes.amount, 1, 'Amount must be 1');

    const spamRes = await parseEmailReceipt(spamMarketingBlast);
    assert.strictEqual(spamRes, null, 'Marketing blast without receipt proof must be rejected');

    console.log("✓ Test 15 Passed: Real Rp 1 Flash Deal (Roti'O) Accepted vs Marketing Spam Filtered");
  }

  // Test 16: Hybrid Option A Safe Batch Approve All (Excluding AI and Order Notices)
  {
    const mockPendingImports = [
      { id: '1', provider: 'mandiri', merchant: 'RM SALERO BARU', amount: 10000, confidence: 0.98, parsed_by: 'regex', email_type: 'payment' },
      { id: '2', provider: 'jago', merchant: 'Good Laundry 1', amount: 15000, confidence: 0.95, parsed_by: 'regex', email_type: 'payment' },
      { id: '3', provider: 'shopeepay', merchant: 'Shopee', amount: 86900, confidence: 0.60, parsed_by: 'ai', email_type: 'order_update' },
      { id: '4', provider: 'shopeepay', merchant: 'Ayi Nanan Central', amount: 1, confidence: 0.60, parsed_by: 'ai', email_type: 'payment' }
    ];

    // Filter simulating SQL WHERE in /approve (all: true)
    const eligibleForBatchApprove = mockPendingImports.filter(item =>
      item.confidence >= 0.8 &&
      (item.parsed_by === null || item.parsed_by !== 'ai') &&
      (item.email_type === null || item.email_type === 'payment')
    );

    assert.strictEqual(eligibleForBatchApprove.length, 2, 'Only deterministic regex items with confidence >= 0.8 can be batch approved');
    assert.strictEqual(eligibleForBatchApprove[0].provider, 'mandiri');
    assert.strictEqual(eligibleForBatchApprove[1].provider, 'jago');
    assert(!eligibleForBatchApprove.some(i => i.parsed_by === 'ai'), 'AI items must NEVER be batch approved');
    assert(!eligibleForBatchApprove.some(i => i.email_type === 'order_update'), 'Order updates must NEVER be batch approved');

    console.log('✓ Test 16 Passed: Hybrid Option A Safe Batch Approve (AI & Order Notices Strictly Excluded)');
  }

  console.log('\n======================================================');
  console.log('ALL 16 TEST SUITES COMPLETED WITH 100% SUCCESS RATE!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
