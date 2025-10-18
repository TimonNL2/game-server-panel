# Game Server Panel - Installatie Guide

Een moderne game server management panel vergelijkbaar met Pterodactyl, maar eenvoudiger en zonder nodes.

## Functies

- ✅ **Egg Support**: Gebruik alle Pterodactyl eggs
- ✅ **Docker Containers**: Directe container management zonder nodes
- ✅ **Modern Web UI**: React frontend met Pterodactyl-achtige interface
- ✅ **Real-time Logs**: Live server logs via WebSocket
- ✅ **Port Management**: Eenvoudige poort configuratie
- ✅ **File Manager**: Beheer server bestanden
- ✅ **Multi-game Support**: Minecraft, CS2, ARK, en meer

## Systeemvereisten

- Ubuntu Server 22.04 LTS
- Minimaal 4GB RAM
- 20GB vrije schijfruimte
- Docker & Docker Compose
- Node.js 18+

## Stap 1: Server Voorbereiding

### Update systeem
```bash
sudo apt update && sudo apt upgrade -y
```

### Installeer Docker
```bash
# Docker installeren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Gebruiker toevoegen aan docker groep
sudo usermod -aG docker $USER

# Docker Compose installeren
sudo apt install docker-compose-plugin -y

# Herstarten om groep wijzigingen toe te passen
sudo reboot
```

### Installeer Node.js (voor development)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Installeer Git
```bash
sudo apt install git -y
```

## Stap 2: Panel Installatie

### Clone project
```bash
cd /opt
sudo git clone <jouw-git-repo> game-panel
sudo chown -R $USER:$USER /opt/game-panel
cd /opt/game-panel
```

### Kopieer eggs (als je ze al hebt)
```bash
# Als je de eggs folder al hebt
cp -r /path/to/eggs ./eggs
```

### Of download fresh eggs
```bash
git clone https://github.com/pelican-eggs/games.git eggs/games
git clone https://github.com/pelican-eggs/minecraft.git eggs/minecraft
git clone https://github.com/pelican-eggs/generic.git eggs/generic
```

### Maak directrories aan
```bash
mkdir -p server-data docker-configs logs
sudo chown -R $USER:docker server-data
sudo chown -R $USER:docker docker-configs
```

## Stap 3: Configuratie

### Environment variabelen
```bash
cp .env.example .env
nano .env
```

Configureer:
```env
# Backend
NODE_ENV=production
PORT=3001
DOCKER_HOST=/var/run/docker.sock

# Database
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=genereer-een-secure-secret-hier
PANEL_URL=http://jouw-server-ip:3000

# Docker netwerk
DOCKER_NETWORK=game-panel-network
```

### Docker netwerk aanmaken
```bash
docker network create game-panel-network
```

## Stap 4: Panel Starten

### Build en start services
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Logs bekijken
```bash
# Alle logs
docker-compose logs -f

# Alleen backend
docker-compose logs -f game-panel-backend

# Alleen frontend
docker-compose logs -f game-panel-frontend
```

## Stap 5: Eerste Server Maken

1. Open browser naar `http://jouw-server-ip:3000`
2. Ga naar "Create Server"
3. Kies een game type (bijv. Minecraft Paper)
4. Configureer:
   - **Server naam**: "Mijn Minecraft Server"
   - **Memory**: 2048 MB
   - **Poorten**: 25565 → 25565
   - **Minecraft versie**: latest
5. Klik "Server Maken"

## Stap 6: Firewall Configuratie

### UFW firewall regels
```bash
# Basic firewall
sudo ufw enable

# Panel toegang
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# SSH
sudo ufw allow 22/tcp

# Game server poorten (pas aan voor jouw games)
sudo ufw allow 25565/tcp  # Minecraft
sudo ufw allow 27015/tcp  # CS2
sudo ufw allow 7777/udp   # ARK
sudo ufw allow 2456/udp   # Valheim

# Check status
sudo ufw status
```

## Stap 7: SSL/HTTPS (Optioneel)

### Nginx installeren
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### Nginx configuratie
```bash
sudo nano /etc/nginx/sites-available/game-panel
```

```nginx
server {
    listen 80;
    server_name jouw-domein.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Activeer site
```bash
sudo ln -s /etc/nginx/sites-available/game-panel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL certificaat
```bash
sudo certbot --nginx -d jouw-domein.com
```

## Stap 8: Automatische Updates

### Update script maken
```bash
nano /opt/game-panel/update.sh
```

```bash
#!/bin/bash
cd /opt/game-panel

# Pull updates
git pull

# Rebuild containers
docker-compose build
docker-compose up -d

# Cleanup old images
docker image prune -f

echo "Panel updated successfully!"
```

```bash
chmod +x /opt/game-panel/update.sh
```

### Cron job voor updates
```bash
sudo crontab -e
```

Voeg toe:
```cron
# Update panel elke zondag om 3:00
0 3 * * 0 /opt/game-panel/update.sh >> /var/log/panel-update.log 2>&1
```

## Stap 9: Backup Script

### Backup script
```bash
nano /opt/game-panel/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/game-panel"

mkdir -p $BACKUP_DIR

# Backup server data
tar -czf "$BACKUP_DIR/server-data-$DATE.tar.gz" -C /opt/game-panel server-data

# Backup configurations
tar -czf "$BACKUP_DIR/config-$DATE.tar.gz" -C /opt/game-panel docker-compose.yml .env

# Keep only last 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /opt/game-panel/backup.sh
```

### Dagelijkse backup
```bash
sudo crontab -e
```

```cron
# Backup every day at 2:00 AM
0 2 * * * /opt/game-panel/backup.sh >> /var/log/panel-backup.log 2>&1
```

## Troubleshooting

### Panel start niet
```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check docker status
sudo systemctl status docker
```

### Server maakt geen containers aan
```bash
# Check docker socket permissions
ls -la /var/run/docker.sock

# Fix permissions
sudo chmod 666 /var/run/docker.sock
```

### Poorten werken niet
```bash
# Check firewall
sudo ufw status

# Check of poort in gebruik is
sudo netstat -tlnp | grep :25565

# Check docker port mapping
docker ps
```

### Memory problemen
```bash
# Check memory usage
free -h

# Check container memory
docker stats

# Restart container
docker-compose restart game-panel-backend
```

## Onderhoud

### Logs opschonen
```bash
# Truncate docker logs
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log

# Restart containers
docker-compose restart
```

### Update eggs
```bash
cd /opt/game-panel/eggs
git pull
```

### Container resources monitoren
```bash
# Real-time stats
docker stats

# Memory usage per container
docker system df
```

## Beveiliging Tips

1. **Firewall**: Alleen noodzakelijke poorten open
2. **Updates**: Regelmatig systeem updates
3. **Backups**: Dagelijks backup schema
4. **SSL**: Gebruik HTTPS voor productie
5. **User permissions**: Geen root access voor panel
6. **Docker security**: Gebruik non-root containers waar mogelijk

## Support

Voor vragen en problemen:
- Check logs: `docker-compose logs`
- Check GitHub issues
- Ubuntu Server docs: https://ubuntu.com/server/docs

---

**Succes met je Game Server Panel! 🎮**