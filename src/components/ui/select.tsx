"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

function Select({ ...props }: SelectPrimitive.Root.Props<string>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

function SelectTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 data-[popup-open]:border-ring dark:bg-input/30 dark:disabled:bg-input/80",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        data-slot="select-icon"
        className="ml-auto shrink-0 text-muted-foreground"
      >
        <ChevronDown className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  alignItemWithTrigger,
  children,
  className,
  positionerClassName,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> & {
  alignItemWithTrigger?: boolean
  positionerClassName?: string
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align="start"
        alignItemWithTrigger={alignItemWithTrigger}
        className={cn("z-50", positionerClassName)}
        sideOffset={4}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-72 min-w-[var(--anchor-width)] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List data-slot="select-list" className="p-1">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  children,
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-8 cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[selected]:font-medium",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="min-w-0 flex-1">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex size-4 items-center justify-center">
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
}
