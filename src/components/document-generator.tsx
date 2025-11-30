"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { documentService, DocumentTemplate } from "@/lib/services/document-service";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

const supabase = createClient();

interface DocumentGeneratorProps {
  entityType?: 'employee' | 'customer' | 'object';
  entityId?: string;
  onGenerated?: (document: any) => void;
}

interface EntityData {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  company_name?: string;
  [key: string]: any;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string;
}

interface Object {
  id: string;
  name: string;
}

const generateDocumentSchema = z.object({
  templateId: z.string().min(1, "Vorlage auswählen"),
  entityId: z.string().optional(),
  customData: z.record(z.any()).optional(),
});

type GenerateDocumentForm = z.infer<typeof generateDocumentSchema>;

export function DocumentGenerator({ entityType, entityId, onGenerated }: DocumentGeneratorProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [entityData, setEntityData] = useState<EntityData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [objects, setObjects] = useState<Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [activeTab, setActiveTab] = useState("select");
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [customData, setCustomData] = useState<Record<string, any>>({});

  const form = useForm<GenerateDocumentForm>({
    resolver: zodResolver(generateDocumentSchema),
    defaultValues: {
      templateId: "",
      entityId: entityId || "",
      customData: {},
    },
  });

  const selectedTemplateId = form.watch("templateId");
  const selectedEntityId = form.watch("entityId");

  useEffect(() => {
    loadInitialData();
  }, [entityType, entityId]);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
        generatePreview(template.id);
      }
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (selectedEntityId && selectedEntityId !== entityId) {
      loadEntityData(selectedEntityId);
    }
  }, [selectedEntityId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load templates
      const allTemplates = await documentService.getTemplates();
      const filteredTemplates = allTemplates.filter((t) => t.is_active);
      setTemplates(filteredTemplates);

      // Load entities for selection (if no specific entityId provided)
      if (!entityId) {
        const [employeesRes, customersRes, objectsRes] = await Promise.all([
          supabase.from('employees').select('id, first_name, last_name').eq('status', 'active'),
          supabase.from('customers').select('id, first_name, last_name, company_name').eq('status', 'active'),
          supabase.from('objects').select('id, name'),
        ]);

        if (employeesRes.data) setEmployees(employeesRes.data);
        if (customersRes.data) setCustomers(customersRes.data);
        if (objectsRes.data) setObjects(objectsRes.data);
      }

      // Load entity data if specific entityId provided
      if (entityId && entityType) {
        await loadEntityData(entityId);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const loadEntityData = async (id: string) => {
    const currentEntityType = form.getValues("entityId") === entityId ? entityType : form.watch("entityId");
    const tableName = currentEntityType === 'employee' ? 'employees' : currentEntityType === 'customer' ? 'customers' : 'objects';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading entity:', error);
      toast.error("Fehler beim Laden der Entitätsdaten");
    } else {
      setEntityData(data);
    }
  };

  const generatePreview = async (templateId: string) => {
    if (!entityData || !entityType || !entityId) return;

    try {
      const result = await documentService.generateDocument(templateId, entityType, entityId, customData);

      if (result.success && result.data) {
        setPreviewHtml(result.data.content);

        // Check for missing variables (empty placeholders)
        const emptyVariables = extractMissingVariables(result.data.content);
        setMissingVariables(emptyVariables);
      } else {
        toast.error(`Fehler: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error generating preview:', error);
      toast.error("Fehler bei der Vorschau-Generierung");
    }
  };

  const extractMissingVariables = (content: string): string[] => {
    const placeholderPattern = /\{\{\s*([^}]+)\s*\}\}/g;
    const missing: string[] = [];
    let match;

    while ((match = placeholderPattern.exec(content)) !== null) {
      const variable = match[1].trim();
      if (variable.startsWith('#') || variable.startsWith('/') || variable.startsWith('!')) {
        continue;
      }

      const variableName = variable.split(' ')[0];
      const value = getNestedValue({ ...entityData, custom: customData }, variableName);

      if (!value || value === "") {
        missing.push(variableName);
      }
    }

    return [...new Set(missing)];
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };

  const handleGenerate = async (data: GenerateDocumentForm) => {
    if (!entityType || !entityId) {
      toast.error("Entität nicht ausgewählt");
      return;
    }

    setGenerating(true);
    try {
      const result = await documentService.generateAndDownloadPDF(
        data.templateId,
        entityType,
        entityId,
        data.customData
      );

      if (result.success) {
        toast.success("PDF wird heruntergeladen");
        if (onGenerated) {
          onGenerated(result);
        }
      } else {
        toast.error(`Fehler: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error("Fehler bei der PDF-Generierung");
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomDataChange = (key: string, value: any) => {
    const newCustomData = { ...customData, [key]: value };
    setCustomData(newCustomData);

    // Regenerate preview with new custom data
    if (selectedTemplateId) {
      generatePreview(selectedTemplateId);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Daten werden geladen...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entityData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Entitätsdaten konnten nicht geladen werden.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dokument generieren</CardTitle>
          <CardDescription>
            Erstellen Sie ein PDF-Dokument basierend auf einer Vorlage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="select">1. Vorlage wählen</TabsTrigger>
                <TabsTrigger value="data">2. Daten prüfen</TabsTrigger>
                <TabsTrigger value="preview">3. Vorschau & Export</TabsTrigger>
              </TabsList>

              <TabsContent value="select" className="space-y-4">
                <div className="space-y-2">
                  <Label>Vorlage auswählen</Label>
                  <Select
                    value={form.watch("templateId")}
                    onValueChange={(value) => form.setValue("templateId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen Sie eine Vorlage..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{template.name}</div>
                              {template.description && (
                                <div className="text-xs text-muted-foreground">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.templateId && (
                    <p className="text-sm text-red-500">{form.formState.errors.templateId.message}</p>
                  )}
                </div>

                {selectedTemplate && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">{selectedTemplate.name}</div>
                      {selectedTemplate.description}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="button"
                  onClick={() => setActiveTab("data")}
                  disabled={!selectedTemplateId}
                  className="w-full"
                >
                  Weiter zu Dateneingabe
                </Button>
              </TabsContent>

              <TabsContent value="data" className="space-y-4">
                {missingVariables.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Fehlende Daten erkannt</div>
                      <p className="text-sm mb-3">
                        Die folgenden Variablen müssen noch ausgefüllt werden:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {missingVariables.map((variable) => (
                          <Badge key={variable} variant="destructive">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Verfügbare Daten</h3>
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <pre className="text-sm overflow-auto">
                        {JSON.stringify(entityData, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {missingVariables.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Zusätzliche Daten eingeben</h3>
                      <div className="space-y-3">
                        {missingVariables.map((variable) => (
                          <div key={variable} className="space-y-2">
                            <Label htmlFor={variable}>{variable}</Label>
                            <Input
                              id={variable}
                              placeholder={`Wert für ${variable} eingeben`}
                              onChange={(e) => handleCustomDataChange(variable, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("select")}>
                    Zurück
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className="flex-1"
                  >
                    Weiter zur Vorschau
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Dokumentvorschau</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generatePreview(selectedTemplateId!)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Aktualisieren
                    </Button>
                  </div>

                  <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                    {previewHtml ? (
                      <pre className="whitespace-pre-wrap text-sm font-serif">
                        {previewHtml}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <div className="text-center">
                          <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Vorschau wird generiert...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {missingVariables.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">Warnung</div>
                      <p className="text-sm">
                        Es wurden leere Variablen erkannt. Das Dokument wird möglicherweise unvollständig sein.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("data")}>
                    Zurück
                  </Button>
                  <Button
                    type="submit"
                    disabled={generating || !selectedTemplateId}
                    className="flex-1"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        PDF wird generiert...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        PDF herunterladen
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
