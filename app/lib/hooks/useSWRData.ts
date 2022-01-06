import * as React from "react";
import { useFetcher, useLoaderData, useMatches } from "remix";

export interface UseSWRDataOptions {
  intervalMillis?: number;
}
export function useSWRData<Data = any>({
  intervalMillis = 5000,
}: UseSWRDataOptions = {}) {
  const initialData = useLoaderData<Data>();
  const matches = useMatches();
  const currentPath =
    matches.length > 0 ? matches[matches.length - 1].pathname : "";
  const fetcher = useFetcher<Data>();

  React.useEffect(() => {
    let interval = setInterval(() => {
      fetcher.load(currentPath);
    }, intervalMillis);
    return () => clearInterval(interval);
  }, [fetcher, currentPath]);
  return fetcher.data || initialData;
}
