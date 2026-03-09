# ZLAWS Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files from backend
COPY backend/package*.json ./

# Install production dependencies
RUN npm install --production

# Copy application code
COPY backend/src ./src
COPY backend/.sequelizerc ./

# Copy frontend build
COPY frontend/build ./frontend/build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
