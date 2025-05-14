# Use the official Node.js 20 Alpine image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy only dependency-related files first (to leverage Docker cache)
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Copy source files and configs
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Build the NestJS app
RUN npm run build

# -------- Production Stage --------
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy only what's needed from the builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Expose port (match your main.ts or config)
EXPOSE 8080

# Start app
CMD ["node", "dist/main"]
