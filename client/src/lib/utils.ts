import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format cents → dollar string using comma as decimal separator.
 *  e.g. 1099 cents → "10,99"   (Arabic readers see "." as zero ٠)
 */
export function formatCents(cents: number, decimals = 2): string {
  return (cents / 100).toFixed(decimals).replace(".", ",");
}

/** Format a dollar amount using comma as decimal separator.
 *  e.g. 10.99 → "10,99"
 */
export function formatDollars(amount: number, decimals = 2): string {
  return amount.toFixed(decimals).replace(".", ",");
}
