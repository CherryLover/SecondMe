import * as React from "react"
import { cn } from "@/lib/utils"

// Select Root
interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <div className="relative" data-select-value={value} data-select-change={onValueChange ? "true" : "false"}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { value, onValueChange })
        }
        return child
      })}
    </div>
  )
}

// Select Trigger
interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, value, onValueChange, ...props }, ref) => {
    const [open, setOpen] = React.useState(false)

    return (
      <>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-sm border border-ink/10 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:focus:ring-darkAccent",
            className
          )}
          onClick={() => setOpen(!open)}
          {...props}
        >
          {children}
          <svg
            className="h-4 w-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {open && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
        )}
      </>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

// Select Value
interface SelectValueProps {
  placeholder?: string
  value?: string
}

export function SelectValue({ placeholder, value }: SelectValueProps) {
  return <span>{value || placeholder}</span>
}

// Select Content
interface SelectContentProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function SelectContent({ value, onValueChange, children, className }: SelectContentProps) {
  const [open, setOpen] = React.useState(true)

  if (!open) return null

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-ink/10 bg-white p-1 shadow-md dark:border-white/10 dark:bg-darkPaper",
        className
      )}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          const childProps = child.props as any
          return React.cloneElement(child as React.ReactElement<any>, {
            selected: childProps.value === value,
            onClick: () => {
              onValueChange?.(childProps.value)
              setOpen(false)
            }
          })
        }
        return child
      })}
    </div>
  )
}

// Select Item
interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  selected?: boolean
  children: React.ReactNode
}

export const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ className, children, selected, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted/10 dark:hover:bg-white/5",
          selected && "bg-accent/10 text-accent dark:bg-darkAccent/10 dark:text-darkAccent",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
SelectItem.displayName = "SelectItem"
