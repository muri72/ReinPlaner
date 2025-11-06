"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Trash2, ExternalLink, FileWarning } from "lucide-react";
import { getDocuments, deleteDocument } from "@/app/dashboard/documents/actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { handleActionResponse } from "@/lib/toast-utils";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: string;
  description: string | null;
  created_at: string;
  public_url: string; // Added by the server action
}

interface DocumentListProps {
  associatedEmployeeId?: string;
  associatedCustomerId?: string;
  associatedOrderId?: string;
  associatedObjectId?: string;
  onDocumentChange?: () => void; // Callback for when documents are added/deleted
}

export function DocumentList({
  associatedEmployeeId,
  associatedCustomerId,
  associatedOrderId,
  associatedObjectId,
  onDocumentChange,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    const filters = {
      employeeId: associatedEmployeeId,
      customerId: associatedCustomerId,
      orderId: associatedOrderId,
      objectId: associatedObjectId,
    };
    const result = await getDocuments(filters);
    if (result.success && result.data) {
      setDocuments(result.data as Document[]);
    } else {
      toast.error(result.message || "Fehler beim Laden der Dokumente.");
      setDocuments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [associatedEmployeeId, associatedCustomerId, associatedOrderId, associatedObjectId]);

  const handleDelete = async (documentId: string, filePath: string) => {
    setDeletingId(documentId);
    const result = await deleteDocument(documentId, filePath);
    handleActionResponse(result);
    if (result.success) {
      fetchDocuments(); // Re-fetch documents after deletion
      onDocumentChange?.();
    }
    setDeletingId(null);
  };

  const getDocumentTypeTranslation = (type: string) => {
    switch (type) {
      case 'employment_contract': return 'Arbeitsvertrag';
      case 'customer_contract': return 'Kundenvertrag';
      case 'invoice': return 'Rechnung';
      case 'report': return 'Bericht';
      case 'other': return 'Sonstiges';
      default: return type;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <FileWarning className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-base font-semibold">Keine Dokumente gefunden</p>
        <p className="text-sm">Fügen Sie Dokumente hinzu, um sie hier anzuzeigen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="shadow-elevation-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-grow min-w-0">
              <FileText className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">{doc.file_name}</span>
                <span className="text-xs text-muted-foreground">
                  {getDocumentTypeTranslation(doc.document_type)} &bull; {formatFileSize(doc.file_size)} &bull; Hochgeladen am {format(new Date(doc.created_at), 'dd.MM.yyyy', { locale: de })}
                </span>
                {doc.description && (
                  <span className="text-xs text-muted-foreground italic truncate mt-1">
                    {doc.description}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.public_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dokument öffnen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.public_url} download={doc.file_name}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dokument herunterladen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/80"
                          disabled={deletingId === doc.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sind Sie sicher, dass Sie das Dokument "{doc.file_name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc.id, doc.file_path)} disabled={deletingId === doc.id}>
                            {deletingId === doc.id ? "Löschen..." : "Löschen"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dokument löschen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}