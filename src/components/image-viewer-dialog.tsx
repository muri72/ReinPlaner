"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import NextImage from "next/image";
// Removed import: VisuallyHidden (as sr-only will be used)

interface ImageViewerDialogProps {
  src: string;
  alt: string;
  trigger?: React.ReactNode; // Optional trigger element
  onOpenChange?: (open: boolean) => void;
}

export function ImageViewerDialog({ src, alt, trigger, onOpenChange }: ImageViewerDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = `image-viewer-dialog-title`;
  const descriptionId = `image-viewer-dialog-description`;

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent 
        key={open ? "image-viewer-open" : "image-viewer-closed"} 
        className="sm:max-w-[90vw] max-h-[90vh] overflow-hidden p-0 border-none bg-transparent shadow-none glassmorphism-card"
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle id={titleId} className="sr-only">Bildansicht</DialogTitle>
          <DialogDescription id={descriptionId} className="sr-only">
            Vollansicht des Bildes.
          </DialogDescription>
        </DialogHeader>

        {/* Close button, outside DialogHeader */}
        <Button variant="ghost" size="icon" onClick={() => handleOpenChange(false)} className="absolute top-4 right-4 z-50 text-white hover:bg-white/20">
          <X className="h-6 w-6" />
        </Button>

        <div className="relative w-full h-full flex items-center justify-center">
          <NextImage
            src={src}
            alt={alt}
            layout="fill"
            objectFit="contain"
            className="rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}