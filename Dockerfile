FROM node:20
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y python3 build-essential && npm install --build-from-source=sqlite3
COPY . .

EXPOSE 3002
CMD ["node", "server.js"]
