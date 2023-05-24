import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";
import { Link, NavLink } from "@remix-run/react";
import { presentOrDefault } from "~/helpers/application-helpers";
import { classNames } from "~/helpers/ui-helpers";
import { useBreadcrumbs } from "~/lib/hooks/use-breadcrumbs";

export function Breadcrumbs() {
  const breadcrumbs = useBreadcrumbs();
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <div>
            <NavLink
              to="/"
              className={({ isActive }) =>
                classNames(
                  "text-gray-500",
                  isActive ? "cursor-default" : "hover:text-gray-400"
                )
              }
            >
              <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </NavLink>
          </div>
        </li>
        {breadcrumbs.map((page, index) => {
          const isCurrentPage = index === breadcrumbs.length - 1;
          return (
            <li key={page.id}>
              <div className="flex items-center">
                <ChevronRightIcon
                  className="h-5 w-5 flex-shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                {page.to ? (
                  <Link
                    to={page.to}
                    className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-400"
                    aria-current={isCurrentPage ? "page" : undefined}
                  >
                    {presentOrDefault(page.name, "Untitled")}
                  </Link>
                ) : (
                  <span
                    className="ml-2 text-sm font-medium text-gray-500"
                    aria-current={isCurrentPage ? "page" : undefined}
                  >
                    {presentOrDefault(page.name, "Untitled")}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
