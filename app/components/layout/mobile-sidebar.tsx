import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Link, NavLink } from "@remix-run/react";
import { Fragment } from "react";
import { newRepositoryPath, repositoryPath } from "~/helpers/path-helpers";
import { classNames } from "~/helpers/ui-helpers";
import { RepositoryListItem } from "~/models/repository.server";
import { navigation } from "./navigation";
import { PlusIcon } from "@heroicons/react/20/solid";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: RepositoryListItem[];
}

export function MobileSidebar({
  isOpen,
  onClose,
  repositories,
}: MobileSidebarProps) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 xl:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </Transition.Child>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 ring-1 ring-white/10">
                <div className="flex h-16 shrink-0 items-center">
                  <p className="text-2xl text-white font-bold tracking-tight">
                    🚀 Govinor
                  </p>
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
                              onClick={onClose}
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
                          onClick={onClose}
                        >
                          <span className="sr-only">Create new repo</span>
                          <PlusIcon className="h-5 w-5" aria-hidden="true" />
                        </Link>
                      </div>
                      <ul role="list" className="-mx-2 mt-2 space-y-1">
                        {repositories.map((repo) => (
                          <li key={repo.name}>
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
                              onClick={onClose}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-[0.625rem] font-medium text-gray-400 group-hover:text-white">
                                {repo.name.slice(0, 1)}
                              </span>
                              <span className="truncate">{repo.fullName}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
