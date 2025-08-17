import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import EventEmitter from "events";

export type TaskStatus = "pending" | "downloading" | "completed" | "failed";

export interface Task {
  id: string;
  url: string;
  type?: "video" | "audio";
  status: TaskStatus;
  progress?: number;
  result?: string;
  error?: string;
  createdAt: number;
}

class TaskManager {
  private tasks: Record<string, Task> = {};
  private queue: string[] = [];
  private queueSet = new Set<string>();
  private emitter = new EventEmitter();

  constructor() {}

  enqueueTask(taskId: string) {
    if (!this.queueSet.has(taskId)) {
      this.queue.push(taskId);
      this.queueSet.add(taskId);
      this.emitter.emit("task:added");
    }
  }

  async registerTask(url: string, type: "video" | "audio"): Promise<Task> {
    const id = uuidv4();
    const task: Task = {
      id,
      url,
      type,
      status: "pending",
      createdAt: Date.now(),
    };
    this.tasks[id] = task;
    this.enqueueTask(id);
    return task;
  }

  async nextTask(): Promise<string> {
    if (this.queue.length) {
      const id = this.queue.shift()!;
      this.queueSet.delete(id);
      return id;
    }
    await new Promise<void>((res) => this.emitter.once("task:added", res));
    const id = this.queue.shift()!;
    this.queueSet.delete(id);
    return id;
  }

  async updateTask(id: string, updates: Partial<Task>) {
    if (!this.tasks[id]) return;
    const prev = this.tasks[id];
    const merged = { ...prev, ...updates };
    this.tasks[id] = merged;
    if (updates.status === "completed" || updates.status === "failed") {
      await this.appendLog(merged);
      delete this.tasks[id];
    }
  }

  private async appendLog(task: Task) {
    const time = new Date().toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const result = String(task.result ?? "").replace(/\r?\n/g, " ");

    let line = "";

    if (task.status === "failed") {
      const err = String(task.error ?? "").replace(/\r?\n/g, " ");
      line = `${time} [FAILURE] id=${task.id} type=${task.type ?? "-"} url=${task.url} error=${err}`;
    }

    if (task.status === "completed") {
      line = `${time} [SUCCESS] id=${task.id} type=${task.type ?? "-"} url=${task.url} result=${result}`;
    }

    if (!line) return;

    const dir = path.resolve(process.cwd(), "download");
    const file = task.status === "completed" ? "success.log" : "failure.log";
    const p = path.join(dir, file);
    await fs.mkdir(dir, { recursive: true });
    // append single-line log
    await fs.appendFile(p, line + "\n", "utf-8");
  }

  getTask(id: string): Task | undefined {
    return this.tasks[id];
  }

  getAllTasks(): Task[] {
    return Object.values(this.tasks);
  }
}

const manager = new TaskManager();

// keep the original functional API surface for compatibility
export const registerTask = (url: string, type: "video" | "audio") =>
  manager.registerTask(url, type);
export const enqueueTask = (taskId: string) => manager.enqueueTask(taskId);
export const nextTask = () => manager.nextTask();
export const updateTask = (id: string, updates: Partial<Task>) =>
  manager.updateTask(id, updates);
export const getTask = (id: string) => manager.getTask(id);
export const getAllTasks = () => manager.getAllTasks();
