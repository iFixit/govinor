import { classNames } from "~/helpers/ui-helpers";

type Size = "3" | "4" | "5" | "6" | "8" | "10" | "12" | "16";
type Color = "white" | "purple" | "blue" | "green" | "yellow" | "red" | "gray";

interface SpinnerProps {
  size?: Size;
  color?: Color;
}

export default function Spinner({ size = "5", color = "white" }: SpinnerProps) {
  return (
    <svg
      className={classNames(
        "animate-spin -ml-1 mr-3",
        color === "white" && "text-white",
        color === "purple" && "text-purple-500",
        color === "blue" && "text-blue-500",
        color === "green" && "text-green-500",
        color === "yellow" && "text-yellow-500",
        color === "red" && "text-red-500",
        color === "gray" && "text-gray-500",
        size === "3" && "h-3 w-3",
        size === "4" && "h-4 w-4",
        size === "5" && "h-5 w-5",
        size === "6" && "h-6 w-6",
        size === "8" && "h-8 w-8",
        size === "10" && "h-10 w-10",
        size === "12" && "h-12 w-12",
        size === "16" && "h-16 w-16"
      )}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
