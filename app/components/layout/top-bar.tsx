import { Bars3Icon } from "@heroicons/react/20/solid";
import { Breadcrumbs } from "./breadcrumbs";

interface TopBarProps {
  onOpenSidebar: () => void;
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-6 border-b border-white/5 bg-gray-900 px-4 shadow-sm sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-white xl:hidden"
        onClick={onOpenSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <Breadcrumbs />
      </div>
    </div>
  );
}
