import { useMatches } from "@remix-run/react";

export interface BreadcrumbItem {
  id: string;
  name: string | null;
  to?: string;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const matches = useMatches();
  const matchesWithBreadcrumbs = matches.filter(
    (match) => typeof match.handle?.getBreadcrumbs === "function"
  );
  if (matchesWithBreadcrumbs.length === 0) {
    return [];
  }
  // Concatenate all the breadcrumbs
  return matchesWithBreadcrumbs.reduce((acc, match) => {
    return acc.concat(match.handle!.getBreadcrumbs(match.data));
  }, [] as BreadcrumbItem[]);
}
