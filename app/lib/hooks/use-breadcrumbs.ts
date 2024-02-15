import { useMatches } from "@remix-run/react";

export interface BreadcrumbItem {
  id: string;
  name: string | null;
  to?: string;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const matches = useMatches();
  const matchesWithBreadcrumbs = matches.filter(
    // @ts-ignore
    (match) => typeof match.handle?.getBreadcrumbs === "function"
  );
  if (matchesWithBreadcrumbs.length === 0) {
    return [];
  }
  // Concatenate all the breadcrumbs
  return matchesWithBreadcrumbs.reduce((acc, match) => {
    // @ts-ignore
    return acc.concat(match.handle!.getBreadcrumbs(match.data));
  }, [] as BreadcrumbItem[]);
}
