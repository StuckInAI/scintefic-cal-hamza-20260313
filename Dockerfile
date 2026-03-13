FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite

COPY package.json package-lock.json ./

RUN npm i

COPY . .

RUN npm run build

# Create writable directory for SQLite database
RUN mkdir -p /app/data && chmod 777 /app/data

ENV DATABASE_PATH=/app/data/database.sqlite
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
