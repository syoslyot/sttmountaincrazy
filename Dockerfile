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
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV STTMOUNTAIN_URL=http://localhost:8000
EXPOSE 3000
CMD ["npm", "start"]
