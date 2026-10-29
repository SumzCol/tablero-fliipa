FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Vite no usa better-sqlite3; evita node-gyp en la imagen slim.
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_BASE=/
ARG VITE_FLIIPA_BOARD_WRITE_KEY=
ENV VITE_BASE=$VITE_BASE
ENV VITE_FLIIPA_BOARD_WRITE_KEY=$VITE_FLIIPA_BOARD_WRITE_KEY
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY api ./api
COPY server ./server
COPY --from=build /app/dist ./dist
ENV PORT=8080
CMD ["node", "server/index.js"]
