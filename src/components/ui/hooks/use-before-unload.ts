"use client";

import { useEffect } from "react";

/**
 * Custom hook for handling beforeunload events
 * @param shouldWarn - Whether to show the warning
 * @param message - Warning message to show
 */
export function useBeforeUnload(
  shouldWarn: boolean,
  message: string = "Sie haben ungespeicherte Änderungen."
) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldWarn) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (shouldWarn) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarn, message]);
}
