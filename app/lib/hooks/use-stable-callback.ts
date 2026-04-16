import { useCallback, useEffect, useRef } from "react";

/**
 * Hook that returns a stable callback reference that always calls the latest version of the provided function.
 * This is useful for event handlers and callbacks that need to be stable for performance reasons
 * while still accessing the latest props and state.
 *
 * Approach inspired by Dan Abramov blog https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 *
 * React is planning to introduce something like this as a primitive in future versions
 * https://react.dev/learn/separating-events-from-effects#declaring-an-effect-event
 *
 * @param callback The callback function that may change between renders
 * @returns A stable callback that always calls the latest version
 *
 * @example
 * ```tsx
 * function MyComponent({ onClick }) {
 *   // onClick may change on every render, but stableOnClick remains the same
 *   const stableOnClick = useStableCallback(onClick);
 *
 *   useEffect(() => {
 *     // This effect only runs once because stableOnClick never changes
 *     window.addEventListener('click', stableOnClick);
 *     return () => window.removeEventListener('click', stableOnClick);
 *   }, [stableOnClick]);
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends ((...args: any[]) => any) | undefined>(callback: T): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stableCallback = useCallback((...args: any[]) => callbackRef.current?.(...args), []);

  return (callback ? stableCallback : undefined) as T;
}
