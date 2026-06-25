import React, { useState, InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: React.ComponentType<{ className?: string }>;
  error?: string;
  containerClassName?: string;
  size?: "sm" | "md" | "lg";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      icon: Icon,
      error,
      type = "text",
      className = "",
      containerClassName = "",
      size = "md",
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    // Standard size configs matching original project values precisely
    const sizeConfig = {
      sm: {
        rounded: "rounded-lg",
        textSize: "text-xs",
        py: "py-1.5",
        px: `${Icon ? "pl-8" : "px-3"} ${isPassword ? "pr-8" : "px-3"}`,
        iconLeftClass: "left-2.5",
        iconRightClass: "right-2.5"
      },
      md: {
        rounded: "rounded-xl",
        textSize: "text-xs",
        py: "py-2.5",
        px: `${Icon ? "pl-9" : "px-3.5"} ${isPassword ? "pr-9" : "px-3.5"}`,
        iconLeftClass: "left-3",
        iconRightClass: "right-3"
      },
      lg: {
        rounded: "rounded-2xl",
        textSize: "text-sm",
        py: "py-3",
        px: `${Icon ? "pl-11" : "px-4"} ${isPassword ? "pr-11" : "px-4"}`,
        iconLeftClass: "left-3.5",
        iconRightClass: "right-3.5"
      }
    }[size];

    // Smart class overriding to avoid conflicts and retain look & feel
    const bgClass = className.includes("bg-") ? "" : "bg-white/5";
    
    const borderClass = error
      ? "border-rose-500/40 focus:border-rose-500/60"
      : `${className.includes("border-") ? "" : "border-white/10"} ${className.includes("focus:border-") ? "" : "focus:border-emerald-500/40"}`;
      
    const roundedClass = className.includes("rounded-") ? "" : sizeConfig.rounded;
    
    // Separate horizontal and vertical padding checks to prevent wiping out both when overriding one
    const pyClass = className.includes("py-") ? "" : sizeConfig.py;
    const pxClass = (className.includes("px-") || className.includes("pl-") || className.includes("pr-")) ? "" : sizeConfig.px;

    const baseClasses = "w-full text-white placeholder-white/20 outline-none transition duration-200 border";
    const combinedClasses = `${baseClasses} ${bgClass} ${borderClass} ${roundedClass} ${sizeConfig.textSize} ${pyClass} ${pxClass} ${className}`.trim();

    return (
      <div className={`relative w-full ${containerClassName}`}>
        {Icon && (
          <div className={`absolute ${sizeConfig.iconLeftClass} top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-white/30`}>
            <Icon className="h-4 w-4 shrink-0" />
          </div>
        )}

        <input
          ref={ref}
          type={inputType}
          className={combinedClasses}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute ${sizeConfig.iconRightClass} top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 p-1 rounded-lg transition`}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}

        {error && (
          <span className="block mt-1 text-[10px] text-rose-400 font-bold leading-none pl-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
