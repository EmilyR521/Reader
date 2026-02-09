#!/bin/bash
# Debug script for Docker deployment issues

echo "🔍 Docker Debug Script for Reading List App"
echo "============================================"
echo ""

# Check if containers are running
echo "1. Checking container status..."
docker-compose ps
echo ""

# Check frontend container logs
echo "2. Frontend container logs (last 50 lines):"
echo "-------------------------------------------"
docker-compose logs --tail=50 frontend
echo ""

# Check backend container logs
echo "3. Backend container logs (last 50 lines):"
echo "-------------------------------------------"
docker-compose logs --tail=50 backend
echo ""

# Check if frontend container has index.html
echo "4. Checking frontend container files:"
echo "--------------------------------------"
docker-compose exec frontend ls -la /usr/share/nginx/html/ 2>/dev/null || echo "Container not running or exec failed"
echo ""

# Check nginx configuration
echo "5. Checking nginx configuration:"
echo "---------------------------------"
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo "Container not running or exec failed"
echo ""

# Test frontend health
echo "6. Testing frontend health endpoint:"
echo "-------------------------------------"
curl -s http://localhost/health || echo "Health check failed"
echo ""

# Test backend API
echo "7. Testing backend API:"
echo "-----------------------"
curl -s http://localhost:3000/api/users || echo "Backend API failed"
echo ""

echo "============================================"
echo "Debug complete!"
