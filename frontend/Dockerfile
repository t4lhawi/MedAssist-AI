# ════════════════════════════════════════════════════════════
#  MedAssist AI – Frontend image (Vite/React → nginx)
#  nginx.conf proxies /api/ to http://backend:8000
# ════════════════════════════════════════════════════════════

# ── Stage 1 : build the SPA bundle ──────────────────────────
FROM node:20-alpine AS build

WORKDIR /build

# Cache npm install layer.
COPY package.json package-lock.json ./
RUN npm ci

# Build static assets.
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

# ── Stage 2 : serve with nginx ──────────────────────────────
FROM nginx:1.27-alpine

# Replace the default config with our SPA-aware + /api/ proxy one.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Vite emits `dist/` — copy it into nginx's web root.
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q -O- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
