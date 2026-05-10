"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { SimpleListSkeleton } from "@/components/simple-list-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  FileText,
  Download,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  FileIcon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { deleteDocument, getDocuments } from "./actions";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: string;
  description: string | null;
  public_url?: string;
  created_at: string;
  associated_employee_id: string | null;
  associated_customer_id: string | null;
  associated_order_id: string | null;
  associated_object_id: string | null;
}

const documentTypeLabels: Record<string, string> = {
  employment_contract: 'Arbeitsvertrag',
  employment_contract_minijob: 'Arbeitsvertrag (Minijob)',
  employment_contract_part_time: 'Arbeitsvertrag (Teilzeit)',
  employment_contract_full_time: 'Arbeitsvertrag (Vollzeit)',
  employment_contract_fixed_term: 'Arbeitsvertrag (befristet)',
  customer_cleaning_contract: 'Reinigungsvertrag',
  customer_contract: 'Kundenvertrag',
  offer: 'Angebot',
  protocol: 'Protokoll',
  key_handover_protocol: 'Schlüsselübergabe',
  general: 'Allgemein',
  other: 'Sonstiges',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DocumentsPage() {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const fetchDocuments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    setUserRole(profile?.role || null);

    // Only admin/manager can access documents page
    if (profile?.role !== 'admin' && profile?.role !== 'manager') {
      redirect("/dashboard");
      return;
    }

    const result = await getDocuments({});
    if (result.success && result.data) {
      setDocuments(result.data as Document[]);
    } else {
      console.error("Fehler beim Laden der Dokumente:", result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (doc: Document) => {
    const result = await deleteDocument(doc.id, doc.file_path);
    if (result.success) {
      toast.success(result.message);
      fetchDocuments();
    } else {
      toast.error(result.message);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesFilter = filterType === 'all' || doc.document_type === filterType;

    return matchesSearch && matchesFilter;
  });

  const getDocumentTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'employment_contract':
      case 'employment_contract_minijob':
      case 'employment_contract_part_time':
      case 'employment_contract_full_time':
      case 'employment_contract_fixed_term':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'customer_cleaning_contract':
      case 'customer_contract':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'offer':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'protocol':
      case 'key_handover_protocol':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const uniqueDocumentTypes = Array.from(
    new Set(documents.map((d) => d.document_type).filter(Boolean))
  );

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader
        title="Dokumente"
        loading={loading}
      />

      <Card className="dashboard-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Alle Dokumente</CardTitle>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Dokumente durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full md:w-64"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    {filterType === 'all' ? 'Alle Typen' : documentTypeLabels[filterType] || filterType}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setFilterType('all')}>
                    Alle Typen
                  </DropdownMenuItem>
                  {uniqueDocumentTypes.map((type) => (
                    <DropdownMenuItem key={type} onClick={() => setFilterType(type)}>
                      {documentTypeLabels[type] || type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {filteredDocuments.length > 0 && !loading && (
            <CardDescription className="mt-2">
              {filteredDocuments.length} von {documents.length} Dokumenten
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <SimpleListSkeleton count={5} />
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">
                {searchQuery || filterType !== 'all'
                  ? 'Keine Dokumente gefunden'
                  : 'Keine Dokumente vorhanden'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || filterType !== 'all'
                  ? 'Versuchen Sie andere Suchkriterien'
                  : 'Hochgeladene und generierte Dokumente werden hier erscheinen'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dokument</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Größe</TableHead>
                  <TableHead>Hochgeladen</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{doc.file_name}</span>
                          {doc.description && (
                            <span className="text-xs text-muted-foreground">
                              {doc.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDocumentTypeBadgeColor(doc.document_type)}>
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatFileSize(doc.file_size)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.public_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a
                              href={doc.public_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.file_name}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Das Dokument "{doc.file_name}" wird dauerhaft gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(doc)}>
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}