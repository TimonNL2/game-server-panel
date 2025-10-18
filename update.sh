#!/bin/bash

# Quick Update Script voor Game Panel
cd /opt/game-panel

echo "🔄 Panel updaten..."

# Stop services
docker-compose down

# Pull updates (als git repo)
if [ -d ".git" ]; then
    git pull
fi

# Rebuild containers
docker-compose build

# Start services
docker-compose up -d

# Cleanup old images
docker image prune -f

echo "✅ Panel update voltooid!"
echo "📊 Status checken..."
docker-compose ps