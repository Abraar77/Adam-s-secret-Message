import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/30 hover:brightness-110 focus-visible:outline-sky-200",
        secondary:
          "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 focus-visible:outline-slate-200",
        ghost:
          "bg-white/5 text-slate-100 border border-white/10 hover:bg-white/10 focus-visible:outline-slate-200",
        outline:
          "bg-transparent text-slate-100 border border-slate-700 hover:border-slate-400",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-3 text-base",
      },
      width: {
        fit: "",
        full: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      width: "fit",
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, width, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonStyles({ variant, size, width }), className)}
      {...props}
    />
  )
);

Button.displayName = "Button";
