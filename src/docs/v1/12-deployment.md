# Deployment Guide

This guide will help you deploy your CalmAPI application to production using either PM2 or Docker. Both methods are beginner-friendly and widely used in the industry.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Deploying with PM2](#deploying-with-pm2)
- [Deploying with Docker](#deploying-with-docker)
- [Environment Variables](#environment-variables)
- [Best Practices](#best-practices)

---

## Prerequisites

Before deploying your application, make sure you have:

1. **Node.js** installed (version 18 or higher recommended)
2. Your application tested and working locally
3. Environment variables configured properly
4. A server or hosting platform (VPS, EC2, DigitalOcean, etc.)

---

## Deploying with PM2

PM2 is a powerful process manager for Node.js applications. It keeps your app running, restarts it automatically if it crashes, and provides useful monitoring tools.

### Why Use PM2?

- ✅ Automatic application restarts on crashes
- ✅ Built-in load balancing
- ✅ Log management
- ✅ Zero-downtime deployments
- ✅ Process monitoring

### Installing PM2

First, install PM2 globally on your server:

```bash
npm install -g pm2
```

**📚 Official PM2 Documentation:** [https://pm2.keymetrics.io/docs/usage/quick-start/](https://pm2.keymetrics.io/docs/usage/quick-start/)

### Method 1: Direct PM2 Start (Quick & Simple)

This is the fastest way to get your app running with PM2:

```bash
pm2 start index.js --name "MY_AWESOME_API"
```

**Explanation:**
- `pm2 start` - Starts your application with PM2
- `index.js` - Your main entry file (replace with your actual entry point)
- `--name "MY_AWESOME_API"` - Gives your app a friendly name for easy identification

#### Useful PM2 Commands

```bash
# View all running applications
pm2 list

# View logs
pm2 logs MY_AWESOME_API

# View detailed info
pm2 show MY_AWESOME_API

# Restart your app
pm2 restart MY_AWESOME_API

# Stop your app
pm2 stop MY_AWESOME_API

# Delete from PM2
pm2 delete MY_AWESOME_API

# Monitor CPU and Memory
pm2 monit
```

#### Starting with Environment Variables

```bash
pm2 start index.js --name "MY_AWESOME_API" --env production
```

#### Running in Cluster Mode (Multiple Instances)

PM2 can run multiple instances of your app to handle more traffic:

```bash
pm2 start index.js --name "MY_AWESOME_API" -i max
```

The `-i max` flag starts as many instances as you have CPU cores.

### Method 2: Using PM2 Ecosystem File (Recommended for Production)

An ecosystem file gives you more control and makes deployments reproducible. It's a configuration file that defines how PM2 should run your app.

#### Step 1: Generate Ecosystem File

```bash
pm2 ecosystem
```

This creates a file named `ecosystem.config.js` in your project root.

#### Step 2: Configure Your Ecosystem File

Edit `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'calmapi-app',
      script: './index.js',
      instances: 'max', // or a specific number like 2, 4, etc.
      exec_mode: 'cluster', // enables load balancing
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        MONGODB_URI: 'mongodb://localhost:27017/calmapi',
        JWT_SECRET: 'dev-secret-key',
        JWT_EXPIRES_IN: '7d',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        MONGODB_URI: 'mongodb://admin:your-password@localhost:27017/calmapi?authSource=admin',
        JWT_SECRET: 'your-super-secret-production-key',
        JWT_EXPIRES_IN: '7d',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false, // set to true in development if you want auto-reload
    },
  ],
};
```

**Configuration Explained:**
- `name` - Your application name
- `script` - Entry point file
- `instances` - Number of instances to run ('max' uses all CPU cores)
- `exec_mode` - 'cluster' enables load balancing across instances
- `env` - Environment variables for development
- `env_production` - Environment variables for production
- `error_file` / `out_file` - Log file locations
- `autorestart` - Automatically restart if app crashes
- `max_memory_restart` - Restart if memory exceeds this limit

#### Step 3: Start with Ecosystem File

```bash
# Start in development mode
pm2 start ecosystem.config.js

# Start in production mode
pm2 start ecosystem.config.js --env production
```

#### Step 4: Save PM2 Configuration

Save the current PM2 process list so it restarts after server reboot:

```bash
pm2 save
```

#### Step 5: Setup Auto-Start on Server Reboot

Generate and configure startup script:

```bash
pm2 startup
```

Follow the instructions shown in the terminal (usually you need to run a command with sudo).

### PM2 with TypeScript

If you're using TypeScript, you have two options:

**Option 1: Compile first, then run**
```bash
npm run build
pm2 start dist/index.js --name "MY_AWESOME_API"
```

**Option 2: Use ts-node**
```bash
pm2 start index.ts --interpreter ./node_modules/.bin/ts-node --name "MY_AWESOME_API"
```

### Monitoring and Logs

PM2 provides excellent monitoring capabilities:

```bash
# Real-time monitoring
pm2 monit

# View logs (all apps)
pm2 logs

# View logs for specific app
pm2 logs MY_AWESOME_API

# Clear logs
pm2 flush

# View only errors
pm2 logs --err
```

### PM2 Plus (Optional)

For advanced monitoring, PM2 offers a cloud-based dashboard called PM2 Plus:

**📚 PM2 Plus:** [https://pm2.io/](https://pm2.io/)

```bash
pm2 plus
```

---

## Deploying with Docker

Docker packages your application with all its dependencies into a container, ensuring it runs consistently across different environments.

### Why Use Docker?

- ✅ Consistent environments (dev, staging, production)
- ✅ Easy to scale
- ✅ Isolated from host system
- ✅ Simple deployment and rollback
- ✅ Works anywhere Docker is supported

### Installing Docker

**📚 Official Docker Installation Guide:** [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)

**For Different Platforms:**
- **Windows:** [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **Mac:** [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Linux:** [Docker Engine for Linux](https://docs.docker.com/engine/install/)

### Installing Docker Compose

Docker Compose is included with Docker Desktop. For Linux:

```bash
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

**📚 Docker Compose Documentation:** [https://docs.docker.com/compose/](https://docs.docker.com/compose/)

### Method 1: Basic Docker Setup

#### Step 1: Create Dockerfile

Create a file named `Dockerfile` in your project root:

```dockerfile
# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port (CalmAPI default port)
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
```

**Dockerfile Explained:**
- `FROM node:18-alpine` - Uses lightweight Node.js 18 image
- `WORKDIR /app` - Sets the working directory inside container
- `COPY package*.json ./` - Copies package files first (for better caching)
- `RUN npm ci` - Installs dependencies (production only)
- `COPY . .` - Copies your application code
- `EXPOSE 3000` - Documents which port your app uses
- `CMD` - Command to run when container starts

#### Step 2: Create .dockerignore

Create `.dockerignore` file to exclude unnecessary files:

```
node_modules
npm-debug.log
.git
.gitignore
.env
.DS_Store
dist
coverage
*.md
```

#### Step 3: Build Docker Image

```bash
docker build -t my-awesome-api .
```

**Explanation:**
- `docker build` - Builds an image from Dockerfile
- `-t my-awesome-api` - Tags (names) your image
- `.` - Uses current directory as build context

For CalmAPI, you might name it:

```bash
docker build -t my-calmapi-app .
```

#### Step 4: Run Docker Container

```bash
docker run -d -p 8080:3000 --name my-api my-awesome-api
```

**Explanation:**
- `-d` - Runs container in detached mode (background)
- `-p 8080:3000` - Maps port 3000 in container to port 8080 on host
- `--name my-api` - Gives container a friendly name
- `my-awesome-api` - The image name we built

#### With Environment Variables (For CalmAPI)

```bash
docker run -d -p 3000:3000 \
  --name calmapi-app \
  -e NODE_ENV=production \
  -e MONGODB_URI=your_mongodb_uri \
  -e JWT_SECRET=your_jwt_secret \
  my-calmapi-app
```

Or use an env file:

```bash
docker run -d -p 3000:3000 \
  --name calmapi-app \
  --env-file .env.production \
  my-calmapi-app
```

### Method 2: Docker Compose (Recommended)

Docker Compose makes it easy to manage multi-container applications (e.g., your API + database).

#### Step 1: Create docker-compose.yml

Create `docker-compose.yml` in your project root:

```yaml
version: '3.8'

services:
  # Your CalmAPI Service
  api:
    build: .
    container_name: calmapi-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=mongodb://mongodb:27017/calmapi
      - JWT_SECRET=your-super-secret-jwt-key-change-this
      - JWT_EXPIRES_IN=7d
    depends_on:
      - mongodb
    volumes:
      - ./logs:/app/logs
    networks:
      - calmapi-network

  # MongoDB Database
  mongodb:
    image: mongo:7
    container_name: calmapi-mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=your-secure-password
      - MONGO_INITDB_DATABASE=calmapi
    volumes:
      - mongodb-data:/data/db
      - mongodb-config:/data/configdb
    networks:
      - calmapi-network
    ports:
      - "27017:27017"

  # Redis Cache (Optional - for sessions, caching, etc.)
  redis:
    image: redis:7-alpine
    container_name: calmapi-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - calmapi-network
    ports:
      - "6379:6379"

volumes:
  mongodb-data:
  mongodb-config:
  redis-data:

networks:
  calmapi-network:
    driver: bridge
```

**Docker Compose Explained:**
- `services` - Defines all containers to run
- `build: .` - Builds image from current directory's Dockerfile
- `restart: unless-stopped` - Automatically restart container unless you stop it manually
- `ports` - Maps container ports to host ports (format: `"host:container"`)
- `environment` - Sets environment variables
- `depends_on` - Ensures MongoDB starts before CalmAPI
- `volumes` - Persists MongoDB data and application logs
- `networks` - Allows containers to communicate with each other
- `MONGODB_URI` - Connection string pointing to the MongoDB container
- `mongodb-data` - Persists MongoDB database files
- `redis-data` - Persists Redis data for cache and sessions

#### Step 2: Run with Docker Compose

```bash
# Start all services (CalmAPI + MongoDB + Redis)
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes MongoDB data)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

### Production-Ready Dockerfile (Multi-Stage Build)

For better optimization, use a multi-stage build for CalmAPI:

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# If using TypeScript, uncomment:
# RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app .

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

USER nodejs

EXPOSE 3000

# Health check for CalmAPI
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
```

**Benefits:**
- Smaller final image size
- Only production dependencies included
- Runs as non-root user (more secure)

### Docker Compose with Environment File

Create `.env.production`:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:your-secure-password@mongodb:27017/calmapi?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
REDIS_URL=redis://redis:6379

# MongoDB credentials (used by MongoDB container)
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your-secure-password
MONGO_INITDB_DATABASE=calmapi
```

Update `docker-compose.yml`:

```yaml
services:
  api:
    build: .
    env_file:
      - .env.production
    # ... rest of configuration
```

### Useful Docker Commands

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# View logs
docker logs my-api

# Follow logs in real-time
docker logs -f my-api

# Execute command in running container
docker exec -it my-api sh

# Stop container
docker stop my-api

# Start stopped container
docker start my-api

# Remove container
docker rm my-api

# Remove image
docker rmi my-awesome-api

# View resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View running services
docker-compose ps

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart api

# Rebuild specific service
docker-compose build api

# Scale service (run multiple instances)
docker-compose up -d --scale api=3

# Execute command in service
docker-compose exec api sh
```

---

## Environment Variables

Never commit sensitive information to your repository. Use environment variables for configuration.

### For PM2

Create `.env` file:

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

Load with dotenv package:

```javascript
require('dotenv').config();
```

### For Docker

Use `--env-file` flag:

```bash
docker run --env-file .env.production my-awesome-api
```

Or in `docker-compose.yml`:

```yaml
services:
  api:
    env_file:
      - .env.production
```

---

## Best Practices

### General

1. **Use Environment Variables** - Never hardcode sensitive data
2. **Set up Logging** - Monitor your application's health
3. **Health Checks** - Implement `/health` endpoint
4. **Graceful Shutdown** - Handle SIGTERM/SIGINT signals properly
5. **Use HTTPS** - Always use SSL/TLS in production
6. **Set up Monitoring** - Use tools like PM2 Plus, DataDog, or New Relic

### PM2 Best Practices

1. **Use Ecosystem File** - Version control your PM2 configuration
2. **Enable Cluster Mode** - Utilize all CPU cores
3. **Set Memory Limits** - Prevent memory leaks from crashing server
4. **Configure Log Rotation** - Prevent log files from growing too large
5. **Save PM2 State** - Always run `pm2 save` after changes

### Docker Best Practices

1. **Use Multi-Stage Builds** - Keep images small
2. **Don't Run as Root** - Create and use non-root user
3. **Use .dockerignore** - Exclude unnecessary files
4. **Tag Images Properly** - Use semantic versioning
5. **Persist Data** - Use volumes for databases and important data
6. **Health Checks** - Add HEALTHCHECK to Dockerfile
7. **Resource Limits** - Set memory and CPU limits

### Sample Dockerfile with Health Check

```dockerfile
FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --only=production

COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
```

### Sample Health Check Endpoint

Add this to your CalmAPI application:

```javascript
// In your system/configs/routing.js
// After the `app.use(sanitizerMiddleware);` add the bellow block, (also don't forget to import mongoose at the top)

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
    });
  }
});

```

---

## Troubleshooting

### PM2 Issues

**App keeps crashing:**
```bash
# Check logs for errors
pm2 logs MY_AWESOME_API --err

# Check if port is already in use
lsof -i :3000
```

**Can't connect after server reboot:**
```bash
# Check if PM2 startup is configured
pm2 startup

# List saved processes
pm2 list
```

### Docker Issues

**Container exits immediately:**
```bash
# Check logs
docker logs my-api

# Run in foreground to see errors
docker run --rm my-awesome-api
```

**Can't connect to container:**
```bash
# Check if container is running
docker ps

# Check port mappings
docker port my-api

# Test from inside container
docker exec -it my-api sh
wget -O- http://localhost:3000/health
```

**Build fails:**
```bash
# Clear build cache
docker builder prune

# Build with no cache
docker build --no-cache -t my-awesome-api .
```

---

## Next Steps

After deploying your application:

1. **Set up a reverse proxy** (Nginx or Traefik)
2. **Configure SSL/TLS** (Let's Encrypt)
3. **Set up CI/CD** (GitHub Actions, GitLab CI)
4. **Monitor performance** (PM2 Plus, Prometheus, Grafana)
5. **Set up backups** (for databases and important data)
6. **Configure firewall** (UFW, iptables)
7. **Set up log aggregation** (ELK Stack, Loki)

---

## Additional Resources

### PM2
- **Official Documentation:** [https://pm2.keymetrics.io/](https://pm2.keymetrics.io/)
- **PM2 Plus:** [https://pm2.io/](https://pm2.io/)
- **PM2 GitHub:** [https://github.com/Unitech/pm2](https://github.com/Unitech/pm2)

### Docker
- **Official Documentation:** [https://docs.docker.com/](https://docs.docker.com/)
- **Docker Hub:** [https://hub.docker.com/](https://hub.docker.com/)
- **Docker Compose Docs:** [https://docs.docker.com/compose/](https://docs.docker.com/compose/)
- **Best Practices:** [https://docs.docker.com/develop/dev-best-practices/](https://docs.docker.com/develop/dev-best-practices/)

### General Deployment
- **Node.js Deployment Best Practices:** [https://nodejs.org/en/docs/guides/nodejs-docker-webapp/](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- **Digital Ocean Tutorials:** [https://www.digitalocean.com/community/tutorials](https://www.digitalocean.com/community/tutorials)

---

Happy Deploying! 🚀
