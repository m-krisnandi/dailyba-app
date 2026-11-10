# Dailyba Release & App Store / Play Store Guide

Panduan resmi persiapan, tanda tangan rilis (signing), dan kepatuhan toko aplikasi (Google Play Console & Apple App Store Connect) untuk **Dailyba**.

---

## 1. Identitas Aplikasi & Penyelarasan Package ID

Package Name / Bundle Identifier telah diselaraskan 100% di semua platform:
* **Application ID / Package Name**: `com.dailyba.app`
* **App Name**: `Dailyba`
* **Version**: `1.5.1`
* **Version Code / Build Number**: `151`
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
