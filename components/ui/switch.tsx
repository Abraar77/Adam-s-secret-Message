import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HTMLAttributes } from "react";

interface SwitchProps extends HTMLAttributes<HTMLButtonElement> {
  checked: boolean;
}

export function Switch({ checked, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 bg-white/10 transition",
        checked ? "bg-sky-500/60" : "bg-white/5",
        className
      )}
      {...props}
    >
      <motion.span
        layout
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow",
          checked ? "ml-[22px]" : "ml-[2px]"
        )}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
