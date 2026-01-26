import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

// Single shared media query listener for all components
let mql: MediaQueryList | null = null
const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  if (listeners.size === 0 && typeof window !== "undefined") {
    mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", notifyAll)
  }
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
    if (listeners.size === 0 && mql) {
      mql.removeEventListener("change", notifyAll)
      mql = null
    }
  }
}

function notifyAll() {
  listeners.forEach((cb) => cb())
}

function getSnapshot() {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
