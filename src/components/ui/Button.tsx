import React, { ButtonHTMLAttributes } from "react";
import { RefreshCw } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  hoverScale?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      hoverScale = true,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    // Base classes
    const baseClasses = "inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2";

    // Variants
    const variants = {
      primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/15 active:bg-emerald-700 disabled:bg-emerald-950/40 disabled:text-white/20 disabled:border disabled:border-white/5",
      secondary: "bg-white/5 hover:bg-white/10 border border-white/10 text-white active:bg-white/15",
      danger: "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 active:bg-rose-500/30",
      ghost: "text-white/60 hover:bg-white/5 hover:text-white active:bg-white/10",
    };

    // Sizes
    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-xl",
      md: "px-4 py-3.5 text-xs rounded-2xl", // Matching Onboarding/Settings defaults (text-xs, py-3.5, rounded-2xl)
      lg: "px-6 py-4 text-sm rounded-2xl",
    };

    // Scale effects
    const scaleClasses = hoverScale && !disabled && !isLoading
      ? "hover:scale-[1.02] active:scale-[0.98]"
      : "";

    const combinedClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${scaleClasses} ${className}`.trim();

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedClasses}
        {...props}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : LeftIcon ? (
          <LeftIcon className="h-4 w-4 shrink-0" />
        ) : null}

        {children}

        {!isLoading && RightIcon && (
          <RightIcon className="h-4 w-4 shrink-0" />
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
