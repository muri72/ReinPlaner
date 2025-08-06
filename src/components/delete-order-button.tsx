"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteOrder } from "@/app/dashboard/orders/actions"; // Korrigierter Import

interface DeleteOrderButtonProps { // DeleteTaskButtonProps zu DeleteOrderButtonProps
  orderId: string; // taskId zu orderId
}

export function DeleteOrderButton({ orderId }: DeleteOrderButtonProps) { // taskId zu orderId
  const [loading, setLoading] = useState(false);

  const handleDelete = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);

    const result = await deleteOrder(formData); // deleteTask zu deleteOrder

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleDelete}>
      <input type="hidden" name="orderId" value={orderId} /> {/* taskId zu orderId */}
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive/80"
        type="submit"
        disabled={loading}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}