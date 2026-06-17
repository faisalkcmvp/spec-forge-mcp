## Multi-stage Dockerfile for building and running the NestJS app
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (uses package-lock.json if present)
COPY package*.json ./
RUN npm set progress=false \
  && npm install --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

## Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
