import { execFile } from "node:child_process";
import path from "path";

export interface ExtractInfoParams {
  url: string;
  flat?: boolean;
}

export interface DownloadParams {
  url: string;
  format?: string;
  audioOnly?: boolean;
  outputTemplate?: string;
}

export interface DownloadResult {
  files: Array<{ path: string; size: number | null }>;
  stderr: string;
}

const videoDownloadDir = path.resolve(process.cwd(), "download/video");
const audioDownloadDir = path.resolve(process.cwd(), "download/audio");

const defaultVideoArgs = [
  "-o",
  `${videoDownloadDir}/%(title)s.%(ext)s`,
  "--no-playlist",
  "-f",
  "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
];

const defaultAudioArgs = [
  "-o",
  `${audioDownloadDir}/%(title)s.%(ext)s`,
  "--no-playlist",
];

export async function runYtDlp(
  args: string[],
  type: "video" | "audio" = "video"
) {
  const baseArgs = type === "audio" ? defaultAudioArgs : defaultVideoArgs;
  return new Promise<{ stderr: string; error?: any }>((resolve) => {
    const child = execFile("yt-dlp", [...baseArgs, ...args]);

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({ stderr, error: code !== 0 ? code : undefined });
    });

    child.on("error", (err) => {
      resolve({ stderr, error: err });
    });
  });
}

export const downloadVideo = async (url: string) => {
  const run = await runYtDlp([url], "video");
  if (run.error) throw new Error(run.stderr);
  return { done: true };
};

export const downloadAudio = async (url: string) => {
  const args = ["-x", "--audio-format", "mp3", url];
  const run = await runYtDlp(args, "audio");
  if (run.error) throw new Error(run.stderr);
  return { done: true };
};
