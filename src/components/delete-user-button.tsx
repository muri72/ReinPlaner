"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteUser } from "@/app/dashboard/users/actions";

interface DeleteUserButtonProps {
  userId: string;
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);

    const result = await deleteUser(formData);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleDelete}>
      <input type="hidden" name="userId" value={userId} />
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