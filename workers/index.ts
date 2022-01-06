import "./fetch-polyfill";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { PushJob } from "../app/jobs/push-job.server";
import { connection } from "../config/jobs";

checkRedisConnection().then(() => {
  console.log("redis is ready");
  PushJob.startWorker({ connection });
  DeleteDeploymentJob.startWorker({ connection });
});

function checkRedisConnection() {
  return new Promise((resolve, reject) => {
    let isWaitingForRedisServer = false;
    connection.on("error", () => {
      if (!isWaitingForRedisServer) {
        isWaitingForRedisServer = true;
        console.log("waiting for redis server...");
      }
    });
    connection.on("connect", () => {
      resolve(true);
    });
  });
}
