import { useLoaderData } from "@remix-run/react";
import { JobTableRow, JobTableRowItem } from "~/components/jobs/job-table-row";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { BreadcrumbItem } from "~/lib/hooks/use-breadcrumbs";

export type Loader = typeof loader;

export const loader = async () => {
  const jobs = await findDeleteDeploymentJobs();
  return {
    jobs,
  };

  async function findDeleteDeploymentJobs(): Promise<JobTableRowItem[]> {
    const rawJobs = await DeleteDeploymentJob.findMany(100);
    const deletions = await Promise.all(
      rawJobs.map(async (job) => {
        return {
          id: job.id,
          name: job.name,
          status: await job.getState(),
          attempts: job.attemptsMade,
          failedReason: job.failedReason,
          timestamp: new Date(job.timestamp).toISOString(),
          processedOn: job.processedOn
            ? new Date(job.processedOn).toISOString()
            : "",
          finishedOn: job.finishedOn
            ? new Date(job.finishedOn).toISOString()
            : "",
          returnValue: job.returnvalue,
        };
      })
    );
    return deletions;
  }
};

export const handle = {
  getBreadcrumbs: (): BreadcrumbItem[] => {
    return [
      {
        id: "delete-jobs",
        name: "Delete Jobs",
      },
    ];
  },
};

export default function DeleteJobsPage() {
  const { jobs } = useLoaderData<Loader>();
  return (
    <main className="">
      <div className="pt-11">
        <h2 className="px-4 text-2xl font-bold leading-7 text-white sm:px-6 lg:px-8">
          Delete Jobs
        </h2>
        <table className="mt-6 w-full text-left">
          <colgroup className="">
            <col className="w-full sm:w-3/12" />
            <col className="lg:w-2/12" />
            <col className="lg:w-1/12" />
            <col className="lg:w-1/12" />
            <col className="lg:w-1/12" />
            <col className="lg:w-4/12" />
          </colgroup>
          <thead className="border-b border-white/10 text-sm leading-6 text-white">
            <tr>
              <th
                scope="col"
                className="py-2 pl-4 pr-8 font-semibold sm:pl-6 lg:pl-8"
              >
                Name
              </th>
              <th
                scope="col"
                className="hidden py-2 pl-0 pr-8 font-semibold sm:table-cell"
              >
                Created
              </th>
              <th
                scope="col"
                className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20"
              >
                Status
              </th>
              <th
                scope="col"
                className="hidden py-2 pl-0 pr-8 font-semibold md:table-cell lg:pr-20"
              >
                Duration
              </th>
              <th
                scope="col"
                className="hidden py-2 pl-0 pr-4 text-right font-semibold sm:table-cell sm:pr-6 lg:pr-8"
              >
                Attempts
              </th>
              <th
                scope="col"
                className="hidden py-2 pl-0 pr-4 text-right font-semibold sm:table-cell sm:pr-6 lg:pr-8"
              >
                Result
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {jobs.map((job) => (
              <JobTableRow key={job.id} job={job} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
