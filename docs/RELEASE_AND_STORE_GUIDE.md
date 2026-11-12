# Dailyba Release & App Store / Play Store Guide

Panduan resmi persiapan, tanda tangan rilis (signing), dan kepatuhan toko aplikasi (Google Play Console & Apple App Store Connect) untuk **Dailyba**.

---

## 1. Identitas Aplikasi & Penyelarasan Package ID

Package Name / Bundle Identifier telah diselaraskan 100% di semua platform:
* **Application ID / Package Name**: `com.dailyba.app`
* **App Name**: `Dailyba`
* **Version**: `1.6.0`
* **Version Code / Build Number**: `160`
* **Lokasi Pengaturan**:
  * Capacitor: `capacitor.config.ts` (`appId: "com.dailyba.app"`)
  * Android: `android/app/build.gradle` (`applicationId "com.dailyba.app"`, `namespace "com.dailyba.app"`)
  * Android Java Source: `android/app/src/main/java/com/dailyba/app/MainActivity.java`
  * iOS: `ios/App/App.xcodeproj/project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER = com.dailyba.app;`)

---

## 2. Android Signing Keystore (Official Release Key)

Aplikasi telah dikonfigurasikan dengan keystore rilis resmi:
* **Lokasi Keystore**: `android/app/dailyba-release.jks`
* **Key Alias**: `dailyba`
* **Keystore Password**: `dailybaSecure2026!`
* **Key Password**: `dailybaSecure2026!`
* **Algorithm**: RSA 2048-bit (SHA384withRSA)
* **Masa Berlaku**: 10.000 hari (berlaku hingga tahun 2054, memenuhi syarat minimum 25 tahun Google Play)
* **Distinguished Name (DN)**: `CN=Dailyba, OU=Mobile, O=Dailyba, L=Jakarta, ST=DKI Jakarta, C=ID`

> [!TIP]
> Di lingkungan CI/CD otomatis, Anda dapat meng-override kredensial ini via environment variables:
> `KEYSTORE_PASSWORD`, `KEY_ALIAS`, dan `KEY_PASSWORD`.

---

## 3. Script Build Rilis

| Perintah Terminal | Output File | Fungsi & Penggunaan |
| :--- | :--- | :--- |
| `npm run build:aab` | `public/dailyba.aab` (4.8 MB) | **Android App Bundle (.aab)** yang sudah ditandatangani keystore rilis untuk di-upload langsung ke Google Play Console. |
| `npm run build:apk` | `public/dailyba.apk` (6.2 MB) | **Universal Debug APK (.apk)** untuk testing internal di HP Android atau direct download. |
| `npm run build` | `out/` | Next.js Static Export untuk Web PWA dan Capacitor sync. |
| `npm run lint` | Terminal | Pengecekan ESLint & TypeScript (0 errors, 0 warnings). |

---

## 4. URL Publik Resmi untuk Reviewer Toko

