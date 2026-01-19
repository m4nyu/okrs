"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const ToggleGroupContext = React.createContext<{ variant?: string; size?: string }>({
  size: "default",
  variant: "default",
})

const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: string; size?: string; type?: string }
>(({ className, variant, size, children, ...props }, ref) => (
  <div ref={ref} data-slot="toggle-group" data-variant={variant} data-size={size} className={cn("group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs", className)} {...props}>
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </div>
))
ToggleGroup.displayName = "ToggleGroup"

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string; variant?: string; size?: string }
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)
  const finalVariant = context.variant || variant
  const finalSize = context.size || size

  return (
    <button
      ref={ref}
      data-slot="toggle-group-item"
      data-variant={finalVariant}
      data-size={finalSize}
      className={cn(
        "inline-flex items-center justify-center text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        finalVariant === "outline" && "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
        finalSize === "sm" && "h-8 px-2",
        finalSize === "lg" && "h-10 px-3",
        (!finalSize || finalSize === "default") && "h-9 px-3",
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
