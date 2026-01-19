"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownMenu = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-slot="dropdown-menu" {...props}>{children}</div>
const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => <button ref={ref} data-slot="dropdown-menu-trigger" className={className} {...props} />
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="dropdown-menu-content" className={cn("bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md", className)} {...props} />
  )
)
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuGroup = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-slot="dropdown-menu-group" {...props}>{children}</div>

const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; variant?: "default" | "destructive" }>(
  ({ className, inset, variant = "default", ...props }, ref) => (
    <div ref={ref} data-slot="dropdown-menu-item" data-inset={inset} data-variant={variant} className={cn("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className)} {...props} />
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { checked?: boolean }>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} data-slot="dropdown-menu-checkbox-item" className={cn("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
      {children}
    </div>
  )
)
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

const DropdownMenuRadioGroup = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-slot="dropdown-menu-radio-group" {...props}>{children}</div>

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} data-slot="dropdown-menu-radio-item" className={cn("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
      {children}
    </div>
  )
)
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div ref={ref} data-slot="dropdown-menu-label" data-inset={inset} className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)} {...props} />
  )
)
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="dropdown-menu-separator" className={cn("bg-border -mx-1 my-1 h-px", className)} {...props} />
  )
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span data-slot="dropdown-menu-shortcut" className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...props} />
)

const DropdownMenuSub = ({ children }: { children: React.ReactNode }) => <>{children}</>
const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, children, ...props }, ref) => (
    <div ref={ref} data-slot="dropdown-menu-sub-trigger" data-inset={inset} className={cn("focus:bg-accent focus:text-accent-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8", className)} {...props}>
      {children}
    </div>
  )
)
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger"

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="dropdown-menu-sub-content" className={cn("bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg", className)} {...props} />
  )
)
DropdownMenuSubContent.displayName = "DropdownMenuSubContent"

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
