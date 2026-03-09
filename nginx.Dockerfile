# ZLAWS Nginx Reverse Proxy Image
# Provides SSL/TLS termination and reverse proxy for backend

FROM nginx:alpine

# Install openssl for certificate generation
RUN apk add --no-cache openssl

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY --chmod=644 <<EOF /etc/nginx/conf.d/zlaws.conf
# ZLAWS Nginx Configuration

upstream backend {
    server zlaws-backend:5000;
    keepalive 32;
}

# HTTP server (redirect to HTTPS)
server {
    listen 80;
    server_name _;
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL certificates (self-signed for development)
    ssl_certificate /etc/nginx/certs/zlaws.crt;
    ssl_certificate_key /etc/nginx/certs/zlaws.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS header
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    gzip_min_length 1024;
    gzip_proxied any;
    
    # Client timeouts
    client_max_body_size 100M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Nginx status (for monitoring)
    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
    }
    
    # Proxy to backend
    location / {
        proxy_pass http://backend;
        
        # Preserve original request
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # API specific configuration
    location /api/ {
        proxy_pass http://backend;
        
        # Rate limiting (10 requests per second)
        limit_req zone=api_limit burst=20 nodelay;
        
        # Headers for API
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache control
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }
    
    # WebSocket location
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

EOF

# Create certificate directory
RUN mkdir -p /etc/nginx/certs

# Copy certificate generation script
RUN cat > /usr/local/bin/generate-certs.sh <<'SCRIPT'
#!/bin/sh
# Generate self-signed certificate if it doesn't exist
if [ ! -f /etc/nginx/certs/zlaws.crt ]; then
    echo "Generating self-signed certificate..."
    openssl req -x509 -newkey rsa:4096 -keyout /etc/nginx/certs/zlaws.key \
        -out /etc/nginx/certs/zlaws.crt -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=ZLAWS/CN=zlaws.local"
    chmod 600 /etc/nginx/certs/zlaws.key
fi
SCRIPT

RUN chmod +x /usr/local/bin/generate-certs.sh

# Create custom entrypoint
RUN cat > /docker-entrypoint.sh <<'ENTRYPOINT'
#!/bin/sh
set -e

# Generate certificates if needed
/usr/local/bin/generate-certs.sh

# Execute original entrypoint
exec "$@"
ENTRYPOINT

RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider https://localhost/health 2>/dev/null || exit 1

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
