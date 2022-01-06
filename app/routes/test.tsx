import { LoaderFunction } from "remix";
import { PushJob } from "~/jobs/push-job.server";
import { requireAuthorization } from "~/lib/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  await requireAuthorization(request);

  const result = await PushJob.performLater({
    branch: "jobs",
    cloneUrl: "https://github.com/inkOfPixel/strapi-demo.git",
  });
  return result.data;
};
