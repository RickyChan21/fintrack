FROM node:22-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home fintrack
USER fintrack

WORKDIR /home/fintrack/app

COPY --chown=fintrack:fintrack package.json .
RUN npm install

COPY --chown=fintrack:fintrack . .
RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["bash", "start.sh"]
