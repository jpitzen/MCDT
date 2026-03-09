# Stage 1: build React app
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG REACT_APP_API_URL=http://localhost:5000/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ || exit 1
