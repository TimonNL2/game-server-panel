#!/bin/bash

# GitHub Upload Helper Script
echo "🚀 Game Server Panel - GitHub Upload Helper"
echo "=========================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is niet geïnstalleerd!"
    echo "   Installeer git eerst: sudo apt install git"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Je bent niet in de game-panel directory!"
    echo "   Ga naar de juiste directory met: cd /pad/naar/game-panel"
    exit 1
fi

echo "📋 Volg deze stappen om je project naar GitHub te uploaden:"
echo ""
echo "1️⃣  Initialiseer git repository:"
echo "   git init"
echo ""
echo "2️⃣  Voeg bestanden toe:"
echo "   git add ."
echo ""
echo "3️⃣  Maak eerste commit:"
echo "   git commit -m \"Initial commit - Game Server Panel\""
echo ""
echo "4️⃣  Voeg GitHub remote toe (vervang USERNAME en REPO):"
echo "   git remote add origin https://github.com/USERNAME/REPO.git"
echo ""
echo "5️⃣  Push naar GitHub:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🎉 Na upload kun je installeren met:"
echo "   curl -sSL https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh | bash"
echo ""

read -p "Wil je automatisch git initialiseren? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Git repository initialiseren..."
    git init
    git add .
    git commit -m "Initial commit - Game Server Panel"
    echo "✅ Git repository klaar!"
    echo ""
    echo "📝 Voeg nu je GitHub remote toe:"
    echo "   git remote add origin https://github.com/JOUW-USERNAME/JOUW-REPO.git"
    echo "   git push -u origin main"
fi