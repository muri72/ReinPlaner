"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Custom styles for different types
          success: "group-[.toast]:bg-success group-[.toast]:text-success-foreground group-[.toast]:border-success",
          error: "group-[.toast]:bg-destructive group-[.toast]:text-destructive-foreground group-[.toast]:border-destructive",
          warning: "group-[.toast]:bg-warning group-[.toast]:text-warning-foreground group-[.toast]:border-warning",
          info: "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:border-secondary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }