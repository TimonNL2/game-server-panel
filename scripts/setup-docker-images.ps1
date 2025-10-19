# Game Panel Docker Image Setup Script for Windows
# This script pulls the most commonly used Docker images for game servers

Write-Host "🐳 Setting up Docker images for Game Panel..." -ForegroundColor Cyan

# Base images needed for different game types
$Images = @(
    "node:18-alpine",
    "eclipse-temurin:8-jre",
    "eclipse-temurin:11-jre", 
    "eclipse-temurin:17-jre",
    "python:3.11-slim",
    "ubuntu:20.04",
    "debian:bullseye-slim",
    "alpine:latest"
)

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Pull each image
foreach ($image in $Images) {
    Write-Host "📦 Pulling $image..." -ForegroundColor Yellow
    try {
        docker pull $image
        Write-Host "✅ Successfully pulled $image" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Failed to pull $image - continuing with next image" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎮 Docker image setup completed!" -ForegroundColor Green
Write-Host "📊 Current images:" -ForegroundColor Cyan
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

Write-Host ""
Write-Host "🚀 You can now start the Game Panel with full Docker support!" -ForegroundColor Green