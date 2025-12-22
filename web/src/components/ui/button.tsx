import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-paper hover:bg-ink/90 dark:bg-darkInk dark:text-darkPaper dark:hover:bg-darkInk/90",
        destructive:
          "bg-red-500 text-white hover:bg-red-600",
        outline:
          "border border-ink/10 bg-transparent hover:bg-ink/5 dark:border-white/10 dark:hover:bg-white/5",
        secondary:
          "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/5 dark:text-darkInk dark:hover:bg-white/10",
        ghost:
          "hover:bg-ink/5 dark:hover:bg-white/5",
        link:
          "text-accent underline-offset-4 hover:underline dark:text-darkAccent",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-sm",
        sm: "h-8 px-3 text-xs rounded-sm",
        lg: "h-10 px-8 rounded-sm",
        icon: "h-9 w-9 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
