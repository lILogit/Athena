#!/bin/bash

# KGS VPS Setup Script for Hostinger
# Run this script on your VPS to prepare for Docker deployments

set -e

echo "=== KGS VPS Setup Script ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# App directory
APP_DIR=${1:-/opt/kgs}

echo -e "${YELLOW}Setting up KGS in: $APP_DIR${NC}"
echo ""

# Update system
echo -e "${GREEN}Updating system packages...${NC}"
apt-get update && apt-get upgrade -y

# Install required packages
echo -e "${GREEN}Installing required packages...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo -e "${YELLOW}Docker is already installed${NC}"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${YELLOW}Docker Compose is already installed${NC}"
fi

# Create app directory
echo -e "${GREEN}Creating application directory...${NC}"
mkdir -p $APP_DIR/data
mkdir -p $APP_DIR/ssl

# Create a non-root user for the app (if not exists)
if ! id "kgs" &>/dev/null; then
    echo -e "${GREEN}Creating kgs user...${NC}"
    useradd -r -s /bin/false kgs
    usermod -aG docker kgs
fi

# Set permissions
chown -R kgs:kgs $APP_DIR

# Configure firewall
echo -e "${GREEN}Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # App port
ufw --force enable

# Configure fail2ban
echo -e "${GREEN}Configuring fail2ban...${NC}"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Create environment file template
echo -e "${GREEN}Creating environment file template...${NC}"
cat > $APP_DIR/.env << 'EOF'
# KGS Environment Configuration
NODE_ENV=production
PORT=3000

# Anthropic API Key (REQUIRED - Add your key here)
ANTHROPIC_API_KEY=

# Frontend URL for CORS
FRONTEND_URL=https://your-domain.com

# Database path
DATABASE_PATH=/app/data/kgs.db
EOF

# Create docker-compose file
echo -e "${GREEN}Creating docker-compose file...${NC}"
cat > $APP_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    image: ghcr.io/YOUR_GITHUB_USERNAME/kgs:latest
    container_name: kgs-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# Create update script
echo -e "${GREEN}Creating update script...${NC}"
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
cd /opt/kgs
docker-compose pull
docker-compose up -d
docker image prune -af --filter "until=24h"
echo "Update complete!"
EOF
chmod +x $APP_DIR/update.sh

# Print summary
echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Edit $APP_DIR/.env and add your ANTHROPIC_API_KEY"
echo "2. Update $APP_DIR/docker-compose.yml with your GitHub username"
echo "3. Set up GitHub Secrets in your repository:"
echo "   - VPS_HOST: Your VPS IP address"
echo "   - VPS_USERNAME: root (or your SSH user)"
echo "   - VPS_SSH_KEY: Your private SSH key"
echo "   - VPS_PORT: 22 (or your SSH port)"
echo "   - APP_DIR: $APP_DIR"
echo "   - ANTHROPIC_API_KEY: Your Anthropic API key"
echo "   - FRONTEND_URL: Your domain URL"
echo ""
echo "To manually deploy:"
echo "  cd $APP_DIR && ./update.sh"
echo ""
echo -e "${YELLOW}Remember to configure your domain DNS to point to this server!${NC}"
