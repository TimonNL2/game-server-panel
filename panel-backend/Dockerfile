FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/server-data /app/eggs

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]