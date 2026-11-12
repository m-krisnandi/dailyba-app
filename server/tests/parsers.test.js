const assert = require('assert');
const { parseEmailReceipt } = require('../parsers/engine');
const { parseCurrencyAmount, normalizeDate, createDedupHash } = require('../parsers/types');
const { encrypt, decrypt, redactPII } = require('../crypto');

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

    // Tampered tag test
    const tampered = encrypted.slice(0, -4) + 'ffff';
    const tamperedResult = decrypt(tampered);
    assert.strictEqual(tamperedResult, '', 'Tampered tag must fail decryption cleanly');
    console.log('✓ Test 4 Passed: AES-256-GCM Token Encryption & Anti-Tamper');
  }

  // Test 5: PII Redaction
  {
    const sample = 'PAN: 9360000801984237685 Rekening: 502799066497 Email: user.name@gmail.com Phone: 081234567890';
    const sanitized = redactPII(sample);
    assert(!sanitized.includes('9360000801984237685'), 'PAN must be redacted');
    assert(!sanitized.includes('502799066497'), 'Account must be redacted');
    assert(!sanitized.includes('081234567890'), 'Phone must be redacted');
    console.log('✓ Test 5 Passed: PII Redaction');
  }

  console.log('\nALL 5 TEST SUITES PASSED WITH 100% SUCCESS!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
