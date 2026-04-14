import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { resetDeployingBranchesToStopped } from "~/models/branch.server";
import { PushJob } from "../app/jobs/push-job.server";
import { connection } from "../config/jobs";

let pushJob: PushJob;
let deleteDeploymentJob: DeleteDeploymentJob;

checkRedisConnection().then(async () => {
  console.log("redis is ready");
  // Any branch left in "deploying" at worker startup belongs to a
  // previous worker run that crashed mid-deploy. Reset them so the
  // UI doesn't show a forever-pulsating indicator and the recycler
  // can reclaim their containers if memory gets tight.
  const { count } = await resetDeployingBranchesToStopped();
  if (count > 0) {
    console.log(`reset ${count} orphaned deploying branch(es) to stopped`);
  }
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
