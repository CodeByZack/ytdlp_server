# syntax=docker/dockerfile:1.7
# Multi-stage build for smaller runtime image

ARG http_proxy
ARG https_proxy
ARG NODE_VERSION=20.15.0
FROM node:${NODE_VERSION}-slim AS deps

# Install system dependencies (ffmpeg, curl, python3 for yt-dlp updates if needed)
RUN apt-get update && apt-get install -y --fix-missing --no-install-recommends \
    ca-certificates ffmpeg python3 curl gnupg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY package-lock.json* ./
COPY .npmrc* ./
RUN npm install --omit=dev

FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app
COPY package.json ./
COPY package-lock.json* ./
COPY .npmrc* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
    PORT=8787 \
    YTDLP_AUTO_UPDATE=false

# Install runtime deps only + ffmpeg + yt-dlp binary
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 curl && rm -rf /var/lib/apt/lists/* \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app
# Copy node modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy build output
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
