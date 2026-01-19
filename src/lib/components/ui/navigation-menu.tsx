"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { viewport?: boolean }>(
  ({ className, children, viewport = true, ...props }, ref) => (
    <div ref={ref} data-slot="navigation-menu" data-viewport={viewport} className={cn("group/navigation-menu relative flex max-w-max flex-1 items-center justify-center", className)} {...props}>
      {children}
      {viewport && <NavigationMenuViewport />}
    </div>
  )
)
NavigationMenu.displayName = "NavigationMenu"

const NavigationMenuList = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} data-slot="navigation-menu-list" className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)} {...props} />
  )
)
NavigationMenuList.displayName = "NavigationMenuList"

const NavigationMenuItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li ref={ref} data-slot="navigation-menu-item" className={cn("relative", className)} {...props} />
)
NavigationMenuItem.displayName = "NavigationMenuItem"

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:focus:bg-accent data-[state=open]:bg-accent/50 focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1"
)

const NavigationMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button ref={ref} data-slot="navigation-menu-trigger" className={cn(navigationMenuTriggerStyle(), "group", className)} {...props}>
      {children}
    </button>
  )
)
NavigationMenuTrigger.displayName = "NavigationMenuTrigger"

const NavigationMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="navigation-menu-content" className={cn("top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto", className)} {...props} />
  )
)
NavigationMenuContent.displayName = "NavigationMenuContent"

const NavigationMenuViewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className="absolute top-full left-0 isolate z-50 flex justify-center">
      <div ref={ref} data-slot="navigation-menu-viewport" className={cn("origin-top-center bg-popover text-popover-foreground relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border shadow md:w-[var(--radix-navigation-menu-viewport-width)]", className)} {...props} />
    </div>
  )
)
NavigationMenuViewport.displayName = "NavigationMenuViewport"

const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ className, ...props }, ref) => (
    <a ref={ref} data-slot="navigation-menu-link" className={cn("data-[active=true]:focus:bg-accent data-[active=true]:hover:bg-accent data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/50 flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1", className)} {...props} />
  )
)
NavigationMenuLink.displayName = "NavigationMenuLink"

const NavigationMenuIndicator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="navigation-menu-indicator" className={cn("data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden", className)} {...props}>
      <div className="bg-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm shadow-md" />
    </div>
  )
)
NavigationMenuIndicator.displayName = "NavigationMenuIndicator"

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