Kedua halaman ini dapat diakses secara publik di browser tanpa perlu login, lengkap dengan tombol switch dwibahasa (English & 日本語):
* **Privacy Policy URL**: [https://dailyba.pdfumi.com/privacy](https://dailyba.pdfumi.com/privacy)
* **Terms of Service URL**: [https://dailyba.pdfumi.com/terms](https://dailyba.pdfumi.com/terms)

---

## 5. Checklist Google Play Console

Saat membuat aplikasi baru di Google Play Console:
1. **App Details**:
   * App Name: `Dailyba`
   * Default Language: English (United States) atau Indonesian
   * App or Game: `App`
   * Free or Paid: `Free`
2. **App Access**:
   * Pilih *"All functionality is available without special access"* (karena Dailyba langsung aktif offline tanpa wajib login).
3. **Ads**:
   * Pilih *"No, my app does not contain ads"*.
4. **Data Safety (Kuesioner Keamanan Data)**:
   * **Apakah aplikasi mengumpulkan data?**: Ya (hanya data opsional jika user memakai Cloud Sync).
   * **Data Pribadi (Personal Info)**: Email Address (hanya untuk otentikasi akun jika mendaftar Cloud Sync; tidak dibagikan ke pihak ketiga).
   * **Data Finansial (Financial Info)**: Riwayat transaksi/anggaran (disimpan lokal di HP secara default, disinkronkan ke DB pribadi hanya jika login; tidak dijual ke pihak ketiga).
   * **Foto / Video**: Ya (hanya saat user menggunakan fitur Scan Struk; diproses secara ephemeral/sementara untuk OCR teks dan tidak dipakai untuk training model).
   * **Penghapusan Akun**: Nyatakan bahwa aplikasi menyediakan fitur hapus akun dan seluruh data instan langsung di dalam aplikasi (Menu Akun ➔ "Delete My Account & Cloud Data").
5. **Target Audience**:
   * 18+ (atau 13+ ke atas, aplikasi keuangan pribadi).

---

## 6. Checklist Apple App Store Connect

Saat submit build via Xcode / Transporter:
1. **Bundle ID**: `com.dailyba.app`
2. **SKU**: `dailyba-app`
3. **App Privacy (Nutrition Label)**:
   * **Data Not Linked to You**: User Content (Receipt images for OCR)
   * **Data Linked to You**: Contact Info (Email, jika memakai Cloud Sync), Financial Info (Transaction logs, jika memakai Cloud Sync).
   * **Tracking**: Nyatakan *"We do not track users across other companies' apps or websites"*.
4. **Account Deletion Compliance (Guideline 5.1.1(v))**:
   * Sudah terpenuhi 100% via tombol in-app "Delete My Account & Cloud Data" yang mengeksekusi CASCADE delete di server PostgreSQL/SQLite.

---

## 7. Aset Banner & Gambar Promosi Toko

* **Feature Graphic Google Play Store (1024 x 500 px)**:
  * Lokasi: `public/dailyba-feature-graphic-1024x500.png`
  * Rasio: Tepat 1024 x 500 piksel, memenuhi spesifikasi wajib Google Play Store.
  * Desain: Gaya fintech gelap minimalis dengan judul **Dailyba** dan subjudul **Daily Balance & Wealth Tracker**, menampilkan antarmuka pencatatan dan pemindai struk.

---

## 8. Akun Uji Coba Reviewer (App Store / Play Store Reviewer Credentials)

Gunakan akun resmi ini saat diminta di kolom **App Review Information / Test Account**:
* **Email**: `reviewer@dailyba.app`
* **Password**: `DailybaReview2026!`
* **Peran**: Demo Account (Secara otomatis di-seed oleh backend server `server/index.js` saat startup).
* **Catatan Tambahan untuk Reviewer**:
  > "All core budgeting and balance tracking features work 100% offline without login. The credentials above are provided for testing optional multi-device cloud synchronization."

---

## 9. Siap Copy-Paste: Deskripsi Toko Aplikasi (ASO & Store Listing Copy)

### A. Google Play Store
* **App Title (Maks 30 karakter)**:
  `Dailyba`
* **Short Description (Maks 80 karakter)**:
  `Daily Balance & Wealth Tracker with daily spending target & AI receipt scanner.`
* **Full Description (Maks 4000 karakter)**:
```text
Dailyba: Daily Balance & Wealth Tracker

Dailyba is a streamlined financial tracker designed to provide clarity over your daily spending, recurring commitments, and long-term savings reserves.

1. DAILY SPENDING TARGET
Set a realistic daily budget target to maintain financial awareness every single day. See your remaining allowance update instantly with every expense logged.

2. FAST RECORDING & AI RECEIPT SCANNER
Log expenses, income, and reserve allocations in seconds. Use the built-in receipt scanner to capture totals, merchants, and dates automatically from photos or camera input.

3. STRUCTURED SPENDING CATEGORIES
Organize your expenses into clear, practical pillars (Needs, Wants, Culture, and Unexpected) alongside flexible custom categories and funding sources (Cash, Bank, E-Wallet, Card).

4. RECURRING BILLS & COMMITMENTS
Track recurring obligations such as rent, utilities, and subscriptions. Identify upcoming dues and mark them as settled with one click.

5. SAVINGS VAULT & EMERGENCY RESERVE
Allocate funds toward savings goals and emergency reserves. Monitor monthly allocation rates and cumulative reserve growth over time.

6. PRIVACY-FIRST ARCHITECTURE
- Works fully offline out of the box with zero forced account creation.
- Optional multi-device Cloud Sync for seamless data backup.
- Instant permanent account and cloud data deletion directly from account settings.
- Export and import full financial records anytime via JSON and CSV.

7. MULTI-CURRENCY SUPPORT
Support for IDR (Rp), JPY (¥), USD ($), and MMK (K) with live exchange rate conversions.
```

### B. Apple App Store
* **Name**: `Dailyba`
* **Subtitle (Maks 30 karakter)**:
  `Daily Balance & Wealth Tracker`
* **Promotional Text (Maks 170 karakter)**:
  `Track daily balances, manage spending targets, scan receipts, and grow your wealth reserves with Dailyba.`
* **Keywords (Maks 100 karakter)**:
  `daily balance,wealth tracker,expense tracker,budget,spending limit,receipt scanner,saving,money`
