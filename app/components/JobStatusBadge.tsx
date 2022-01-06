import { classNames } from "~/helpers/ui-helpers";

export interface JobStatusBadgeProps {
  className?: string;
  status: string;
}

export function JobStatusBadge({ className, status }: JobStatusBadgeProps) {
  return (
    <span
      className={classNames(
        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
        status === "completed" && "bg-green-200 text-green-800",
        status === "failed" && "bg-red-200 text-red-800",
        status === "delayed" && "bg-yellow-200 text-yellow-800",
        status === "active" && "bg-blue-200 text-blue-800",
        status === "wait" && "bg-orange-200 text-orange-800",
        status === "paused" && "bg-purple-200 text-purple-800",
        status === "repeat" && "bg-gray-200 text-gray-800",
        className
      )}
    >
      {status}
    </span>
  );
}
