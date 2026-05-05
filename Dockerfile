FROM node:20
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y python3 build-essential && npm install
COPY . .
RUN npm run build

EXPOSE 3001
CMD ["node", "server.js"]
