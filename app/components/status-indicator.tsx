import { classNames } from "~/helpers/ui-helpers";

export interface StatusIndicatorProps {
  className?: string;
  status: string;
}

export function StatusIndicator({ className, status }: StatusIndicatorProps) {
  return (
    <div
      className={classNames(
        "flex-none rounded-full p-1",
        status === "completed" && "bg-green-400/10 text-green-400",
        status === "failed" && "bg-rose-400/10 text-rose-400",
        status === "delayed" && "bg-yellow-400/10 text-yellow-400",
        status === "active" && "bg-blue-400/10 text-blue-400",
        status === "waiting" && "bg-orange-400/10 text-orange-400",
        status === "paused" && "bg-purple-400/10 text-purple-400",
        status === "repeat" && "bg-gray-100/10 text-gray-500",
        className
      )}
    >
      <div className="h-2 w-2 rounded-full bg-current" />
    </div>
  );
}
