FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
    postgresql postgresql-contrib \
    redis-server \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home fintrack

WORKDIR /home/fintrack/app

COPY package.json .
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

RUN mkdir -p /var/log/fintrack && chown -R fintrack:fintrack /home/fintrack /var/log/fintrack

EXPOSE 3000

CMD ["bash", "/home/fintrack/app/entrypoint.sh"]
