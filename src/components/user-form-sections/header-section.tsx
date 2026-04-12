"use client";

interface UserFormHeaderProps {
  isEditMode: boolean;
  isInDialog: boolean;
}

export function UserFormHeader({ isEditMode, isInDialog }: UserFormHeaderProps) {
  if (isInDialog) return null;

  return (
    <div className="space-y-1 mb-6">
      <h2 className="text-2xl font-bold tracking-tight">
        Benutzer {isEditMode ? "bearbeiten" : "erstellen"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {isEditMode 
          ? "Bearbeiten Sie die Benutzerinformationen." 
          : "Erstellen Sie einen neuen Benutzer."}
      </p>
    </div>
  );
}
