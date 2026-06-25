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
        pl: Icon ? "pl-8" : "px-3", // Fallback to px if no icon
        pr: isPassword ? "pr-8" : "px-3",
        iconLeftClass: "left-2.5",
        iconRightClass: "right-2.5"
      },
      md: {
        rounded: "rounded-xl",
        textSize: "text-xs",
        py: "py-2.5",
        pl: Icon ? "pl-10" : "px-3.5",
        pr: isPassword ? "pr-10" : "px-3.5",
        iconLeftClass: "left-3",
        iconRightClass: "right-3"
      },
      lg: {
        rounded: "rounded-2xl",
        textSize: "text-sm",
        py: "py-3",
        pl: Icon ? "pl-13" : "px-4",
        pr: isPassword ? "pr-13" : "px-4",
        iconLeftClass: "left-4",
        iconRightClass: "right-4"
      }
    }[size];

    // Smart class overriding to avoid conflicts and retain look & feel
    const bgClass = className.includes("bg-") ? "" : "bg-white/5";
    
    const borderClass = error
      ? "border-rose-500/40 focus:border-rose-500/60"
      : `${className.includes("border-") ? "" : "border-white/10"} ${className.includes("focus:border-") ? "" : "focus:border-emerald-500/40"}`;
      
    const roundedClass = className.includes("rounded-") ? "" : sizeConfig.rounded;
    
    // Separate vertical and horizontal (left/right) paddings to prevent overriding issues
    const pyClass = className.includes("py-") ? "" : sizeConfig.py;
    
    // Check pl- and pr- independently so left padding works even if right is overridden (like for kg/cm suffixes)
    const hasPx = className.includes("px-");
    const plClass = (className.includes("pl-") || hasPx) ? "" : (sizeConfig.pl.startsWith("pl-") ? sizeConfig.pl : sizeConfig.pl.split(" ")[0]);
    const prClass = (className.includes("pr-") || hasPx) ? "" : (sizeConfig.pr.startsWith("pr-") ? sizeConfig.pr : sizeConfig.pr.split(" ")[1] || sizeConfig.pr.split(" ")[0]);

    const baseClasses = "w-full text-white placeholder-white/20 outline-none transition duration-200 border";
    const combinedClasses = `${baseClasses} ${bgClass} ${borderClass} ${roundedClass} ${sizeConfig.textSize} ${pyClass} ${plClass} ${prClass} ${className}`.trim();

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
