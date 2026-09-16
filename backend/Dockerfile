FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends iputils-ping && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir -p /data/uploads && chown -R node:node /app /data
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]

