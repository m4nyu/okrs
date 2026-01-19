"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const ContextMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuSub = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>

const ContextMenuSubTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, children, ...props }, ref) => (
    <div ref={ref} data-slot="context-menu-sub-trigger" data-inset={inset} className={cn("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8", className)} {...props}>
      {children}
    </div>
  )
)
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger"

const ContextMenuSubContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="context-menu-sub-content" className={cn("bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg", className)} {...props} />
  )
)
ContextMenuSubContent.displayName = "ContextMenuSubContent"

const ContextMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="context-menu-content" className={cn("bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md", className)} {...props} />
  )
)
ContextMenuContent.displayName = "ContextMenuContent"

const ContextMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; variant?: "default" | "destructive" }>(
  ({ className, inset, variant = "default", ...props }, ref) => (
    <div ref={ref} data-slot="context-menu-item" data-inset={inset} data-variant={variant} className={cn("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8", className)} {...props} />
  )
)
ContextMenuItem.displayName = "ContextMenuItem"

const ContextMenuCheckboxItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { checked?: boolean }>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} data-slot="context-menu-checkbox-item" className={cn("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
      {children}
    </div>
  )
)
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem"

const ContextMenuRadioItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} data-slot="context-menu-radio-item" className={cn("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
      {children}
    </div>
  )
)
ContextMenuRadioItem.displayName = "ContextMenuRadioItem"

const ContextMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div ref={ref} data-slot="context-menu-label" data-inset={inset} className={cn("text-foreground px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)} {...props} />
  )
)
ContextMenuLabel.displayName = "ContextMenuLabel"

const ContextMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="context-menu-separator" className={cn("bg-border -mx-1 my-1 h-px", className)} {...props} />
  )
)
ContextMenuSeparator.displayName = "ContextMenuSeparator"

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span data-slot="context-menu-shortcut" className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...props} />
)

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
