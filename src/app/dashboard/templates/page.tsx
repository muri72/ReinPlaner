"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { documentService, DocumentTemplate } from "@/lib/services/document-service";
import { TemplateEditor } from "@/components/template-editor";
import { DocumentGeneratorFromTemplates } from "@/components/document-generator-from-templates";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  FileText,
  Eye,
  MoreHorizontal,
  Filter,
} from "lucide-react";

type ViewMode = "list" | "editor" | "generate";
type ActiveTab = "templates" | "generate";

export default function TemplatesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await documentService.getTemplates();
      setTemplates(data);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error("Fehler beim Laden der Vorlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setViewMode("editor");
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setViewMode("editor");
  };

  const handleDelete = async (template: DocumentTemplate) => {
    if (!confirm(`Möchten Sie die Vorlage "${template.name}" wirklich löschen?`)) {
      return;
    }

    try {
      const result = await documentService.deleteTemplate(template.id);
      if (result.success) {
        toast.success("Vorlage gelöscht");
        loadTemplates();
      } else {
        toast.error(`Fehler: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(`Fehler: ${error.message}`);
    }
  };

  const handleSave = (template: DocumentTemplate) => {
    toast.success("Vorlage gespeichert");
    setViewMode("list");
    setSelectedTemplate(null);
    loadTemplates();
  };

  const handleCancel = () => {
    setViewMode("list");
    setSelectedTemplate(null);
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.template_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterCategory === "all" || template.template_type === filterCategory;

    return matchesSearch && matchesFilter;
  });

  const getCategoryBadgeColor = (type: string) => {
    switch (type) {
      case 'employee':
      case 'employment_contract_minijob':
      case 'employment_contract_part_time':
      case 'employment_contract_full_time':
      case 'employment_contract_fixed_term':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'customer':
      case 'customer_cleaning_contract':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'object':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'offer':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'contract':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'employee': 'Mitarbeiter',
      'employment_contract_minijob': 'Arbeitsvertrag (Minijob)',
      'employment_contract_part_time': 'Arbeitsvertrag (Teilzeit)',
      'employment_contract_full_time': 'Arbeitsvertrag (Vollzeit)',
      'employment_contract_fixed_term': 'Arbeitsvertrag (befristet)',
      'customer': 'Kunde',
      'customer_cleaning_contract': 'Reinigungsvertrag',
      'object': 'Objekt',
      'offer': 'Angebot',
      'contract': 'Vertrag',
      'general': 'Allgemein',
      'protocol': 'Protokoll',
      'key_handover_protocol': 'Schlüsselübergabe',
      'agb': 'AGB',
    };
    return labels[category] || category;
  };

  if (viewMode === "editor") {
    return (
      <div className="container mx-auto p-6">
        <TemplateEditor
          templateId={selectedTemplate?.id}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dokumentvorlagen</h2>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Vorlagen und generieren Sie Dokumente
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
        <TabsList>
          <TabsTrigger value="templates">Vorlagen</TabsTrigger>
          <TabsTrigger value="generate">Generieren</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alle Vorlagen</CardTitle>
              <CardDescription>
                {filteredTemplates.length} von {templates.length} Vorlagen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Vorlagen durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Kategorie
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setFilterCategory("all")}>
                      Alle Kategorien
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterCategory("employment_contract_minijob")}>
                      Minijob-Verträge
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterCategory("employment_contract_part_time")}>
                      Teilzeit-Verträge
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterCategory("customer_cleaning_contract")}>
                      Reinigungsverträge
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterCategory("protocol")}>
                      Protokolle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Vorlagen werden geladen...</p>
                  </div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Keine Vorlagen gefunden</p>
                  <p className="text-sm">
                    {searchQuery || filterCategory !== "all"
                      ? "Versuchen Sie andere Suchkriterien"
                      : "Erstellen Sie Ihre erste Vorlage"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-muted-foreground">
                              {template.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryBadgeColor(template.template_type)}>
                            {getCategoryLabel(template.template_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {template.template_type}
                          </code>
                        </TableCell>
                        <TableCell>
                          {template.is_active ? (
                            <Badge variant="outline" className="text-green-600">
                              Aktiv
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600">
                              Inaktiv
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(template.created_at).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(template)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(template)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <DocumentGeneratorFromTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
