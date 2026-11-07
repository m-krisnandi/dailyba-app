# Panduan Deployment Produksi — Dailyba

Panduan lengkap deployment **Dailyba** (Daily Balance & Wealth Tracker) ke VPS Ubuntu menggunakan **Docker Compose**, mengikuti arsitektur yang sama dengan **Pdfumi**.

---

## 🏗️ Pilihan Arsitektur Deployment

Terdapat dua skenario deployment yang didukung penuh:

### Skenario 1: Satu VPS Bersama Pdfumi (Sangat Direkomendasikan)
Jika Anda sudah memiliki VPS yang menjalankan **Pdfumi** (Caddy sudah aktif di port 80 & 443):

```text
Internet
   │
   ▼
Caddy Server (Pdfumi :80/:443)
   ├── pdfumi.com          → web (Next.js :3000)
   ├── api.pdfumi.com      → api (Spring Boot :8080)
   └── dailyba.pdfumi.com  → Dailyba Web (:3005) & API (:4005)
```

Dailyba cukup dijalankan dengan port internal (`3005` untuk Web dan `4005` untuk API), lalu Caddy milik Pdfumi bertindak sebagai reverse proxy + pengelola SSL otomatis.

---

### Skenario 2: Standalone VPS (VPS Mandiri Terpisah)
Jika Dailyba dideploy di VPS baru yang berdiri sendiri:

```text
Internet
   │
   ▼
Caddy Container (:80/:443)
   ├── /api/*  → api:4000 (Node.js + SQLite)
   └── /*      → web:3000 (Nginx + Next.js Static)
```

---

## 💻 Spesifikasi Minimal VPS

| Komponen | Rekomendasi |
|---|---|
| **RAM** | Minimal 1 GB (2 GB disarankan jika sharing dengan Pdfumi) |
| **CPU** | 1 vCPU |
| **OS** | Ubuntu 22.04 / 24.04 LTS |
| **Storage** | 20 GB SSD |
| **Kebutuhan** | Docker Engine & Docker Compose Plugin |

---

## 🌐 1. Persiapan DNS Subdomain

Sebelum menjalankan container di VPS, arahkan DNS domain:

1. Buka dashboard DNS provider Anda (Cloudflare / Namecheap / Niagahoster / dsb.).
2. Tambahkan **A Record**:
   - **Type**: `A`
   - **Name**: `dailyba` *(menjadi `dailyba.pdfumi.com`)*
   - **Target / IPv4**: Masukkan **IP Address VPS Anda**
   - **TTL**: Auto / 1 menit (Proxy status DNS-only jika menggunakan Caddy SSL)
3. Tunggu 1–5 menit hingga DNS mengarah ke IP VPS:
   ```bash
   ping dailyba.pdfumi.com
   ```

---

## 🚀 2. Langkah-Langkah Deploy di VPS

### Langkah 2.1: Clone Repository ke VPS
Login ke VPS via SSH, lalu clone repository:

```bash
# Pindah ke direktori aplikasi
cd /var/www  # atau di home user: cd ~

# Clone repository
git clone https://github.com/m-krisnandi/dailyba-app.git
cd dailyba-app
```

---

### Langkah 2.2: Konfigurasi File Environment (`.env`)
Salin file template environment ke `.env`:

```bash
cp deploy/.env.prod.example .env
nano .env
```

Sesuaikan isinya:
```env
# Domain yang digunakan
DOMAIN_NAME=dailyba.pdfumi.com
NEXT_PUBLIC_API_URL=https://dailyba.pdfumi.com

# Email untuk notifikasi SSL Let's Encrypt
ACME_EMAIL=admin@pdfumi.com

# Kunci rahasia JWT (Hasilkan string acak dengan perintah: openssl rand -hex 32)
JWT_SECRET=f9810842a49b92271da928db641c73adbb924f762d08a5413ac83789b5c32912

# Internal port
PORT=4000
```
Simpan dengan `Ctrl + O` lalu keluar dengan `Ctrl + X`.

---

### Langkah 2.3: Menjalankan Container

#### Opsi A: Jika Berbagi VPS dengan Pdfumi (Shared Caddy)
Jalankan service `api` dan `web` (tanpa menyalakan caddy internal):

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build api web
```

Lalu buka file `Caddyfile` milik **Pdfumi** di VPS Anda (misalnya di `/var/www/pdfumi/deploy/Caddyfile`):
```bash
nano /var/www/pdfumi/deploy/Caddyfile
```

Tambahkan blok berikut di bagian bawah:
```caddy
dailyba.pdfumi.com {
    encode zstd gzip

    # Route request /api/* ke Dailyba API
    handle /api/* {
        reverse_proxy 172.17.0.1:4005 {
            transport http {
                response_header_timeout 60s
            }
        }
    }

    # Route halaman web ke Dailyba Frontend
    handle {
        reverse_proxy 172.17.0.1:3005
    }
}
```

Reload Caddy milik Pdfumi agar konfigurasi baru aktif seketika:
```bash
cd /var/www/pdfumi
docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

#### Opsi B: Jika VPS Mandiri (Standalone)
Jika di VPS ini belum ada web server / Caddy lain:

```bash
docker compose -f docker-compose.prod.yml --profile standalone --env-file .env up -d --build
```
Caddy internal Dailyba akan otomatis meminta sertifikat SSL HTTPS ke Let's Encrypt untuk `dailyba.pdfumi.com` dan melayani port 80 & 443.

---

## 🔍 3. Verifikasi Status Deployment

Jalankan perintah berikut untuk memastikan semua container berjalan sehat:

```bash
# 1. Cek status container
docker compose -f docker-compose.prod.yml ps

# 2. Uji endpoint API Health
curl -fsS https://dailyba.pdfumi.com/api/health
# Response yang diharapkan: {"status":"ok","app":"Dailyba Sync Server",...}

# 3. Uji response HTTP Web
curl -I https://dailyba.pdfumi.com
# Response yang diharapkan: HTTP/2 200
```

---

## 💾 4. Setup Backup Database Otomatis (Cron Job)

Database Dailyba menggunakan SQLite WAL yang sangat ringan dan tersimpan di Docker volume `dailyba_data`.

Untuk mencadangkan database secara otomatis setiap jam 03:00 subuh:
1. Pastikan script backup memiliki izin eksekusi:
   ```bash
   chmod +x /var/www/dailyba-app/deploy/backup-db.sh
   ```
2. Buka crontab:
   ```bash
   crontab -e
   ```
3. Tambahkan baris berikut di baris paling bawah:
   ```cron
   0 3 * * * /var/www/dailyba-app/deploy/backup-db.sh >> /var/log/dailyba-backup.log 2>&1
   ```
Backup file terkompresi `.sqlite.gz` akan disimpan di `~/dailyba-backups/` dengan retensi otomatis 14 hari.

---

## 🔄 5. Cara Update / Re-deploy Versi Baru

Setiap kali ada pembaruan kode di GitHub:
```bash
cd /var/www/dailyba-app
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```
Perubahan akan langsung ter-build dan aktif dengan **zero-downtime**, sementara data pengguna di database SQLite tetap utuh dan aman.
