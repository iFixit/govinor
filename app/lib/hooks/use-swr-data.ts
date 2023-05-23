import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect, useRef } from "react";

export interface UseSWRDataOptions {
  intervalMillis?: number;
}

export function useSWRData<Data = any>({
  intervalMillis = 5000,
}: UseSWRDataOptions = {}) {
  const loaderData = useLoaderData<Data>();
  const revalidator = useRevalidator();

  const intervalId = useRef<number | null>(null);

  useEffect(() => {
    const handleFocus = () => {
      // If the window is focused and intervalId is not set (meaning the interval is not running),
      // start the interval
      if (intervalId.current == null) {
        intervalId.current = window.setInterval(
          revalidator.revalidate,
          intervalMillis
        );
      }
    };

    const handleBlur = () => {
      // If the window is blurred and intervalId is set (meaning the interval is running),
      // clear the interval
      if (intervalId.current != null) {
        window.clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };

    // Add the focus and blur listeners when the component mounts
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Clean up the focus and blur listeners when the component unmounts
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);

      // Also clear the interval when the component unmounts
      if (intervalId.current != null) {
        window.clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [revalidator.revalidate, intervalMillis]);
  return loaderData;
}
