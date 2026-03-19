import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format cents → dollar string. e.g. 1099 → "10.99" */
export function formatCents(cents: number, decimals = 2): string {
  return (cents / 100).toFixed(decimals);
}

/** Format a dollar amount. e.g. 10.9900123 → "10.99" */
export function formatDollars(amount: number, decimals = 2): string {
  return amount.toFixed(decimals);
}
