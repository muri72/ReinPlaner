import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Mobile-first: larger min-height, 16px font prevents iOS zoom
          "flex min-h-[120px] md:min-h-[80px] w-full rounded-md border border-input",
          "bg-background/60 backdrop-blur-sm px-3 py-3 md:py-2",
          "text-base md:text-sm", // 16px mobile, 14px desktop
          "ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-y", // Allow vertical resize only
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }