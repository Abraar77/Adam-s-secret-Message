import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(
    new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })),
    "d MMM, h:mm a"
  );
}
