import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect } from "react";
import { useStableCallback } from "./use-stable-callback";

export interface UseSWRDataOptions {
  intervalMillis?: number;
}

export function useSWRData<Data = any>({
  intervalMillis = 5000,
}: UseSWRDataOptions = {}) {
  const loaderData = useLoaderData<Data>();
  const revalidator = useRevalidator();
  const revalidate = useStableCallback(revalidator.revalidate);

  useEffect(() => {
    let intervalId: number | null = null;

    const start = () => {
      if (intervalId == null) {
        intervalId = window.setInterval(revalidate, intervalMillis);
      }
    };

    const stop = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    if (document.hasFocus()) {
      start();
    }
    window.addEventListener("focus", start);
    window.addEventListener("blur", stop);

    return () => {
      window.removeEventListener("focus", start);
      window.removeEventListener("blur", stop);
      stop();
    };
  }, [revalidate, intervalMillis]);

  return loaderData;
}
