# Multi-stage Dockerfile for ACI Frontend
# Stage 1: Build the React/Vite application
# Stage 2: Serve with nginx

###############################################################################
# Stage 1: Builder
###############################################################################
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies (using npm install due to peer dependency warnings)
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy source code
COPY . .

# Build arguments for environment configuration
ARG VITE_API_URL=http://aci-backend:80
ARG VITE_ENABLE_MSW=false

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ENABLE_MSW=${VITE_ENABLE_MSW}

# Build the application
RUN npm run build

###############################################################################
# Stage 2: Production
###############################################################################
FROM nginx:alpine

# Install envsubst for runtime environment variable substitution
RUN apk add --no-cache bash

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY <<'EOF' /etc/nginx/conf.d/app.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (optional - can be used if backend is not on same ingress)
    location /api/ {
        proxy_pass http://aci-backend:80/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create runtime config script for environment variables
COPY <<'EOF' /docker-entrypoint.d/40-inject-env.sh
#!/bin/sh
set -e

# Create runtime config with environment variables
# BACKEND_URL should be the externally accessible backend URL (e.g., http://129.153.33.152:8080/v1)
# If not set, defaults to /api/v1 for nginx proxy
cat > /usr/share/nginx/html/config.js << JSEOF
window.__RUNTIME_CONFIG__ = {
  API_URL: "${BACKEND_URL:-/api/v1}",
  ENVIRONMENT: "${NODE_ENV:-production}"
};
JSEOF

echo "Runtime config injected with API_URL: ${BACKEND_URL:-/api/v1}"
EOF

RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Labels
LABEL org.opencontainers.image.title="ACI Frontend" \
      org.opencontainers.image.description="ACI Frontend React Application" \
      org.opencontainers.image.vendor="ACI Platform"

###############################################################################
# Build Instructions:
###############################################################################
#
# 1. Build locally:
#    docker build -t aci-frontend:latest .
#
# 2. Build for minikube:
#    eval $(minikube docker-env)
#    docker build -t aci-frontend:latest .
#
# 3. Build for kind:
#    docker build -t aci-frontend:latest .
#    kind load docker-image aci-frontend:latest --name <cluster-name>
#
# 4. Run locally with nginx proxy (backend on same network):
#    docker run -p 3000:80 aci-frontend:latest
#
# 5. Run with external backend URL (production):
#    docker run -p 3000:80 -e BACKEND_URL=http://129.153.33.152:8080/v1 aci-frontend:latest
#
# Environment Variables (runtime):
#   BACKEND_URL - External backend API URL (e.g., http://backend-ip:8080/v1)
#                 If not set, uses /api/v1 and nginx proxies to aci-backend:80
#
###############################################################################
