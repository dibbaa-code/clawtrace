#!/bin/bash
# clawtrace auto-setup script
# Detects OpenClaw, finds gateway port & token, deploys clawtrace
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

echo ""
echo -e "${CYAN}  clawtrace setup${NC}"
echo -e "${DIM}  ─────────────────${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}  Docker not found. Install Docker first.${NC}"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}  Docker Compose not found. Install Docker Compose first.${NC}"
  exit 1
fi

# Find OpenClaw container
OPENCLAW_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i openclaw | head -1)

if [ -z "$OPENCLAW_CONTAINER" ]; then
  echo -e "${RED}  No running OpenClaw container found.${NC}"
  echo -e "${YELLOW}  Start OpenClaw first, then run this script again.${NC}"
  exit 1
fi

echo -e "${GREEN}  Found:${NC} ${OPENCLAW_CONTAINER}"

# Get host-mapped port
PORT=$(docker ps --format '{{.Ports}}' --filter "name=${OPENCLAW_CONTAINER}" | grep -o '0\.0\.0\.0:[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$PORT" ]; then
  echo -e "${RED}  Could not detect gateway port.${NC}"
  echo -e "${YELLOW}  Run: docker ps --format '{{.Names}}  {{.Ports}}'${NC}"
  exit 1
fi

echo -e "${GREEN}  Port:${NC}  ${PORT}"

# Get token from container config
TOKEN=""

# Try /data/.openclaw/openclaw.json first (Hostinger/Docker setup)
CONFIG=$(docker exec "$OPENCLAW_CONTAINER" cat /data/.openclaw/openclaw.json 2>/dev/null || true)

if [ -z "$CONFIG" ]; then
  # Try ~/.openclaw/openclaw.json
  CONFIG=$(docker exec "$OPENCLAW_CONTAINER" cat /root/.openclaw/openclaw.json 2>/dev/null || true)
fi

if [ -n "$CONFIG" ]; then
  TOKEN=$(echo "$CONFIG" | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
fi

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}  Could not auto-detect token.${NC}"
  echo -n "  Enter gateway token: "
  read -r TOKEN
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}  Token is required.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}  Token:${NC} ${TOKEN:0:8}..."

# Create directory
INSTALL_DIR="$HOME/clawtrace"
mkdir -p "$INSTALL_DIR"

# Write docker-compose.yml
cat > "$INSTALL_DIR/docker-compose.yml" << EOF
services:
  clawtrace:
    build: https://github.com/dibbaa-code/clawtrace.git
    network_mode: host
    environment:
      - CLAWDBOT_API_TOKEN=${TOKEN}
      - CLAWDBOT_URL=ws://127.0.0.1:${PORT}
    volumes:
      - ~/.openclaw/workspace:/root/.openclaw/workspace
    restart: unless-stopped
EOF

echo ""
echo -e "${GREEN}  Config written to ${INSTALL_DIR}/docker-compose.yml${NC}"
echo ""
echo -e "${CYAN}  Building & starting clawtrace...${NC}"
echo ""

cd "$INSTALL_DIR"
docker compose up -d --build

# Get machine IP
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || curl -s ifconfig.me 2>/dev/null || echo "localhost")

echo ""
echo -e "${GREEN}  clawtrace is running!${NC}"
echo ""
echo -e "  ${CYAN}Open:${NC} http://${IP}:3000/monitor"
echo ""
