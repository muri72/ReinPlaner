"use client";

import * as React from "react"

const MOBILE_BREAKPOINT = 768 // md

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Set the initial value on the client
    setIsMobile(mql.matches)

    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    // Add listener for changes
    mql.addEventListener("change", onChange)

    // Clean up listener on unmount
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}