export abstract class Logger {
  abstract info(message: string): Promise<void>;
  abstract error(error: string): Promise<void>;
}
