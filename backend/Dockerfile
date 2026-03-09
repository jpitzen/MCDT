FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npm run db:migrate && npm start"]
