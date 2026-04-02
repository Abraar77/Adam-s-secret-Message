import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.5)] backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
