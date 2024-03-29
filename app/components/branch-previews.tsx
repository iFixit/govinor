import type { BranchItem } from "~/models/branch.server";
import { BranchActions } from "~/routes/repositories.$id.branches._index";

interface BranchPreviewsProps {
  branches: BranchItem[];
  deployDomain: string;
}

export function BranchPreviews({
  branches,
  deployDomain,
}: BranchPreviewsProps) {
  return (
    <ul role="list" className="divide-y divide-white/5">
      {branches.map((branch) => {
        const repositoryFullName =
          branch.repository?.fullName ?? "react-commerce";
        return (
          <li
            key={branch.handle}
            className="relative flex items-center hover:bg-gray-700/10 space-x-4 px-4 py-4 sm:px-6 lg:px-8"
          >
            <div className="min-w-0 flex-auto">
              <div className="flex items-center gap-x-3">
                <h2 className="min-w-0 text-sm font-semibold leading-6 text-white">
                  <a
                    href={`https://${branch.handle}.${deployDomain}/admin`}
                    target="_blank"
                    className="flex gap-x-2"
                  >
                    <span className="whitespace-nowrap">{branch.name}</span>
                    <span className="absolute inset-0" />
                  </a>
                </h2>
              </div>
              <div className="mt-3 flex items-center gap-x-2.5 text-xs leading-5 text-gray-400">
                <p className="truncate">Deployed from {repositoryFullName}</p>
              </div>
            </div>
            <div className="flex flex-none items-center gap-x-4">
              <a
                href={`https://${branch.handle}.${deployDomain}/admin`}
                target="_blank"
                className="hidden rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-white/20 sm:block"
              >
                Preview <span className="sr-only">, {branch.name}</span>
              </a>
              <BranchActions branch={branch} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
