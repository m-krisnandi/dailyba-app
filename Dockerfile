# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Build static output
COPY . .
ARG NEXT_PUBLIC_API_URL=https://dailyba.pdfumi.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Production runner with lightweight Nginx
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy exported static files & custom nginx config
COPY --from=builder /app/out ./
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
