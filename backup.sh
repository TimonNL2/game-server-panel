#!/bin/bash

# Backup Script voor Game Panel
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/game-panel"

echo "💾 Backup starten..."

# Maak backup directory
mkdir -p $BACKUP_DIR

# Backup server data
if [ -d "/opt/game-panel/server-data" ]; then
    echo "📁 Server data backup..."
    tar -czf "$BACKUP_DIR/server-data-$DATE.tar.gz" -C /opt/game-panel server-data
    echo "✅ Server data backed up"
fi

# Backup configurations
echo "⚙️  Configuratie backup..."
tar -czf "$BACKUP_DIR/config-$DATE.tar.gz" -C /opt/game-panel docker-compose.yml .env eggs 2>/dev/null || true

# Backup database (Redis)
echo "🗄️  Database backup..."
docker exec game-panel-redis redis-cli BGSAVE 2>/dev/null || echo "Redis backup overgeslagen"

# Verwijder oude backups (ouder dan 7 dagen)
echo "🧹 Oude backups opschonen..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

# Toon backup grootte
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo "✅ Backup voltooid!"
echo "📊 Backup grootte: $BACKUP_SIZE"
echo "📁 Locatie: $BACKUP_DIR"

# Lijst recente backups
echo "📋 Recente backups:"
ls -lht $BACKUP_DIR/*.tar.gz 2>/dev/null | head -5 || echo "Geen backups gevonden"