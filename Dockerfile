FROM ghcr.io/syoslyot/sttmountain:latest AS data-source

FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY --from=data-source /app/db/sttmountain.db ./data/sttmountain.db
COPY --from=data-source /app/app/static/gpx ./data/static/gpx
COPY --from=data-source /app/app/static/maps ./data/static/maps
COPY --from=data-source /app/app/static/previews ./data/static/previews

COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/data ./data

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DB_PATH=/app/data/sttmountain.db
ENV STATIC_DIR=/app/data/static

EXPOSE 3000
CMD ["node", "server.js"]
