# Dailyba (Daily Balance & Wealth Tracker)

A modern, minimalist personal finance and wealth management system designed with **Liquid Glass UI**, high-trust fintech principles, and cross-platform native sync across **Web, Android, and iOS**.

---

## 📚 Dokumentasi

- [Arsitektur Sistem & Database](docs/ARCHITECTURE.md)
- [Panduan Deployment VPS (Docker Compose + Caddy Subdomain)](docs/DEPLOYMENT.md)

---

## 🛠️ Stack Teknologi

- **Frontend (`src/`)**: Next.js 16 (React 19) + Tailwind CSS v4 (`output: 'export'`)
- **Native Mobile**: Capacitor 8 (Android Studio + iOS Xcode)
- **Backend API (`server/`)**: Node.js + Express REST API + Better-SQLite3 (WAL Mode)
- **Containerization**: Docker Multi-stage + Docker Compose + Caddy / Nginx
- **Live Currency Engine**: Auto-updating exchange rates via `open.er-api.com` (JPY, IDR, USD, MMK)

---

## 💻 Menjalankan di Lokal (Development)

Jalankan perintah berikut di folder proyek untuk menyalakan frontend dan backend sekaligus:

```bash
# 1. Install dependencies
npm install
cd server && npm install && cd ..

# 2. Jalankan frontend (port 3001) & REST API server (port 4000) bersamaan
npm run dev
```

Buka di browser:
- **Dailyba Web**: [http://localhost:3001](http://localhost:3001)
- **Dailyba REST API Health**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 🌐 Menjalankan di Produksi (VPS Docker)

Ikuti panduan lengkap di [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Ringkasan perintah:

```bash
# 1. Salin template env
cp deploy/.env.prod.example .env
nano .env  # Atur DOMAIN_NAME dan JWT_SECRET

# 2. Jalankan via Docker Compose
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

---

## 📱 Build Aplikasi Native (Android & iOS)

### Android APK:
```bash
# Build aset web statis dan sinkronkan ke proyek Android native
npm run sync

# Buka proyek di Android Studio:
npm run open:android

# Atau build debug APK langsung via terminal:
npm run build:apk
# File APK hasil build berada di:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS App:
```bash
# Build aset web statis dan sinkronkan ke proyek iOS native
npm run sync

# Buka proyek di Xcode:
npm run open:ios
```

---

## ✨ Fitur Unggulan

1. **Anti-Ngetik Daily Expense Logging (2-Detik Record)**:
   - Tombol nominal instan (`+1k`, `+3k`, `+5k`, `+10k`, `+50k`).
   - Smart Quick Text: Ketik `train 220`, `laundry 600`, `vps 1800`, `makan 45k` lalu tekan **Enter**.
   - Funding Source fleksibel: Cash, Bank Transfer, IC / e-Wallet, Credit Card.
2. **Tagihan Bulanan Otomatis (Recurring Bills)**:
   - 1-Click confirm tagihan per siklus bulan.
   - Sinkronisasi dua arah (menghapus transaksi tagihan otomatis membatalkan status bayar bulan terkait).
3. **Multi-Mata Uang & Live Rates**:
   - Mata uang: **¥ JPY** (Default), **Rp IDR**, **$ USD**, dan **K MMK** (Myanmar Kyat).
   - Kurs diperbarui secara otomatis dan responsif di seluruh ringkasan.
4. **Cloud Sync Mandiri (Self-Hosted)**:
   - Login, Sign Up, dan Lupa Password (verifikasi OTP 6 digit).
   - Data otomatis tersinkronisasi saat Anda ganti HP atau berpindah antara Android, iPhone, dan Web.
5. **Investasi & Total Kekayaan Bersih (Net Worth)**:
   - Portofolio Reksa Dana, Saham, Crypto, Emas, dan Deposito.
   - Perhitungan otomatis laba/rugi mengambang (*Unrealized P&L*).
