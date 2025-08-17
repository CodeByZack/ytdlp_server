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

    // only persist per-task outcome to separate logs, not the whole tasks file
    if (updates.status === "completed") {
      // write success log as a single-line string and remove task from memory
      try {
        const time = new Date().toISOString();
        const result = String(merged.result ?? "").replace(/\r?\n/g, " ");
        const line = `${time} [SUCCESS] id=${merged.id} type=${merged.type ?? "-"} url=${merged.url} result=${result}`;
        await this.appendLog("success", line);
      } catch {
        // don't throw on logging failure
      } finally {
        delete this.tasks[id];
      }
    } else if (updates.status === "failed") {
      try {
        const time = new Date().toISOString();
        const err = String(merged.error ?? "").replace(/\r?\n/g, " ");
        const line = `${time} [FAILURE] id=${merged.id} type=${merged.type ?? "-"} url=${merged.url} error=${err}`;
        await this.appendLog("failure", line);
      } catch {
        // swallow
      } finally {
        delete this.tasks[id];
      }
    }
    // note: not calling save() to avoid realtime persistence per your request
  }

  private async appendLog(kind: "success" | "failure", line: string) {
    const dir = path.resolve(process.cwd(), "download");
    const file = kind === "success" ? "success.log" : "failure.log";
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
