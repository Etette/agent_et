# Stage 1: Build
FROM node:22 AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript project
RUN npm run build

# Stage 2: Runtime
FROM node:22-slim AS production

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install PRODUCTION dependencies only
RUN npm ci --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY --from=builder /app/src ./src
# COPY --from=builder /app/contracts ./contracts
# COPY --from=builder /app/scripts ./scripts

# Expose port (adjust based on your Express config)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]