"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface CopyFeedbackLinkButtonProps {
  orderId: string;
}

export function CopyFeedbackLinkButton({ orderId }: CopyFeedbackLinkButtonProps) {
  const handleCopy = () => {
    const feedbackUrl = `${window.location.origin}/feedback/${orderId}`;
    navigator.clipboard.writeText(feedbackUrl);
    toast.success("Feedback-Link in die Zwischenablage kopiert!");
  };

  return (
    <Button variant="outline" onClick={handleCopy}>
      <Copy className="mr-2 h-4 w-4" />
      Feedback-Link kopieren
    </Button>
  );
}