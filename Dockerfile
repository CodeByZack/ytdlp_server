# syntax=docker/dockerfile:1.7
# Multi-stage build for smaller runtime image

ARG NODE_VERSION=20.15.0

#########################
# 依赖阶段 (Deps)
#########################
FROM node:${NODE_VERSION}-slim AS deps

# 设置时区环境变量
ENV TZ=Asia/Shanghai \
    DEBIAN_FRONTEND=noninteractive

# 安装 tzdata + 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata ca-certificates ffmpeg python3 curl gnupg \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY package-lock.json* ./
COPY .npmrc* ./
RUN npm install --omit=dev

#########################
# 构建阶段 (Builder)
#########################
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app
COPY package.json ./
COPY package-lock.json* ./
COPY .npmrc* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

#########################
# 运行阶段 (Runtime)
#########################
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
    PORT=8787 \
    YTDLP_AUTO_UPDATE=false \
    TZ=Asia/Shanghai \
    DEBIAN_FRONTEND=noninteractive

# 安装 tzdata + 运行时依赖 + yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata ca-certificates ffmpeg python3 curl \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/* \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app
# 复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
# 复制构建输出
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]