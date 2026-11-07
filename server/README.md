# Dailyba Cloud Sync REST API Server

Lightweight, high-performance Node.js & SQLite sync server for **Dailyba** (Daily Balance & Wealth Tracker).
Enables seamless real-time synchronization across **Android**, **iOS**, and **Web**, ensuring your financial records are never lost when changing devices.

---

## 🚀 Quick Start (Local Development)

From the project root:
```bash
# Run Next.js frontend (port 3001)
npm run dev

# Run Dailyba Sync Server (port 4000)
npm run server
```

The database will be automatically created at `server/dailyba.db` with SQLite WAL mode enabled for maximum speed and zero maintenance.

---

## 🌐 Deploying to VPS (`dailyba.pdfumi.com`)

### 1. Upload the `server/` directory to your VPS
```bash
scp -r server user@your-vps-ip:/var/www/dailyba-server
```

### 2. Install dependencies & run with PM2
```bash
cd /var/www/dailyba-server
npm install --production

# Install PM2 if you haven't already:
npm install -g pm2

# Start server daemon:
pm2 start index.js --name dailyba-server
pm2 save
pm2 startup
```

### 3. Nginx Reverse Proxy Configuration (`dailyba.pdfumi.com`)
Add this server block in `/etc/nginx/sites-available/dailyba.pdfumi.com`:

```nginx
server {
    server_name dailyba.pdfumi.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
    }
}
```

Enable SSL with Certbot:
```bash
certbot --nginx -d dailyba.pdfumi.com
```

---

## 🔒 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status and timestamp |
| `POST` | `/api/auth/register` | Create account (email, password, name) |
| `POST` | `/api/auth/login` | Login and receive 30-day JWT token |
| `POST` | `/api/auth/forgot-password` | Request 6-digit verification code |
| `POST` | `/api/auth/reset-password` | Verify OTP and set new password |
| `GET` | `/api/sync` | Fetch user cloud backup (Requires JWT) |
| `POST` | `/api/sync` | Save/update user cloud backup (Requires JWT) |
