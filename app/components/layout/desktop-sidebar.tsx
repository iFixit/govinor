import { Link, NavLink } from "@remix-run/react";
import { classNames } from "~/helpers/ui-helpers";
import { navigation } from "./navigation";
import { PlusIcon } from "@heroicons/react/20/solid";
import {
  homePath,
  newRepositoryPath,
  repositoryPath,
} from "~/helpers/path-helpers";
import type { RepositoryListItem } from "~/models/repository.server";

interface DesktopSidebarProps {
  repositories: RepositoryListItem[];
  nodeVersion: string;
}

export function DesktopSidebar({
  repositories,
  nodeVersion,
}: DesktopSidebarProps) {
  return (
    <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-72 xl:flex-col">
      {/* Sidebar component, swap this element with another sidebar if you like */}
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-black/10 px-6 ring-1 ring-white/5">
        <div className="flex h-16 shrink-0 items-center">
          <Link
            to={homePath()}
            className="text-2xl text-white font-bold tracking-tight"
          >
            🚀 Govinor
          </Link>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        classNames(
                          isActive
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:text-white hover:bg-gray-800",
                          "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                        )
                      }
                    >
                      <item.icon
                        className="h-6 w-6 shrink-0"
                        aria-hidden="true"
                      />
                      {item.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <div className="flex justify-between">
                <div className="text-xs font-semibold leading-6 text-gray-400">
                  Repositories
                </div>
                <Link
                  to={newRepositoryPath()}
                  className="rounded hover:bg-white/10 border border-white/5 px-1 py-1 text-sm font-semibold text-gray-500 shadow-sm transition-colors"
                >
                  <span className="sr-only">Create new repo</span>
                  <PlusIcon className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
              {repositories.length > 0 ? (
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  {repositories.map((repo) => (
                    <li key={repo.id}>
                      <NavLink
                        to={repositoryPath(repo)}
                        className={({ isActive }) =>
                          classNames(
                            isActive
                              ? "bg-gray-800 text-white"
                              : "text-gray-400 hover:text-white hover:bg-gray-800",
                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                          )
                        }
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-[0.625rem] font-medium text-gray-400 group-hover:text-white">
                          {repo.name.slice(0, 1)}
                        </span>
                        <span className="truncate">{repo.fullName}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-xs mt-6">No repositories</p>
              )}
            </li>
          </ul>
        </nav>
        <div className="py-4">
          <p className="text-gray-700 text-sm font-semibold">
            Node.js {nodeVersion}
          </p>
        </div>
      </div>
    </div>
  );
}
