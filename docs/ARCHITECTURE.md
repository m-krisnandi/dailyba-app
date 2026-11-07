# Arsitektur Sistem — Dailyba

Dokumentasi arsitektur sistem dan prinsip desain teknis **Dailyba** (Daily Balance & Wealth Tracker).

---

## 🏛️ Gambaran Umum Arsitektur

Dailyba dirancang dengan filosofi **Offline-First**, **Zero-Vendor Lock-in**, dan **Unified Cross-Platform**:

```text
┌────────────────────────────────────────────────────────┐
│                   Aplikasi Klien                       │
│  ┌───────────────┐ ┌────────────────┐ ┌─────────────┐  │
│  │  Web Browser  │ │ Android Native │ │ iOS Native  │  │
│  │   (PWA / Web) │ │  (Capacitor)   │ │ (Capacitor) │  │
│  └───────┬───────┘ └────────┬───────┘ └──────┬──────┘  │
│          │                  │                │         │
│          └──────────────────┼────────────────┘         │
│                             │                          │
│                   Local State / Storage                │
│                 (Offline Instant Access)               │
└─────────────────────────────┼──────────────────────────┘
                              │
                    HTTPS Sync (Debounced)
                              │
                              ▼
┌────────────────────────────────────────────────────────┐
│                   VPS Cloud Server                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  Caddy Proxy                     │  │
│  │          (Automatic SSL / Let's Encrypt)         │  │
│  └──────────┬───────────────────────────┬───────────┘  │
│             │                           │              │
│       /api/*│                           │/*            │
│             ▼                           ▼              │
│  ┌─────────────────────┐     ┌──────────────────────┐  │
│  │  Dailyba REST API   │     │ Dailyba Web (Nginx)  │  │
│  │  (Node.js + Express)│     │  (Next.js Export)    │  │
│  └──────────┬──────────┘     └──────────────────────┘  │
│             │                                          │
│             ▼                                          │
│  ┌─────────────────────┐                               │
│  │  SQLite (WAL Mode)  │                               │
│  │    (dailyba.db)     │                               │
│  └─────────────────────┘                               │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Struktur Direktori Proyek

```text
dailyba-app/
├── android/               # Native Android Studio Project (Capacitor)
├── ios/                   # Native iOS Xcode Project (Capacitor)
├── public/                # Static assets, 3D app icons, favicon, manifest.json
├── src/
│   ├── app/               # Next.js App Router (layout.tsx, page.tsx, globals.css)
│   ├── components/        # Komponen UI Liquid Glass:
│   │   ├── Header.tsx           # Brand, Live Rates, Currency Selector, Profile/Sign In
│   │   ├── TabsNav.tsx          # Floating iOS Dock Nav
│   │   ├── QuickRecordBoard.tsx # 2-Second expense logging & Recurring Bills
│   │   ├── DailySpendBoard.tsx  # Daily budget gauge & spending adherence trend
│   │   ├── MonthlySummaryBoard.tsx # Monthly breakdown, savings rate, cash flow
│   │   ├── YearlySummaryBoard.tsx  # 12-Month Inflow/Outflow comparative analysis
│   │   ├── InvestmentBoard.tsx     # Portfolio tracking & Net Worth calculation
│   │   ├── SavingsBoard.tsx        # Liquid reserves & monthly savings goals
│   │   ├── AuthModal.tsx           # Sign In, Register, Forgot Password (OTP)
│   │   └── BackupModal.tsx         # JSON Import/Export & CSV spreadsheet
│   ├── lib/
│   │   ├── api.ts         # REST API Client (Fetch + JWT handling)
│   │   ├── authContext.tsx# Authentication Context & Sync state
│   │   ├── currency.ts    # Live currency engine (JPY, IDR, USD, MMK)
│   │   ├── i18n.ts        # Bilingual dictionary (EN / JA)
│   │   └── storage.ts     # LocalStorage state management
│   └── types/             # TypeScript interfaces (finance.ts)
├── server/
│   ├── index.js           # REST API Server (Express + SQLite)
│   ├── package.json       # Backend dependencies (better-sqlite3, bcryptjs, jwt)
│   ├── Dockerfile         # Dockerfile khusus API Server
│   └── README.md          # Dokumentasi server mandiri
├── deploy/
│   ├── .env.prod.example  # Template environment variabel produksi
│   ├── backup-db.sh       # Script cron backup SQLite otomatis
│   ├── Caddyfile          # Konfigurasi reverse proxy Caddy
│   └── nginx.conf         # Konfigurasi Nginx untuk web container
├── docs/
│   ├── ARCHITECTURE.md    # Dokumen arsitektur teknis
│   └── DEPLOYMENT.md      # Panduan instalasi dan deployment VPS
├── docker-compose.yml     # Compose untuk pengujian lokal
├── docker-compose.prod.yml# Compose untuk produksi VPS
├── Dockerfile             # Multi-stage Dockerfile untuk Web frontend
├── capacitor.config.ts    # Konfigurasi native Capacitor
└── README.md              # Dokumentasi utama proyek
```

---

## 🗄️ Skema Database SQLite (WAL Mode)

Database SQLite berjalan dalam mode `WAL` (*Write-Ahead Logging*) untuk membaca dan menulis secara simultan dengan konkurensi tinggi dan performa instan:

### 1. Tabel `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | Format: `usr_<timestamp>_<random>` |
| `email` | `TEXT UNIQUE NOT NULL` | Email pengguna (lowercase terverifikasi) |
| `password_hash` | `TEXT NOT NULL` | Password yang di-hash dengan `bcrypt` salt 10 |
| `name` | `TEXT` | Nama pengguna (opsional) |
| `reset_code` | `TEXT` | Kode OTP numerik 6 digit untuk reset password |
| `reset_expires_at` | `INTEGER` | Waktu kedaluwarsa kode OTP (15 menit) |
| `created_at` | `TEXT NOT NULL` | Timestamp ISO pembuatan akun |
| `updated_at` | `TEXT NOT NULL` | Timestamp ISO update terakhir |

### 2. Tabel `user_data` (Cloud Vault)
| Kolom | Tipe | Keterangan |
|---|---|---|
| `user_id` | `TEXT PRIMARY KEY` | Relasi ke `users(id)` ON DELETE CASCADE |
| `data_json` | `TEXT NOT NULL` | Snapshot JSON lengkap: transaksi, recurring bills, tabungan, investasi |
| `version` | `INTEGER DEFAULT 1`| Versi dokumen data pengguna |
| `synced_at` | `TEXT NOT NULL` | Timestamp ISO sinkronisasi terakhir |

---

## 🔐 Keamanan & Siklus Autentikasi

1. **Hashing Kata Sandi**: Kata sandi pengguna tidak pernah disimpan sebagai teks biasa; selalu di-hash menggunakan algoritma **Bcrypt** dengan salt rounds 10.
2. **Stateless JWT**: Sesi autentikasi menggunakan JSON Web Token dengan masa aktif **30 hari**.
3. **Password Recovery Mandiri**:
   - Jika pengguna lupa password, server menghasilkan kode numerik 6-digit acak dengan masa berlaku 15 menit.
   - Pengguna memasukkan kode 6-digit bersama password baru untuk mereset akun secara instan tanpa ketergantungan pihak ketiga.
