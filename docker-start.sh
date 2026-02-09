#!/bin/bash
# Quick start script for Reading List Docker deployment

echo "🚀 Starting Reading List Application..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "⚠️  Data directory not found. Creating it..."
    mkdir -p data
fi

# Build and start containers
echo "📦 Building and starting containers..."
docker-compose up -d --build

# Wait a moment for containers to start
sleep 5

# Check container status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "✅ Application should be running!"
echo "🌐 Frontend: http://localhost"
echo "🔌 Backend API: http://localhost/api"
echo ""
echo "📝 View logs: docker-compose logs -f"
echo "🛑 Stop: docker-compose down"
