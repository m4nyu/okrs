"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Menubar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="menubar" className={cn("bg-background flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs", className)} {...props} />
  )
)
Menubar.displayName = "Menubar"

const MenubarMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>
const MenubarGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
const MenubarPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const MenubarRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>

const MenubarTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button ref={ref} data-slot="menubar-trigger" className={cn("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none", className)} {...props} />
  )
)
MenubarTrigger.displayName = "MenubarTrigger"

const MenubarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="menubar-content" className={cn("bg-popover text-popover-foreground z-50 min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-md", className)} {...props} />
  )
)
MenubarContent.displayName = "MenubarContent"

const MenubarItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; variant?: "default" | "destructive" }>(
  ({ className, inset, variant = "default", ...props }, ref) => (
    <div ref={ref} data-slot="menubar-item" data-inset={inset} data-variant={variant} className={cn("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8", className)} {...props} />
  )
)
MenubarItem.displayName = "MenubarItem"

const MenubarCheckboxItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { checked?: boolean }>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} data-slot="menubar-checkbox-item" className={cn("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
      {children}
    </div>
  )
)
MenubarCheckboxItem.displayName = "MenubarCheckboxItem"

const MenubarRadioItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} data-slot="menubar-radio-item" className={cn("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
      {children}
    </div>
  )
)
MenubarRadioItem.displayName = "MenubarRadioItem"

const MenubarLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div ref={ref} data-slot="menubar-label" data-inset={inset} className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)} {...props} />
  )
)
MenubarLabel.displayName = "MenubarLabel"

const MenubarSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="menubar-separator" className={cn("bg-border -mx-1 my-1 h-px", className)} {...props} />
  )
)
MenubarSeparator.displayName = "MenubarSeparator"

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span data-slot="menubar-shortcut" className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...props} />
)

const MenubarSub = ({ children }: { children: React.ReactNode }) => <>{children}</>
const MenubarSubTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, children, ...props }, ref) => (
    <div ref={ref} data-slot="menubar-sub-trigger" data-inset={inset} className={cn("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8", className)} {...props}>
      {children}
    </div>
  )
)
MenubarSubTrigger.displayName = "MenubarSubTrigger"

const MenubarSubContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="menubar-sub-content" className={cn("bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg", className)} {...props} />
  )
)
MenubarSubContent.displayName = "MenubarSubContent"

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
}
