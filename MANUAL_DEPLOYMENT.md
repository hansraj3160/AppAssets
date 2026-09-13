# AppAssets Studio — Manual Deployment & Server Guide 🛠️

A complete step-by-step guide to connecting, managing, updating, and deploying the AppAssets Studio application manually on your AWS EC2 production server.

---

## 📌 Server Details Quick Reference

| Item | Value |
| :--- | :--- |
| **Elastic IP (Static)** | `52.66.73.8` |
| **Public DNS** | `ec2-52-66-73-8.ap-south-1.compute.amazonaws.com` |
| **SSH User** | `ubuntu` |
| **SSH Key File** | `appassets-prod-key.pem` (must have `chmod 400`) |
| **Server App Path** | `/home/ubuntu/appassets` |
| **Systemd Service** | `appassets.service` (runs on internal port `4321`) |
| **Web Server / SSL** | Caddy `v2.11.4` (ports 80 & 443 with auto Let's Encrypt SSL) |
| **Production URLs** | [https://appassetstudio.com](https://appassetstudio.com) / [https://www.appassetstudio.com](https://www.appassetstudio.com) |

---

## 🚀 Step 1: SSH Login to EC2 Server

Open your local terminal (in the folder where your `appassets-prod-key.pem` key is saved):

```bash
# Set secure permissions on your key (only needed once)
chmod 400 appassets-prod-key.pem

# Connect to EC2
ssh -i "appassets-prod-key.pem" ubuntu@52.66.73.8
```

---

## 📂 Step 2: Navigate to the Project Directory

Once logged in to the server:

```bash
cd /home/ubuntu/appassets
```

---

## ⚡ Step 3: Manual Deployment (2 Ways)

### Option A: The 1-Command Shortcut (Recommended)
A pre-configured deployment script is already installed on the server that handles everything automatically:

```bash
bash scripts/deploy.sh
```
*This will install dependencies, rebuild studio & CLI, restart `appassets.service`, and verify the `/api/health` endpoint.*

---

### Option B: Step-by-Step Manual Execution
If you want to run each command manually:

```bash
# 1. Install root dependencies
bun install

# 2. Build Studio frontend
cd studio
bun install
bun run build
cd ..

# 3. Build CLI distribution
bun run build:cli

# 4. Restart the AppAssets background service
sudo systemctl restart appassets

# 5. Verify that the app is healthy
curl -s http://localhost:4321/api/health
```

---

## 💻 Syncing Code from Your Local Computer to EC2

If you made code changes on your local machine and want to upload them directly to the server without using Git:

Run this command **from your local Mac/computer terminal**:

```bash
rsync -avz \
  --exclude 'node_modules' \
  --exclude 'studio/node_modules' \
  --exclude '.git' \
  --exclude '*.pem' \
  -e "ssh -i appassets-prod-key.pem" \
  ./ ubuntu@52.66.73.8:/home/ubuntu/appassets/
```

After rsync finishes, SSH into the server and run `bash scripts/deploy.sh`.

---

## 🛠️ Server & Service Management Commands

### AppAssets Service (`appassets`)
```bash
# Check if app is running
sudo systemctl status appassets

# View real-time live application logs (press Ctrl+C to exit)
sudo journalctl -u appassets -f

# Restart application
sudo systemctl restart appassets

# Stop application
sudo systemctl stop appassets

# Start application
sudo systemctl start appassets
```

### Caddy Web Server & SSL (`caddy`)
```bash
# Check Caddy status
sudo systemctl status caddy

# View Caddy web server logs
sudo journalctl -u caddy -f

# Restart Caddy
sudo systemctl restart caddy

# Reload Caddy config without downtime
sudo systemctl reload caddy
```

### Server Resources & Health Checks
```bash
# Check RAM & Swap usage
free -h

# Check available hard disk space
df -h /

# Test live API health locally on the server
curl -s http://localhost:4321/api/health

# Test public website response
curl -sI https://appassetstudio.com
```

---

## 🔧 Troubleshooting

### 1. Website shows "502 Bad Gateway"
This means Caddy is running, but the AppAssets service is stopped or restarting:
```bash
# Check service status and error logs
sudo systemctl status appassets
sudo journalctl -u appassets -n 50 --no-pager

# Restart the service
sudo systemctl restart appassets
```

### 2. Service failed to start after manual edit
Make sure you ran `bun run build:studio` and `bun run build:cli`:
```bash
cd /home/ubuntu/appassets
cd studio && bun run build && cd ..
bun run build:cli
sudo systemctl restart appassets
```

### 3. SSH connection timed out or denied
Ensure your AWS Security Group allows Inbound traffic:
- **SSH (Port 22)**: from `0.0.0.0/0` (or your IP)
- **HTTP (Port 80)**: from `0.0.0.0/0`
- **HTTPS (Port 443)**: from `0.0.0.0/0`
