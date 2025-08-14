"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import NextImage from "next/image";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
      >
        <DialogHeader className="absolute top-4 right-4 z-50">
          <DialogTitle id={titleId}>Bildansicht</DialogTitle>
          <DialogDescription>Vollansicht des Bildes.</DialogDescription>
          <Button variant="ghost" size="icon" onClick={() => handleOpenChange(false)} className="text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </Button>
        </DialogHeader>
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