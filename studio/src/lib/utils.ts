import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a mouse click event has modifier keys or is not a primary left click.
 * Used to preserve native browser behavior (Cmd/Ctrl-click to open in new tab, middle click, etc.).
 */
export function isModifiedEvent(event: React.MouseEvent): boolean {
  return Boolean(
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0
  );
}
