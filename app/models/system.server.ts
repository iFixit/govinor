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
  const shell = new Shell();
  const result = await shell.run({
    type: "command",
    command: "free -h | awk '/Mem:/ {print $7}'",
  });
  if (result == null) {
    throw new Error("Failed to get available memory");
  }
  return result.output;
}

export async function getAvailableMemoryBytes(): Promise<number> {
  const shell = new Shell();
  const result = await shell.run({
    type: "command",
    command: "free -b | awk '/Mem:/ {print $7}'",
  });
  if (result == null) {
    throw new Error("Failed to get available memory");
  }
  const bytes = parseInt(result.output.trim(), 10);
  if (!Number.isFinite(bytes)) {
    throw new Error(`Failed to parse available memory: "${result.output}"`);
  }
  return bytes;
}
