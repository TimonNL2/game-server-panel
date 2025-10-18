# Game Server Panel

Een moderne, gebruiksvriendelijke game server management panel vergelijkbaar met Pterodactyl. Gebouwd met Node.js, React en Docker voor eenvoudige installatie en beheer.

## 🚀 Features

- **🥚 Pterodactyl Egg Support**: Gebruik alle bestaande Pterodactyl eggs
- **🐳 Docker Containers**: Direct container management zonder nodes
- **⚡ Modern Web UI**: React frontend met Pterodactyl-achtige interface  
- **📊 Real-time Dashboard**: Live statistieken en monitoring
- **📝 Live Logs**: Real-time server logs via WebSocket
- **🌐 Port Management**: Eenvoudige poort configuratie zonder gedoe
- **📁 File Manager**: Beheer server bestanden direct vanuit de interface
- **🎮 Multi-game Support**: Minecraft, CS2, ARK, Valheim en meer
- **⚙️ Environment Variables**: Volledige configuratie controle

## 📋 Systeemvereisten

- Ubuntu Server 22.04 LTS (andere Linux distros werken waarschijnlijk ook)
- Minimaal 4GB RAM (8GB aanbevolen voor meerdere servers)
- 20GB+ vrije schijfruimte
- Docker & Docker Compose
- Node.js 18+ (voor development)

## 🛠️ Snelle Installatie

### Automatische installatie (Ubuntu 22.04):
```bash
curl -sSL https://raw.githubusercontent.com/TimonNL2/game-server-panel/main/install.sh | bash
```

### Handmatige installatie:

1. **Clone repository**:
```bash
git clone https://github.com/TimonNL2/game-server-panel.git /opt/game-panel
cd /opt/game-panel
```

2. **Configureer environment**:
```bash
cp .env.example .env
nano .env
```

3. **Start panel**:
```bash
docker-compose up -d
```

4. **Open in browser**:
   - Frontend: `http://your-server-ip:3000`
   - Backend API: `http://your-server-ip:3001`

## 🎮 Ondersteunde Games

| Game | Egg Support | Status |
|------|-------------|--------|
| Minecraft (Java) | ✅ Paper, Spigot, Forge, Fabric | Volledig |
| Minecraft (Bedrock) | ✅ Official, PocketMine | Volledig |
| Counter-Strike 2 | ✅ SteamCMD | Volledig |
| ARK: Survival | ✅ SteamCMD | Volledig |
| Valheim | ✅ SteamCMD | Volledig |
| Terraria | ✅ TShock | Volledig |
| Rust | ✅ SteamCMD | Volledig |
| DayZ | ✅ SteamCMD | Volledig |
| Custom Games | ✅ Generic eggs | Volledig |

En nog veel meer via de uitgebreide egg library!

## 📸 Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Server List  
![Server List](screenshots/servers.png)

### Server Console
![Console](screenshots/console.png)

### Create Server
![Create Server](screenshots/create.png)

## 🔧 Configuratie

### Environment Variables (.env)
```env
# Backend
NODE_ENV=production
PORT=3001
DOCKER_HOST=/var/run/docker.sock

# Database  
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-super-secret-key
PANEL_URL=http://your-domain.com

# Docker
DOCKER_NETWORK=game-panel-network
```

### Docker Compose
Het systeem draait volledig in Docker containers:
- **Frontend**: React app met Nginx
- **Backend**: Node.js API server  
- **Database**: Redis voor caching en sessions
- **Game Servers**: Dynamisch aangemaakte containers

## 🚀 Development

### Local development setup:
```bash
# Backend
cd panel-backend
npm install
npm run dev

# Frontend  
cd panel-frontend
npm install
npm start
```

### Project Structure:
```
game-panel/
├── panel-backend/          # Node.js API server
├── panel-frontend/         # React web interface
├── eggs/                   # Pterodactyl eggs library
├── server-data/           # Game server files
├── docker-configs/        # Docker configurations
├── docker-compose.yml     # Main deployment config
└── README.md
```

## 📚 API Documentation

### Server Management
- `GET /api/servers` - List all servers
- `POST /api/servers` - Create new server
- `GET /api/servers/:id` - Get server details
- `POST /api/servers/:id/start` - Start server
- `POST /api/servers/:id/stop` - Stop server
- `POST /api/servers/:id/restart` - Restart server
- `DELETE /api/servers/:id` - Delete server

### Egg Management  
- `GET /api/eggs` - List available eggs
- `GET /api/eggs/:category/:subcategory/:egg` - Get egg details

### File Management
- `GET /api/servers/:id/files` - Browse server files
- `POST /api/servers/:id/files` - Upload files
- `PUT /api/servers/:id/files` - Edit files

## 🔐 Beveiliging

- **Docker isolation**: Elke server draait in eigen container
- **User permissions**: Geen root access vereist
- **Firewall**: UFW configuratie included
- **SSL support**: Nginx reverse proxy met Let's Encrypt
- **Environment isolation**: Aparte netwerken per server

## 🔄 Updates & Onderhoud

### Panel updaten:
```bash
./update.sh
```

### Backup maken:
```bash  
./backup.sh
```

### Logs bekijken:
```bash
docker-compose logs -f
```

### Containers herstarten:
```bash
docker-compose restart
```

## 🐛 Troubleshooting

### Panel start niet
```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Restart services
docker-compose restart
```

### Servers maken geen containers
```bash
# Check Docker permissions
ls -la /var/run/docker.sock

# Fix permissions
sudo chmod 666 /var/run/docker.sock
```

### Poorten werken niet
```bash
# Check firewall
sudo ufw status

# Check port usage
sudo netstat -tlnp | grep :25565
```

## 📞 Support

- **GitHub Issues**: Voor bugs en feature requests
- **Documentation**: Zie `/docs` folder
- **Community**: Discord server link

## 🤝 Contributing

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/amazing-feature`)
3. Commit je changes (`git commit -m 'Add amazing feature'`)
4. Push naar branch (`git push origin feature/amazing-feature`)
5. Open een Pull Request

## 📄 License

Dit project is gelicenseerd onder de MIT License - zie [LICENSE](LICENSE) voor details.

## 🙏 Credits

- **Pterodactyl Panel**: Voor de inspiratie en egg system
- **Docker**: Voor containerization
- **React**: Voor de frontend framework
- **Node.js**: Voor de backend runtime

---

**Gemaakt met ❤️ door de community, voor de community**

**Happy gaming! 🎮**