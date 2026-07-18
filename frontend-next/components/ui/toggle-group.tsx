// @ts-check
"use client";
import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<{
  size: "default" | "sm" | "lg"
  variant: "default" | "outline"
}>({
  size: "default",
  variant: "default",
})

type ToggleGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string
  type?: "single" | "multiple"
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}
const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(({ className, variant, size, children, type = "single", ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref as any}
    type={type as any}
    className={cn("flex items-center justify-center gap-1", className)}
    {...(props as any)}>
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

type ToggleGroupItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string
  value?: string
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}
const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(({ className, children, variant, size, value, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    (<ToggleGroupPrimitive.Item
      ref={ref}
      value={value}
      className={cn(toggleVariants({
        variant: (context.variant || variant || "default") as "default" | "outline",
        size: (context.size || size || "default") as "default" | "sm" | "lg",
      }), className)}
      {...props}>
      {children}
    </ToggleGroupPrimitive.Item>)
  );
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }

