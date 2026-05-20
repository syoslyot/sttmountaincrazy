FROM ghcr.io/syoslyot/sttmountain:latest AS data-source

FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=data-source /app/db /app/data/db
COPY --from=data-source /app/app/static /app/data/static
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DB_PATH=/app/data/db/sttmountain.db
ENV STATIC_BASE=/app/data/static
EXPOSE 3000
CMD ["npm", "start"]
