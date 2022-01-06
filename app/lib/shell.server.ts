import child from "child_process";
import { Logger } from "./logger";
import { promisify } from "util";
import { assertNever } from "~/helpers/application-helpers";

const exec = promisify(child.exec);

export interface Command {
  type: "command";
  command: string;
}

export interface SpawnCommand {
  type: "spawn-command";
  command: string;
  args?: string[] | undefined;
  workingDirectory?: string;
  useShellSyntax?: boolean;
}

export interface MacroCommand {
  type: "macro";
  commands: Array<Command | SpawnCommand | MacroCommand | Log>;
}

export interface Log {
  type: "log";
  message: string;
}

export interface ExecutionResult {
  output: string;
  error: string;
}

export type Program = Command | SpawnCommand | MacroCommand | Log;

export class Shell {
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  async run(program: Program): Promise<ExecutionResult | undefined> {
    switch (program.type) {
      case "command":
        return this.execute(program);
      case "spawn-command":
        await this.spawn(program);
        return;
      case "macro":
        for (let i = 0; i < program.commands.length; i++) {
          const subcommand = program.commands[i];
          await this.run(subcommand);
        }
        return;
      case "log":
        await this.logger?.info(program.message);
        return;
      default:
        return assertNever(program);
    }
  }

  private async execute(command: Command): Promise<ExecutionResult> {
    const { stdout, stderr } = await exec(command.command);
    return {
      output: stdout,
      error: stderr,
    };
  }

  private spawn(command: SpawnCommand): Promise<void> {
    return new Promise((resolve, reject) => {
      const commandProcess = child.spawn(command.command, command.args, {
        cwd: command.workingDirectory,
        shell: command.useShellSyntax,
      });
      commandProcess.stdout.on("data", (data) => {
        this.logger?.info(this.convertInfoToMessage(data));
      });
      commandProcess.stderr.on("data", (data) => {
        this.logger?.error(this.convertErrorToMessage(data));
      });
      commandProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(code);
        }
      });
      commandProcess.on("error", (err) => {
        reject(err);
      });
    });
  }

  private convertInfoToMessage(data: unknown): string {
    let message = `! unknown log format: ${typeof data}`;
    if (typeof data === "string") {
      message = data;
    }
    if (typeof data === "object" && data != null) {
      message = data.toString();
    }
    return message;
  }

  private convertErrorToMessage(error: unknown): string {
    let message = `! unknown error format: ${typeof error}`;
    if (typeof error === "string") {
      message = error;
    }
    if (typeof error === "object" && error != null) {
      message = error.toString();
    }
    return message;
  }
}
