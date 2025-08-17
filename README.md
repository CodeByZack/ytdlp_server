# yt-dlp-server

基于 Hono 的 JSON-RPC 服务，封装 yt-dlp，支持音视频下载。

## 功能简介
- 提供 JSON-RPC 2.0 接口
- 支持视频信息提取、音视频下载
- 下载文件自动保存到项目目录下的 `download/video` 和 `download/audio`

## 本地开发
1. 安装依赖
   ```sh
   npm install
   ```
2. 构建项目
   ```sh
   npm run build
   ```
3. 启动服务
   ```sh
   npm start
   ```
   默认端口 8787，可通过环境变量 `PORT` 修改。

## Docker 构建与运行

### 1. 构建镜像（如需代理，务必加代理参数）
如果你的网络需要代理访问国外源，构建时加如下参数：

```sh
docker build \
  --build-arg http_proxy=http://host.docker.internal:7897 \
  --build-arg https_proxy=http://host.docker.internal:7897 \
  -t ytdlp-server .
```

> 其中 `7897` 为你的本地代理端口，`host.docker.internal` 适用于 macOS/Windows Docker Desktop。

### 2. 运行容器

```sh
docker run -d -p 8787:8787 --name ytdlp-server ytdlp-server
```

如需持久化下载目录到主机：
```sh
docker run -d -p 8787:8787 -v /你的主机目录/download:/app/download --name ytdlp-server ytdlp-server
```

## API 示例

### 下载视频
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "download-video",
  "url": "https://www.xxx.com/watch?v=xxxx"
}
```

### 下载音频
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "download-audio",
  "url": "https://www.xxx.com/watch?v=xxxx"
}
```

## 其他说明
- 容器内健康检查已配置。
- 如需更换挂载目录，需先删除原容器再用新目录重新运行。
- 请遵守相关平台和法律法规。

---

如有问题或建议，欢迎 Issue 反馈。
