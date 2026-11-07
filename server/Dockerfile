# syntax=docker/dockerfile:1

FROM node:22-alpine AS runner
WORKDIR /app

# Install native dependencies required by better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

# Copy server package manifests and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy application files
COPY . .

# Create persistent storage folder for SQLite database
RUN mkdir -p /app/data
ENV DB_PATH=/app/data/dailyba.db
ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000
VOLUME ["/app/data"]

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "index.js"]
