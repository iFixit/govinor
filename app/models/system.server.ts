import os from "os";
import prettyBytes from "pretty-bytes";
import { Shell } from "~/lib/shell.server";

interface SystemStats {
  availableDiskSpace: string;
  availableMemory: string;
}

/**
 * Get system stats about the server.
 * @returns A promise that resolves with the system stats.
 */
export async function getSystemStats(): Promise<SystemStats> {
  const availableDiskSpace = await getAvailableDiskSpace();
  const availableMemory = await getAvailableMemory();
  return { availableDiskSpace, availableMemory };
}

async function getAvailableDiskSpace(): Promise<string> {
  const shell = new Shell();
  const result = await shell.run({
    type: "command",
    command: "df -Ph . | tail -1 | awk '{print $4}'",
  });
  if (result == null) {
    throw new Error("Failed to get free disk space");
  }
  return result.output;
}

async function getAvailableMemory(): Promise<string> {
  const availableBytes = os.freemem();
  return prettyBytes(availableBytes);
}
