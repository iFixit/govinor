import { Logger } from "./base";

export class ConsoleLogger extends Logger {
  async info(message: string): Promise<void> {
    console.log(message);
  }

  async error(message: string): Promise<void> {
    console.error(`ERROR: ${message}`);
  }
}
