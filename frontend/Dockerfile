# ════════════════════════════════════════════════════════════
#  MedAssist AI – Frontend (Vite + React → Nginx)
#  Multi-stage : 1) build, 2) image nginx légère pour servir.
# ════════════════════════════════════════════════════════════

# ── Stage 1 : build ──────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Manifeste en premier pour profiter du cache Docker.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Code source.
COPY . .

# Vite inlinera l'URL de l'API dans le bundle. Vide => on parle à
# "/api/..." (même origine), qui sera proxifié par Nginx vers le backend.
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Stage 2 : runtime (Nginx) ────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Config Nginx personnalisée (proxy /api vers le backend + SPA fallback).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Artefacts du build.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
