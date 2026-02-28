import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../hooks/useThemeClasses';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost' | 'text';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        className,
        variant = 'primary',
        size = 'md',
        isLoading = false,
        leftIcon,
        rightIcon,
        children,
        disabled,
        ...props
    }, ref) => {

        const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

        const variants = {
            primary: "bg-[color:var(--color-accent-primary)] text-[color:var(--color-text-inverse)] hover:bg-[color:var(--color-accent-hover)] border border-transparent focus:ring-[color:var(--color-accent-primary)]",
            secondary: "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-primary)] border border-[color:var(--color-border-primary)] hover:bg-[color:var(--color-border-primary)]",
            tertiary: "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-primary)] border border-transparent hover:bg-[color:var(--color-border-primary)]",
            danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
            ghost: "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg-tertiary)] hover:text-[color:var(--color-text-primary)]",
            text: "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] underline-offset-4 hover:underline p-0 h-auto"
        };

        const sizes = {
            xs: "h-7 px-2 text-xs",
            sm: "h-9 px-3 text-sm",
            md: "h-10 px-4 py-2",
            lg: "h-11 px-8 text-lg",
            icon: "h-10 w-10 p-2"
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = "Button";

export default Button;
