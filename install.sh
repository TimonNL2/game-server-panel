#!/bin/bash

# Game Panel Quick Start Script voor Ubuntu Server 22.04
# Voer uit: curl -sSL https://raw.githubusercontent.com/TimonNL2/game-server-panel/main/install.sh | bash

set -e

echo "🎮 Game Server Panel Installatie"
echo "==============================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Voer dit script niet uit als root!"
   echo "   Gebruik: bash install.sh"
   exit 1
fi

# Check Ubuntu version
if ! grep -q "Ubuntu" /etc/os-release; then
    echo "❌ Dit script is alleen voor Ubuntu!"
    echo "   Je draait: $(lsb_release -d 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME)"
    exit 1
fi

if ! grep -q -E "(20.04|22.04|24.04)" /etc/os-release; then
    echo "⚠️  Waarschuwing: Dit script is getest op Ubuntu 20.04, 22.04 en 24.04"
    echo "   Je versie: $(lsb_release -r 2>/dev/null | cut -f2 || grep VERSION_ID /etc/os-release | cut -d'"' -f2)"
    echo "   Het script kan mogelijk nog steeds werken."
    echo ""
    echo "Wil je doorgaan? (y/N)"
    read -r REPLY
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installatie geannuleerd."
        exit 1
    fi
fi

echo "📦 Systeem updates installeren..."
sudo apt update && sudo apt upgrade -y

echo "🐳 Docker installeren..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker geïnstalleerd"
else
    echo "✅ Docker is al geïnstalleerd"
fi

echo "🔧 Docker Compose installeren..."
if ! command -v docker-compose &> /dev/null; then
    sudo apt install docker-compose-plugin -y
    echo "✅ Docker Compose geïnstalleerd"
else
    echo "✅ Docker Compose is al geïnstalleerd"
fi

echo "📦 Node.js installeren..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js geïnstalleerd"
else
    echo "✅ Node.js is al geïnstalleerd"
fi

echo "📁 Git installeren..."
if ! command -v git &> /dev/null; then
    sudo apt install git -y
    echo "✅ Git geïnstalleerd"
else
    echo "✅ Git is al geïnstalleerd"
fi

echo "📂 Panel directories maken..."
sudo mkdir -p /opt/game-panel
sudo chown -R $USER:$USER /opt/game-panel

echo "🔥 UFW Firewall configureren..."
sudo ufw --force enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 3000/tcp    # Frontend
sudo ufw allow 3001/tcp    # Backend
sudo ufw allow 25565/tcp   # Minecraft
echo "✅ Firewall geconfigureerd"

echo "🐳 Docker netwerk maken..."
docker network create game-panel-network 2>/dev/null || echo "Netwerk bestaat al"

echo ""
echo "🎉 Basis installatie voltooid!"
echo ""
echo "📋 Volgende stappen:"
echo "1. Log uit en weer in (of reboot) voor Docker permissions"
echo "2. Clone je panel code naar /opt/game-panel"
echo "3. Configureer .env bestand"
echo "4. Start panel met: docker-compose up -d"
echo ""
echo "📖 Zie README.md voor gedetailleerde instructies"

echo ""
echo "🔄 Wil je nu herstarten om de installatie te voltooien?"
echo "Na herstart kun je het panel installeren met:"
echo "git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel"
echo "cd /opt/game-panel && cp .env.example .env && docker-compose up -d"
echo ""
echo "Herstart nu? (y/N)"
read -r REPLY
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Systeem herstart..."
    sudo reboot
else
    echo "✅ Installatie voltooid!"
    echo "⚠️  Log uit en weer in voor Docker permissions, of herstart handmatig"
    echo ""
    echo "📋 Volgende stappen:"
    echo "1. Log uit en weer in (of herstart)"
    echo "2. git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel"
    echo "3. cd /opt/game-panel"
    echo "4. cp .env.example .env && nano .env"
    echo "5. docker-compose up -d"
fi