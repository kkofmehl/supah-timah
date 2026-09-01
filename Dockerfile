FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY scripts ./scripts

RUN mkdir -p client/public/sounds && \
    npm ci --workspace=shared --workspace=client --workspace=server 2>/dev/null || npm install

COPY shared ./shared
COPY client ./client
COPY server ./server

RUN npm run build -w shared && npm run build -w client && npm run build -w server

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/data

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY scripts ./scripts

RUN mkdir -p client/public/sounds && \
    npm ci --workspace=shared --workspace=server --omit=dev 2>/dev/null || \
    npm install --workspace=shared --workspace=server --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
