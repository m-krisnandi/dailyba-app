const assert = require('assert');
const { parseEmailReceipt } = require('../parsers/engine');
const { parseCurrencyAmount, normalizeDate, createDedupHash, cleanMimeText } = require('../parsers/types');
const { encrypt, decrypt, redactPII, stripGreetings } = require('../crypto');

async function runTests() {
  console.log('--- RUNNING DAILYBA FINANCIAL PARSER & SECURITY TEST SUITE ---');

  // Test 1: Bank Jago (Real Receipt Fixture from PDF 1)
  {
    const jagoEmail = {
      from: 'Jago <noreply@jago.com>',
      subject: 'You have made a payment to Good Laundry 1💸',
      text: `Assalamu'alaikum MUHAMAD KRISNANDI,
Thank you for trusting Jago! You have made a payment, and here are the details:
Transaction Summary
From 502799066497
To Good Laundry 1
9360000801984237685
Amount Rp 15.000
Transaction Date 06 November 2026, 19:20 WIB
Transaction Status Successful
Acquirer Name Bank Mandiri
Merchant Location Banyumas (Kab)
Terminal ID A01
Customer PAN 9360054212799066498
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
    assert(!res.rawSnippet.includes('9360000801984237685'), 'Raw snippet must redact PAN');
    console.log('✓ Test 1 Passed: Bank Jago Real PDF Fixture');
  }

  // Test 2: Livin' by Mandiri (Real Receipt Fixture from PDF 2)
  {
    const mandiriEmail = {
      from: "Livin' <noreply.livin@bankmandiri.co.id>",
      subject: 'Pembayaran Berhasil!',
      text: `Pembayaran Berhasil
Halo MUHAMAD KRISNANDI ,
Berikut adalah detail transaksi Anda dengan QR:
Penerima
RM SALERO BARU
BANJARNEGARA - ID
Tanggal 12 Nov 2026
Jam 18:02:33 WIB
Nominal Transaksi Rp 10.000,00
No. Referensi 2611121122539729748
No. Ref. QRIS 611526810737
Merchant PAN 9360045100002343303
Customer PAN 9360000812229391872
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
    console.log("✓ Test 2 Passed: Livin' by Mandiri Real PDF Fixture");
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
    const sample = 'Assalamu\'alaikum MUHAMAD KRISNANDI,\nPAN: 9360000801984237685 Rekening: 502799066497 Email: user.name@gmail.com Phone: 081234567890\nPaid Rp 1500000 to Good Laundry 1 on 2026-11-12 at 18:02';
    const noGreetings = stripGreetings(sample);
    assert(!noGreetings.includes('MUHAMAD KRISNANDI'), 'Greetings with customer name must be stripped');

    const sanitized = redactPII(noGreetings);
    assert(!sanitized.includes('9360000801984237685'), 'PAN must be redacted');
    assert(!sanitized.includes('502799066497'), 'Account must be redacted');
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
          <tr><td>Assalamu&#39;alaikum MUHAMAD KRISNANDI,</td></tr>
          <tr><td>Transaction Summary</td></tr>
          <tr><td>From</td><td>502799066497</td></tr>
          <tr><td>To</td><td>Good Laundry 1</td></tr>
          <tr><td>Amount</td><td>Rp&nbsp;15.000</td></tr>
          <tr><td>Transaction Date</td><td>06 November 2026, 19:20 WIB</td></tr>
          <tr><td>Customer PAN</td><td>9360054212799066498</td></tr>
        </table>
      </body>
      </html>
    `;
    const base64urlData = Buffer.from(rawHtml, 'utf8').toString('base64url');
    const decodedFromGmail = Buffer.from(base64urlData, 'base64url').toString('utf8');
    const cleanedText = cleanMimeText(decodedFromGmail);

    const parsed = await parseEmailReceipt({
      from: 'Jago <noreply@jago.com>',
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

  // Test 7: BCA QRIS & Transfer Parser
  {
    const bcaEmail = {
      from: 'BCA <noreply@bca.co.id>',
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

  // Test 8: PayPay Japan Parser
  {
    const paypayEmail = {
      from: 'PayPay <no-reply@paypay.ne.jp>',
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

  // Test 9: GoPay Indonesia Parser
  {
    const gopayEmail = {
      from: 'GoPay <receipt@gojek.com>',
      subject: 'Bukti Pembayaran GoPay ke Starbucks',
      text: `Hai Krisnandi,
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

  console.log('\n======================================================');
  console.log('ALL 9 TEST SUITES COMPLETED WITH 100% SUCCESS RATE!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
