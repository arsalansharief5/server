# Stage 1 Build
FROM node:20-alpine AS builder


WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
COPY prisma ./prisma

RUN npm install

# Copying source code
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# Stage 2 Prod
FROM node:20-alpine


WORKDIR /app


COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
