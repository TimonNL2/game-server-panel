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
if ! grep -q "22.04" /etc/os-release; then
    echo "⚠️  Waarschuwing: Dit script is getest op Ubuntu 22.04"
    read -p "Doorgaan? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
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
read -p "Herstart nu? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Systeem herstart..."
    sudo reboot
fi