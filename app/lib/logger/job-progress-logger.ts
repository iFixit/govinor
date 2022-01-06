import { Job } from "bullmq";
import { Logger } from "./base";

export interface ProgressLog {
  lines: string[];
}

export class JobProgressLogger extends Logger {
  private job: Job;

  constructor(job: Job) {
    super();
    this.job = job;
  }

  async info(message: string): Promise<void> {
    await this.appendMessage(message);
  }

  async error(message: string): Promise<void> {
    await this.appendMessage(`ERROR: ${message}`);
  }

  static isProgressLog(
    progress: Job["progress"] | ProgressLog
  ): progress is ProgressLog {
    return progress != null && (progress as ProgressLog).lines != null;
  }

  private appendMessage(message: string) {
    const progress = this.getProgressLog();
    progress.lines.push(message);
    return this.job.updateProgress(progress);
  }

  private getProgressLog(): ProgressLog {
    return JobProgressLogger.isProgressLog(this.job.progress)
      ? this.job.progress
      : { lines: [] };
  }
}
