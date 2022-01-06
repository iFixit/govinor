import Redis from "ioredis";

export const connection = new Redis(6379, "localhost", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
