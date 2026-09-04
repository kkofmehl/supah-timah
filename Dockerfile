FROM node:22-alpine AS builder

WORKDIR /app

# Avoid interactive npm prompts and skip noisy audit during image builds.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY scripts ./scripts

# Pure-JS bcryptjs — no native compile tools needed on Alpine.
RUN mkdir -p client/public/sounds client/public && \
    npm ci --workspace=shared --workspace=client --workspace=server

COPY shared ./shared
COPY client ./client
COPY server ./server

RUN npm run build -w shared && npm run build -w client && npm run build -w server

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    DATA_DIR=/data \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

# Production deps only; ignore lifecycle scripts (sounds already in client/dist).
RUN npm ci --workspace=shared --workspace=server --omit=dev --ignore-scripts

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
