#!/bin/bash

# Game Panel Setup - Run after basic installation
set -e

echo "🚀 Game Server Panel - Panel Setup"
echo "=================================="

# Check if Docker is working
if ! docker --version &> /dev/null; then
    echo "❌ Docker is niet beschikbaar!"
    echo "   Log uit en weer in, of herstart de server eerst"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo "❌ Docker permissions probleem!"
    echo "   Voer uit: sudo usermod -aG docker $USER"
    echo "   Log dan uit en weer in"
    exit 1
fi

echo "📥 Panel downloaden..."
if [ -d "/opt/game-panel" ]; then
    echo "⚠️  /opt/game-panel bestaat al"
    echo "Verwijderen? (y/N)"
    read -r REPLY
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo rm -rf /opt/game-panel
    else
        echo "Installatie gestopt"
        exit 1
    fi
fi

git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel
cd /opt/game-panel

echo "⚙️  Environment configureren..."
cp .env.example .env

# Auto-configure basic settings
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")
sed -i "s/your-server-ip/${SERVER_IP}/g" .env

echo "🐳 Panel starten..."
docker-compose pull
docker-compose up -d

echo ""
echo "🎉 Panel is gestart!"
echo ""
echo "📊 Status checken:"
docker-compose ps

echo ""
echo "🌐 Open in browser:"
echo "   Frontend: http://${SERVER_IP}:3000"
echo "   Backend:  http://${SERVER_IP}:3001/api/health"
echo ""
echo "📝 Logs bekijken:"
echo "   docker-compose logs -f"
echo ""
echo "🛠️  Environment aanpassen:"
echo "   nano /opt/game-panel/.env"
echo "   docker-compose restart"