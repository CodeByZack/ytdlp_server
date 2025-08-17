# yt-dlp-server

基于 Hono 的 JSON-RPC 服务，封装 yt-dlp，支持音视频下载。

## 功能简介

- 支持音视频下载
- 下载文件自动保存到项目目录下的 `download/video` 和 `download/audio`

## 本地开发

1. 安装依赖
   ```sh
   npm install
   ```
2. 构建项目
   ```sh
   npm run dev
   ```
   默认端口 8787，可通过环境变量 `PORT` 修改。

## Docker 构建与运行

### 1. 构建镜像

```sh
docker build -t ytdlp-server .

docker save -o ytdlp-server.tar ytdlp-server:latest
```

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
  "type": "video",
  "url": "https://www.xxx.com/watch?v=xxxx"
}
```

### 下载音频

```json
{
  "type": "audio",
  "url": "https://www.xxx.com/watch?v=xxxx"
}
```

- 请遵守相关平台和法律法规。

---

如有问题或建议，欢迎 Issue 反馈。
