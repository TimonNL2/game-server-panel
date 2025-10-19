#!/bin/bash

# Game Panel Docker Image Setup Script
# This script pulls the most commonly used Docker images for game servers

echo "🐳 Setting up Docker images for Game Panel..."

# Base images needed for different game types
IMAGES=(
    "node:18-alpine"
    "eclipse-temurin:8-jre"
    "eclipse-temurin:11-jre" 
    "eclipse-temurin:17-jre"
    "python:3.11-slim"
    "ubuntu:20.04"
    "debian:bullseye-slim"
    "alpine:latest"
)

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Pull each image
for image in "${IMAGES[@]}"; do
    echo "📦 Pulling $image..."
    if docker pull "$image"; then
        echo "✅ Successfully pulled $image"
    else
        echo "⚠️ Failed to pull $image - continuing with next image"
    fi
done

echo ""
echo "🎮 Docker image setup completed!"
echo "📊 Current images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "🚀 You can now start the Game Panel with full Docker support!"