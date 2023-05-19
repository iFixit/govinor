import { useState, useEffect } from "react";

interface UseClipboardOptions {
  resetDelay?: number;
}

export function useClipboard({ resetDelay = 1500 }: UseClipboardOptions = {}) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isCopied) {
      timeout = setTimeout(() => setIsCopied(false), resetDelay);
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [isCopied, resetDelay]);

  return { isCopied, copyToClipboard };
}
