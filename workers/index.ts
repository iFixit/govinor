import "./fetch-polyfill";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { PushJob } from "../app/jobs/push-job.server";
import { connection } from "../config/jobs";

let pushJob: PushJob;
let deleteDeploymentJob: DeleteDeploymentJob;

checkRedisConnection().then(() => {
  console.log("redis is ready");
  pushJob = new PushJob();
  pushJob.startWorker({ connection });
  deleteDeploymentJob = new DeleteDeploymentJob();
  deleteDeploymentJob.startWorker({ connection });
});

process.on("SIGTERM", () => {
  console.info("SIGTERM signal received.");
  gracefullyShutdown();
});

process.on("SIGINT", () => {
  console.info("SIGINT signal received.");
  gracefullyShutdown();
});

function gracefullyShutdown() {
  if (pushJob) {
    pushJob.scheduler.close();
  }
  if (deleteDeploymentJob) {
    deleteDeploymentJob.scheduler.close();
  }
  process.exit();
}

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
