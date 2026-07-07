import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Guard against SSR — window is not available on the server
export const isIframe =
  typeof window !== 'undefined' && window.self !== window.top;
