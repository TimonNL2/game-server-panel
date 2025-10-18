#!/bin/bash

# Game Panel One-Click Installer
# Usage: curl -sSL https://raw.githubusercontent.com/USERNAME/REPO/main/quick-install.sh | bash

set -e

REPO_URL="https://github.com/TimonNL2/game-server-panel.git"
INSTALL_DIR="/opt/game-panel"

echo "🎮 Game Server Panel - One-Click Installer"
echo "=========================================="

# Run basic installation
echo "📦 Installing dependencies..."
curl -sSL https://raw.githubusercontent.com/TimonNL2/game-server-panel/main/install.sh | bash

echo "⏳ Waiting for reboot to complete Docker setup..."
echo "After reboot, run this command to complete installation:"
echo ""
echo "curl -sSL https://raw.githubusercontent.com/TimonNL2/game-server-panel/main/complete-install.sh | bash"
echo ""

# Create completion script
cat > /tmp/complete-install.sh << 'EOF'
#!/bin/bash
echo "🚀 Completing Game Panel installation..."

# Clone repository
sudo rm -rf /opt/game-panel 2>/dev/null || true
sudo git clone REPO_URL_PLACEHOLDER /opt/game-panel
sudo chown -R $USER:$USER /opt/game-panel
cd /opt/game-panel

# Setup environment
cp .env.example .env
echo "⚙️  Please configure .env file:"
echo "nano .env"
echo ""
echo "Then start with:"
echo "docker-compose up -d"
EOF

# Replace placeholder with actual repo URL
sed -i "s|REPO_URL_PLACEHOLDER|$REPO_URL|g" /tmp/complete-install.sh
sudo mv /tmp/complete-install.sh /usr/local/bin/complete-game-panel-install
sudo chmod +x /usr/local/bin/complete-game-panel-install

echo "✅ Installation prepared!"
echo "🔄 System will reboot now..."
echo "After reboot, run: complete-game-panel-install"