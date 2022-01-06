import { Job, Queue, QueueOptions, Worker, WorkerOptions } from "bullmq";
import { connection } from "../../config/jobs";

type PayloadOf<ConcreteJob> = ConcreteJob extends BaseJob<infer T, any>
  ? T
  : never;
type ReturnTypeOf<ConcreteJob> = ConcreteJob extends BaseJob<any, infer T>
  ? T
  : never;

export abstract class BaseJob<PayloadType = any, ReturnType = any> {
  abstract readonly queueName: string;
  private _queue: Queue<PayloadType, ReturnType> | undefined;

  startWorker(options?: WorkerOptions) {
    return new Worker<PayloadType, ReturnType>(
      this.queueName,
      this.perform,
      options
    );
  }

  performLater(payload: PayloadType): Promise<Job<PayloadType, ReturnType>> {
    return this.queue.add(this.getJobName(payload), payload);
  }

  static performLater<T extends BaseJob<PayloadOf<T>, ReturnTypeOf<T>>>(
    this: { new (options?: QueueOptions): T },
    payload: PayloadOf<T>
  ) {
    const queue = new this({ connection });
    return queue.performLater(payload);
  }

  static startWorker<T extends BaseJob<PayloadOf<T>, ReturnTypeOf<T>>>(
    this: { new (): T },
    options: WorkerOptions
  ) {
    const instance = new this();
    return instance.startWorker(options);
  }

  async findMany(limit: number = 100): Promise<Job<PayloadType, ReturnType>[]> {
    const jobs = await this.queue.getJobs(
      ["active", "completed", "failed", "delayed", "wait", "paused", "repeat"],
      0,
      limit
    );
    jobs.sort(BaseJob.recentFirst);
    return jobs;
  }

  static findMany<T extends BaseJob<PayloadOf<T>, ReturnTypeOf<T>>>(
    this: { new (): T },
    limit?: number
  ) {
    const queue = new this();
    return queue.findMany(limit);
  }

  async find(id: string): Promise<Job<PayloadType, ReturnType> | undefined> {
    const job = await this.queue.getJob(id);
    return job;
  }

  static find<T extends BaseJob<PayloadOf<T>, ReturnTypeOf<T>>>(
    this: { new (): T },
    id: string
  ) {
    const queue = new this();
    return queue.find(id);
  }

  protected abstract perform(
    job: Job<PayloadType, ReturnType>
  ): Promise<ReturnType>;

  protected abstract getJobName(payload: PayloadType): string;

  private get queue(): Queue<PayloadType, ReturnType> {
    if (!this._queue) {
      this._queue = new Queue<PayloadType, ReturnType>(this.queueName, {
        connection,
      });
    }
    return this._queue;
  }

  private static recentFirst(a: Job, b: Job) {
    return b.timestamp - a.timestamp;
  }
}
