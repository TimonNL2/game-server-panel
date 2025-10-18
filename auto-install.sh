#!/bin/bash

# Game Panel One-Command Installer - Volledig automatisch
set -e

echo "🎮 Game Server Panel - Automatische Installatie"
echo "==============================================="

# Basic checks
if [[ $EUID -eq 0 ]]; then
   echo "❌ Voer dit script niet uit als root!"
   echo "   Gebruik: curl -sSL https://raw.githubusercontent.com/TimonNL2/game-server-panel/main/auto-install.sh | bash"
   exit 1
fi

if ! grep -q "Ubuntu" /etc/os-release; then
    echo "❌ Dit script is alleen voor Ubuntu!"
    exit 1
fi

echo "🔍 Controleren wat er al geïnstalleerd is..."

# Check if we need to install Docker
NEED_REBOOT=false

echo "📦 Systeem updates..."
sudo apt update

echo "🐳 Docker controleren..."
if ! command -v docker &> /dev/null; then
    echo "📦 Docker installeren..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    NEED_REBOOT=true
    echo "✅ Docker geïnstalleerd"
else
    echo "✅ Docker is al geïnstalleerd"
fi

echo "🔧 Docker Compose controleren..."
if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
    sudo apt install docker-compose-plugin -y
    echo "✅ Docker Compose geïnstalleerd"
else
    echo "✅ Docker Compose is al geïnstalleerd"
fi

echo "📦 Git controleren..."
if ! command -v git &> /dev/null; then
    sudo apt install git -y
    echo "✅ Git geïnstalleerd"
else
    echo "✅ Git is al geïnstalleerd"
fi

echo "🔥 Firewall configureren..."
sudo ufw --force enable >/dev/null 2>&1 || true
sudo ufw allow 22/tcp >/dev/null 2>&1 || true      # SSH
sudo ufw allow 3000/tcp >/dev/null 2>&1 || true    # Frontend
sudo ufw allow 3001/tcp >/dev/null 2>&1 || true    # Backend
sudo ufw allow 25565/tcp >/dev/null 2>&1 || true   # Minecraft default
echo "✅ Firewall geconfigureerd"

# If Docker was just installed, we need to check permissions
if [ "$NEED_REBOOT" = true ]; then
    echo ""
    echo "⚠️  Docker is net geïnstalleerd."
    echo "🔄 Proberen Docker permissions te fixen..."
    
    # Try to fix permissions without reboot
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
    newgrp docker 2>/dev/null || true
fi

# Test if Docker is working
echo "🧪 Docker testen..."
if docker ps >/dev/null 2>&1; then
    echo "✅ Docker werkt!"
else
    echo "⚠️  Docker permissions probleem..."
    echo "🔧 Permissions fixen..."
    sudo chmod 666 /var/run/docker.sock
    
    if ! docker ps >/dev/null 2>&1; then
        echo "❌ Docker werkt nog steeds niet na permission fix"
        echo ""
        echo "🔄 Herstart nodig voor Docker permissions"
        echo "   Na herstart voer dit uit:"
        echo "   curl -sSL https://raw.githubusercontent.com/TimonNL2/game-server-panel/main/setup-panel.sh | bash"
        exit 1
    fi
fi

echo "🐳 Docker netwerk maken..."
docker network create game-panel-network 2>/dev/null || echo "✅ Netwerk bestaat al"

echo "📥 Panel downloaden..."
if [ -d "/opt/game-panel" ]; then
    echo "🔄 Bestaande installatie gevonden, vervangen..."
    sudo rm -rf /opt/game-panel
fi

sudo mkdir -p /opt/game-panel
sudo chown -R $USER:$USER /opt/game-panel
git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel
cd /opt/game-panel

echo "⚙️  Environment configureren..."
cp .env.example .env

# Auto-configure basic settings
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")
sed -i "s/your-server-ip/${SERVER_IP}/g" .env

echo "🥚 Pterodactyl eggs downloaden..."
if [ ! -d "eggs" ] || [ -z "$(ls -A eggs)" ]; then
    echo "📥 Downloaden van officiële Pterodactyl eggs..."
    git clone https://github.com/pterodactyl/eggs.git temp-eggs
    cp -r temp-eggs/* eggs/
    rm -rf temp-eggs
    echo "✅ Eggs geïnstalleerd"
else
    echo "✅ Eggs al aanwezig"
fi

echo "🐳 Panel starten..."
# Use docker compose (plugin) or docker-compose (standalone)
if docker compose version &> /dev/null; then
    echo "📋 Gebruik docker compose (plugin)"
    docker compose pull
    docker compose up -d
else
    echo "📋 Gebruik docker-compose (standalone)"
    docker-compose pull
    docker-compose up -d
fi

# Wait a moment for containers to start
echo "⏳ Wachten op containers..."
sleep 10

echo ""
echo "🎉 Panel installatie voltooid!"
echo ""
echo "📊 Container status:"
if docker compose version &> /dev/null; then
    docker compose ps
else
    docker-compose ps
fi

echo ""
echo "🌐 Panel openen:"
echo "   Frontend: http://${SERVER_IP}:3000"
echo "   Backend:  http://${SERVER_IP}:3001/api/health"
echo ""
echo "🛠️  Handige commando's:"
if docker compose version &> /dev/null; then
    echo "   Logs bekijken:     docker compose logs -f"
    echo "   Panel herstarten:  docker compose restart"
    echo "   Panel stoppen:     docker compose down"
    echo "   Panel updaten:     git pull && docker compose up -d --build"
else
    echo "   Logs bekijken:     docker-compose logs -f"
    echo "   Panel herstarten:  docker-compose restart"
    echo "   Panel stoppen:     docker-compose down"
    echo "   Panel updaten:     git pull && docker-compose up -d --build"
fi
echo ""
echo "📝 Environment aanpassen:"
echo "   nano /opt/game-panel/.env"
if docker compose version &> /dev/null; then
    echo "   docker compose restart"
else
    echo "   docker-compose restart"
fi
echo ""
echo "🎮 Je kunt nu servers maken via de web interface!"

# Test if panel is responding
echo ""
echo "🧪 Panel testen..."
sleep 5
if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Backend reageert!"
else
    echo "⚠️  Backend reageert nog niet, check logs:"
    echo "   docker-compose logs backend"
fi