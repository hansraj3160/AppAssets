# AppAssets Studio — Production Deployment Guide 🚢

This guide covers deploying AppAssets Studio to cloud platforms, VPS, Docker, or running it as a team service.

---

## 🏗️ Architecture Overview

- **Frontend**: React 19 + Vite + Tailwind CSS (`studio/dist`).
- **Backend / Engine**: Bun / Node.js 20+ with `@napi-rs/canvas` for pixel-perfect hardware-accelerated screenshot framing, banner generation, and packaging.
- **Port**: Default is `4321` (configurable via `PORT` environment variable or `--port <number>` flag).
- **Health Check**: `GET /api/health` returns `{ status: "ok", service: "appassets-studio", uptimeSeconds: ..., timestamp: ... }`.

---

## 🐳 Option 1: Docker (Recommended for VPS / PaaS)

A multi-stage `Dockerfile` is included in the repository.

### 1. Build the Docker Image
```bash
docker build -t appassets-studio:latest .
```

### 2. Run the Container
```bash
docker run -d \
  --name appassets-studio \
  -p 4321:4321 \
  -v $(pwd)/out:/app/out \
  -e GEMINI_API_KEY="your-optional-gemini-key" \
  --restart unless-stopped \
  appassets-studio:latest
```

Access the studio at `http://localhost:4321`.

---

## ☁️ Option 2: Google Cloud Run / Railway / Render

### Cloud Run (Serverless Container)
1. Build and push the container image to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/appassets-studio
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy appassets-studio \
     --image gcr.io/YOUR_PROJECT_ID/appassets-studio \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 4321 \
     --memory 2Gi \
     --cpu 2
   ```

### Railway / Render
1. Connect your GitHub repository to Railway or Render.
2. Select **Docker** deployment (it will automatically detect `Dockerfile`).
3. Set Environment Variables:
   - `PORT`: `4321`
   - `GEMINI_API_KEY`: *(Optional, for AI Copywriting)*
4. Health check path: `/api/health`.

---

## 🖥️ Option 3: Self-Hosted Linux VPS (Systemd Service)

### 1. Prerequisites
Install Bun and native canvas dependencies on Ubuntu/Debian:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install native libraries for canvas rendering
sudo apt-get update && sudo apt-get install -y \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  librsvg2-2
```

### 2. Build the Project
```bash
git clone https://github.com/hansraj3160/AppAssets.git /opt/appassets
cd /opt/appassets
bun install
bun run build
```

### 3. Create a Systemd Service
Create `/etc/systemd/system/appassets.service`:
```ini
[Unit]
Description=AppAssets Studio Web Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/appassets
ExecStart=/root/.bun/bin/bun run dist/cli.js studio --no-open --port 4321
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=4321

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now appassets
```

---

## 🌐 Custom Domain & SSL Setup (When You Buy Your Domain)

Jab aap apna domain purchase karenge (e.g. `yourdomain.com` ya `studio.yourdomain.com`), deployment ko bind karna bohat aasan hai:

### Option A: PaaS (Railway / Render / Fly.io) — 1-Click SSL
1. Platform dashboard mein project ki **Settings ➔ Custom Domains** par jayein.
2. Apna domain enter karein (e.g. `studio.yourdomain.com`).
3. Apne DNS provider (Namecheap, GoDaddy, Cloudflare) par ja kar required **CNAME** ya **A Record** point kar dein.
4. SSL Certificate (HTTPS) automatically zero-configuration ke sath provision ho jayega.

### Option B: Self-Hosted VPS (Nginx + Let's Encrypt SSL)
1. **DNS Setup**: Apne domain provider par ek `A` record add karein jo aapki VPS IP par point kare:
   ```
   Type: A | Name: studio (ya @) | Value: <YOUR_VPS_PUBLIC_IP>
   ```
2. **Nginx Configuration**: Create `/etc/nginx/sites-available/appassets`:
   ```nginx
   server {
       server_name studio.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:4321;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           client_max_body_size 50M;
       }
   }
   ```
3. Enable the site and obtain free SSL via Certbot:
   ```bash
   sudo ln -s /etc/nginx/sites-available/appassets /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d studio.yourdomain.com
   ```

---

## 🤖 GitHub Actions CI/CD (`.github/workflows/ci.yml`)

Repository mein pre-configured continuous integration workflow shaamil hai jo har push aur pull request par execute hota hai:

1. **Quality Job**: Biome code linter aur TypeScript typechecks verify karta hai.
2. **Test Job**: Canvas native libraries install karke complete test suite (`bun test`, 100 tests including E2E dogfooding) run karta hai.
3. **Build Job**: Studio frontend (`studio/dist`) aur CLI core (`dist/`) compile karke as downloadable artifacts store karta hai.
4. **Docker Job**: Production Docker image build karta hai aur container launch karke `/api/health` probe verify karta hai.

Local par wahi complete CI check chalane ke liye:
```bash
bun run ci
```

---

## 🔒 Production Security & Rate Limiting

- **Rate Limiting**: Built-in in-memory rate limiting protects `/api/ai/generate-copy` (10 requests per 10 minutes per IP).
- **Reverse Proxy**: When running behind Nginx or Cloudflare, ensure headers `X-Forwarded-For` and `CF-Connecting-IP` are forwarded.

