import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { resetAllBranchesToIdle } from "~/models/branch.server";
import { PushJob } from "../app/jobs/push-job.server";
import { connection } from "../config/jobs";

let pushJob: PushJob;
let deleteDeploymentJob: DeleteDeploymentJob;

checkRedisConnection().then(async () => {
  console.log("redis is ready");
  // Any non-idle activity at worker startup belongs to a previous
  // worker run that crashed mid-job. Clear it so the UI doesn't
  // show a forever-pulsating indicator. containerStatus is left
  // alone — a branch that was actually running before the crash
  // stays "running", so the recycler and dashboard still see it.
  const { count } = await resetAllBranchesToIdle();
  if (count > 0) {
    console.log(`reset ${count} orphaned branch activity row(s) to idle`);
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
