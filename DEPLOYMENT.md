# Deployment Guide for Reading List App

This guide explains how to dockerize and deploy the Reading List app on a home server.

## Prerequisites

- Docker and Docker Compose installed on your server
- Basic knowledge of Docker and command line
- Port 80 (frontend) and 3000 (backend) available, or modify ports in docker-compose.yml

## Quick Start

1. **Clone or copy the project to your server**
   ```bash
   # If using git
   git clone <your-repo-url>
   cd Books
   
   # Or copy the entire project directory to your server
   ```

2. **Ensure your data directory exists and has your JSON files**
   ```bash
   ls data/  # Should show your user JSON files (Test.json, Em.json, etc.)
   ```

3. **Build and start the containers**
   ```bash
   docker-compose up -d --build
   ```

4. **Check if containers are running**
   ```bash
   docker-compose ps
   ```

5. **View logs if needed**
   ```bash
   docker-compose logs -f
   ```

6. **Access the app**
   - Open your browser and navigate to: `http://your-server-ip` or `http://localhost`
   - The frontend will be served on port 80
   - The backend API will be accessible at `http://your-server-ip/api`

## Architecture

The application consists of two Docker containers:

1. **Backend Container** (`reading-list-backend`)
   - Node.js/Express API server
   - Runs on port 3000 (internal)
   - Serves API endpoints at `/api/*`
   - Stores data in `./data` directory (persisted via volume)

2. **Frontend Container** (`reading-list-frontend`)
   - Nginx web server
   - Serves the built Angular application
   - Runs on port 80
   - Proxies API requests to backend container

## Configuration

### Changing Ports

If you need to use different ports, edit `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "8080:80"  # Change 8080 to your desired port

backend:
  ports:
    - "3001:3000"  # Change 3001 to your desired port
```

Then update `nginx.conf` to proxy to the correct backend port if needed.

### Data Persistence

The `data` directory is mounted as a volume, so your JSON files persist even if containers are removed. To backup:

```bash
# Backup data directory
tar -czf reading-list-backup-$(date +%Y%m%d).tar.gz data/

# Restore from backup
tar -xzf reading-list-backup-YYYYMMDD.tar.gz
```

## Maintenance

### Updating the Application

1. **Pull latest changes** (if using git)
   ```bash
   git pull
   ```

2. **Rebuild and restart containers**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stopping the Application

```bash
docker-compose down
```

### Restarting the Application

```bash
docker-compose restart
```

## Troubleshooting

### "Cannot GET /" Error

If you see "Cannot GET /" when accessing the frontend:

1. **Check if frontend container is running**
   ```bash
   docker-compose ps
   ```

2. **Check frontend logs for build errors**
   ```bash
   docker-compose logs frontend
   ```
   Look for errors during the build process or file copy operations.

3. **Verify files were built and copied correctly**
   ```bash
   docker-compose exec frontend ls -la /usr/share/nginx/html/
   ```
   You should see `index.html` and other Angular build files.

4. **Check nginx configuration**
   ```bash
   docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
   ```

5. **Rebuild the frontend container**
   ```bash
   docker-compose down
   docker-compose build --no-cache frontend
   docker-compose up -d
   ```

6. **Check nginx error logs**
   ```bash
   docker-compose exec frontend cat /var/log/nginx/error.log
   ```

### Containers won't start

1. **Check logs**
   ```bash
   docker-compose logs
   ```

2. **Check if ports are in use**
   ```bash
   # Linux/Mac
   lsof -i :80
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :80
   netstat -ano | findstr :3000
   ```

3. **Verify Docker is running**
   ```bash
   docker ps
   ```

### Using the Debug Script

A debug script is provided to help diagnose issues:
```bash
chmod +x docker-debug.sh
./docker-debug.sh
```

### Frontend can't connect to backend

1. **Check if backend is healthy**
   ```bash
   docker-compose ps
   # Backend should show "healthy" status
   ```

2. **Test backend directly**
   ```bash
   curl http://localhost:3000/api/users
   ```

3. **Check network connectivity**
   ```bash
   docker-compose exec frontend ping backend
   ```

### Data not persisting

1. **Check volume mount**
   ```bash
   docker-compose exec backend ls -la /app/data
   ```

2. **Verify data directory permissions**
   ```bash
   ls -la data/
   ```

## Production Considerations

### Security

1. **Use HTTPS**: Set up a reverse proxy (like Traefik or Nginx) with SSL certificates
2. **Firewall**: Only expose necessary ports
3. **Regular Updates**: Keep Docker images updated
4. **Backups**: Regularly backup the `data` directory

### Reverse Proxy Setup (Optional)

For HTTPS and better security, use a reverse proxy like Traefik or Nginx:

```yaml
# Example with Traefik labels in docker-compose.yml
frontend:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.reading-list.rule=Host(`reading-list.yourdomain.com`)"
    - "traefik.http.routers.reading-list.entrypoints=websecure"
    - "traefik.http.routers.reading-list.tls.certresolver=letsencrypt"
```

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Monitoring

### Health Checks

Both containers have health checks configured. Check status:

```bash
docker ps  # Shows health status
```

### Resource Usage

```bash
docker stats reading-list-backend reading-list-frontend
```

## Uninstalling

To completely remove the application:

```bash
# Stop and remove containers
docker-compose down

# Remove images (optional)
docker rmi reading-list-backend reading-list-frontend

# Remove data (WARNING: This deletes all your books!)
# rm -rf data/
```

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Verify configuration files
3. Check Docker and Docker Compose versions: `docker --version` and `docker-compose --version`
