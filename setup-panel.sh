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
    
    # Check if it looks like our panel
    if [ -f "/opt/game-panel/docker-compose.yml" ]; then
        echo "🔄 Bestaande installatie gevonden, updaten..."
        cd /opt/game-panel
        
        # Stop running containers
        $DOCKER_COMPOSE down 2>/dev/null || true
        
        # Pull latest changes
        git pull origin main 2>/dev/null || {
            echo "⚠️  Git pull mislukt, directory opnieuw maken..."
            cd /
            sudo rm -rf /opt/game-panel
            git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel
            cd /opt/game-panel
        }
    else
        echo "📁 Directory bestaat maar is geen panel installatie"
        echo "🗑️  Directory verwijderen en opnieuw installeren..."
        sudo rm -rf /opt/game-panel
        git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel
        cd /opt/game-panel
    fi
else
    git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel
    cd /opt/game-panel
fi

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
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

$DOCKER_COMPOSE pull
# Start the panel
echo "📦 Starting Game Server Panel..."
if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

echo ""
echo "🎉 Panel is gestart!"
echo ""
echo "📊 Status checken:"
$DOCKER_COMPOSE ps

echo ""
echo "🌐 Open in browser:"
echo "   Frontend: http://${SERVER_IP}:3000"
echo "   Backend:  http://${SERVER_IP}:3001/api/health"
echo ""
echo "📝 Logs bekijken:"
echo "   $DOCKER_COMPOSE logs -f"
echo ""
echo "🛠️  Environment aanpassen:"
echo "   nano /opt/game-panel/.env"
echo "   $DOCKER_COMPOSE restart"