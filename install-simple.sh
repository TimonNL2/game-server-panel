#!/bin/bash

# Game Panel Simple Installer - Non-interactive version
set -e

echo "🎮 Game Server Panel - Eenvoudige Installatie"
echo "============================================="

# Basic checks
if [[ $EUID -eq 0 ]]; then
   echo "❌ Voer dit script niet uit als root!"
   exit 1
fi

if ! grep -q "Ubuntu" /etc/os-release; then
    echo "❌ Dit script is alleen voor Ubuntu!"
    exit 1
fi

echo "📦 Systeem updates..."
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

echo "📂 Directories maken..."
sudo mkdir -p /opt/game-panel
sudo chown -R $USER:$USER /opt/game-panel

echo "🔥 Firewall configureren..."
sudo ufw --force enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 3000/tcp    # Frontend
sudo ufw allow 3001/tcp    # Backend
sudo ufw allow 25565/tcp   # Minecraft default
echo "✅ Firewall geconfigureerd"

echo "🐳 Docker netwerk maken..."
docker network create game-panel-network 2>/dev/null || echo "Netwerk bestaat al"

echo ""
echo "🎉 Basis installatie voltooid!"
echo ""
echo "📋 Voltooi de installatie:"
echo "1. Log uit en weer in (of herstart) voor Docker permissions"
echo "2. Voer uit: curl -sSL https://raw.githubusercontent.com/TimonNL2/game-server-panel/main/setup-panel.sh | bash"
echo ""
echo "Of handmatig:"
echo "git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel"
echo "cd /opt/game-panel && cp .env.example .env && docker-compose up -d"