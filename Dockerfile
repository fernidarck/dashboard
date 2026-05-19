FROM node:20
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y python3 build-essential && npm install sqlite3 --build-from-source && npm install
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
