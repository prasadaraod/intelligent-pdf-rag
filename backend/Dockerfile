# Use a stable, lightweight Node.js runtime environment
FROM node:20-alpine

# Set the active working directory inside the container
WORKDIR /usr/src/app

# Copy dependency manifests first to leverage Docker's caching system
COPY package*.json ./

# Install clean production dependencies
RUN npm ci --only=production

# Copy the rest of your application source code
COPY . .

# Expose your active backend runtime port
EXPOSE 5000

# Fire up the application
CMD ["node", "server.js"]