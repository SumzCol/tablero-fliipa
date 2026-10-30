FROM node:26-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Vite no usa better-sqlite3; evita node-gyp en la imagen slim.
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_BASE=/
ENV VITE_BASE=$VITE_BASE
RUN npm run build

FROM node:26-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# Cloud Run usa Firestore; better-sqlite3 no tiene prebuild en Node 26 (solo dev local).
RUN npm ci --omit=dev --ignore-scripts
COPY api ./api
COPY server ./server
COPY --from=build /app/dist ./dist
ENV PORT=8080
CMD ["node", "server/index.js"]
