# 🐳 Docker Image Management Update

## Verbeteringen

### 1. Automatische Docker Image Downloads
- Het panel detecteert automatisch welke Docker images nodig zijn
- Images worden automatisch gedownload als ze niet lokaal beschikbaar zijn
- Geen handmatige image management meer nodig

### 2. Smart Image Mapping
Het panel map Pterodactyl yolk images naar beschikbare alternatieven:

| Pterodactyl Image | Alternative Image | Use Case |
|------------------|------------------|----------|
| `ghcr.io/pterodactyl/yolks:java_8` | `openjdk:8-jre-slim` | Legacy Minecraft |
| `ghcr.io/pterodactyl/yolks:java_11` | `openjdk:11-jre-slim` | Minecraft 1.17+ |
| `ghcr.io/pterodactyl/yolks:java_17` | `openjdk:17-jre-slim` | Modern Minecraft |
| `ghcr.io/pterodactyl/yolks:nodejs_18` | `node:18-alpine` | Node.js games |
| `ghcr.io/pterodactyl/yolks:python_3.11` | `python:3.11-slim` | Python games |
| `ghcr.io/parkervcp/steamcmd:proton` | `ubuntu:20.04` | Steam games |

### 3. Base Image Preloading
Bij het starten van het panel worden de meest gebruikte images automatisch gedownload:
- `node:18-alpine` - Voor Node.js games
- `openjdk:17-jre-slim` - Voor moderne Minecraft servers
- `openjdk:11-jre-slim` - Voor oudere Minecraft versies
- `python:3.11-slim` - Voor Python-based games
- `ubuntu:20.04` - Voor SteamCMD games

### 4. Setup Scripts
Nieuwe scripts voor het vooraf installeren van Docker images:
- `scripts/setup-docker-images.sh` - Linux/macOS bash script
- `scripts/setup-docker-images.ps1` - Windows PowerShell script

### 5. Verbeterde Error Handling
- Betere foutafhandeling bij missing images
- Automatische fallback naar alternatieve images
- Gedetailleerde logging van image operations

## Gevolg voor Gebruikers

### ✅ Wat werkt nu automatisch:
- Minecraft servers (alle Java versies)
- Node.js games 
- Python games
- Basis Linux games

### 🔄 Wat nog handmatig kan zijn:
- Specifieke SteamCMD games (ARK, CS2, etc.)
- Games met zeer specifieke dependencies

### 📈 Performance Verbeteringen:
- Snellere server creation na eerste image download
- Minder disk space usage door slimmere image keuze
- Betere failure recovery

## Gebruik

### Automatisch (Aanbevolen)
Gewoon servers aanmaken via de web interface - het panel doet de rest!

### Handmatig (Voor performance)
```bash
# Linux/macOS
./scripts/setup-docker-images.sh

# Windows PowerShell  
.\scripts\setup-docker-images.ps1
```

---

**Status: ✅ Gereed voor gebruik**

Het panel kan nu volledig automatisch alle benodigde Docker dependencies beheren!