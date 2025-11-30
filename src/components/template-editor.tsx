"use client";

import { useState, useEffect, useMemo } from "react";
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
import { toast } from "sonner";
import { documentService, DocumentTemplate } from "@/lib/services/document-service";
import {
  Save,
  Eye,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Variable,
  Info,
  Copy,
  Download,
} from "lucide-react";

const templateSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  category: z.enum(["employee", "customer", "object", "offer", "contract", "general"]),
  type: z.string().min(1, "Typ ist erforderlich"),
  content: z.string().min(1, "Inhalt ist erforderlich"),
  description: z.string().optional(),
});

type TemplateForm = z.infer<typeof templateSchema>;

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean' | 'text' | 'array';
  label: string;
  required: boolean;
  default_value?: string;
}

interface TemplateEditorProps {
  templateId?: string;
  onSave?: (template: DocumentTemplate) => void;
  onCancel?: () => void;
}

export function TemplateEditor({ templateId, onSave, onCancel }: TemplateEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<Partial<DocumentTemplate> | null>(null);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState("editor");

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: "",
      category: "employee",
      type: "",
      content: "",
      description: "",
    },
  });

  const watchedContent = form.watch("content");

  // Extract variables from template content
  useEffect(() => {
    if (!watchedContent) {
      setVariables([]);
      return;
    }

    const extractVariables = (content: string) => {
      const variablePattern = /\{\{\s*([^}]+)\s*\}\}/g;
      const matches = new Set<string>();
      let match;

      while ((match = variablePattern.exec(content)) !== null) {
        let variable = match[1].trim();

        // Skip helpers
        if (variable.startsWith('#') || variable.startsWith('/') || variable.startsWith('!')) {
          continue;
        }

        // Get the variable name (handle dots for nested properties)
        const variableName = variable.split(' ')[0];

        if (variableName && !matches.has(variableName)) {
          matches.add(variableName);
        }
      }

      return Array.from(matches);
    };

    const extractedVars = extractVariables(watchedContent);
    const newVariables: TemplateVariable[] = extractedVars.map((name) => {
      // Try to infer type from name
      let type: TemplateVariable['type'] = 'text';
      let label = name;

      if (name.includes('date') || name.includes('birth') || name.includes('start')) {
        type = 'date';
        label = label.replace(/_/g, ' ');
      } else if (name.includes('rate') || name.includes('wage') || name.includes('price') || name.includes('amount')) {
        type = 'currency';
        label = label.replace(/_/g, ' ');
      } else if (name.includes('hours') || name.includes('count') || name.includes('number')) {
        type = 'number';
        label = label.replace(/_/g, ' ');
      } else if (name.includes('address') || name.includes('text') || name.includes('description') || name.includes('duties')) {
        type = 'text';
        label = label.replace(/_/g, ' ');
      }

      return {
        name,
        type,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        required: true,
      };
    });

    setVariables(newVariables);
  }, [watchedContent]);

  // Load template if editing
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    setLoading(true);
    try {
      const templateData = await documentService.getTemplate(id);
      if (templateData) {
        setTemplate(templateData);
        form.reset({
          title: templateData.name,
          category: templateData.template_type as any,
          type: templateData.template_type,
          content: templateData.content,
          description: templateData.description || "",
        });

        // Convert placeholders to variables
        if (templateData.placeholders) {
          const templateVars: TemplateVariable[] = templateData.placeholders.map((p) => ({
            name: p.placeholder_key,
            type: p.placeholder_type,
            label: p.placeholder_label,
            required: p.is_required,
            default_value: p.default_value,
          }));
          setVariables(templateVars);
        }
      }
    } catch (error: any) {
      console.error('Error loading template:', error);
      toast.error("Fehler beim Laden der Vorlage");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: TemplateForm) => {
    setSaving(true);
    try {
      const templateData = {
        name: data.title,
        template_type: data.type,
        content: data.content,
        description: data.description,
        is_active: true,
        user_id: '', // Will be set by the service
      };

      const placeholders = variables.map((v) => ({
        placeholder_key: v.name,
        placeholder_label: v.label,
        placeholder_type: v.type,
        is_required: v.required,
        default_value: v.default_value,
      }));

      let result;
      if (templateId) {
        result = await documentService.updateTemplate(templateId, templateData, placeholders);
        if (result.success) {
          toast.success("Vorlage aktualisiert");
          if (onSave) {
            const updated = await documentService.getTemplate(templateId);
            if (updated) onSave(updated as any);
          }
        } else {
          toast.error(`Fehler: ${result.error}`);
        }
      } else {
        result = await documentService.createTemplate(templateData as any, placeholders);
        if (result.success) {
          toast.success("Vorlage erstellt");
          if (onSave && result.templateId) {
            const updated = await documentService.getTemplate(result.templateId);
            if (updated) onSave(updated as any);
          }
        } else {
          toast.error(`Fehler: ${result.error}`);
        }
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateVariable = (index: number, field: keyof TemplateVariable, value: any) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], [field]: value };
    setVariables(newVariables);
  };

  const addCustomVariable = () => {
    setVariables([
      ...variables,
      {
        name: `custom_${variables.length + 1}`,
        type: 'string',
        label: 'Custom Variable',
        required: false,
      },
    ]);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const generatePreview = () => {
    const content = form.getValues("content");
    if (!content) return "Kein Inhalt zum Vorschau";

    let preview = content;

    // Replace variables with sample data
    variables.forEach((variable) => {
      let sampleValue = variable.default_value || '';

      if (!sampleValue) {
        switch (variable.type) {
          case 'date':
            sampleValue = '01.01.2024';
            break;
          case 'currency':
            sampleValue = '0,00';
            break;
          case 'number':
            sampleValue = '0';
            break;
          case 'boolean':
            sampleValue = 'Ja';
            break;
          case 'text':
            sampleValue = 'Lorem ipsum dolor sit amet...';
            break;
          default:
            sampleValue = `[${variable.label}]`;
        }
      }

      const pattern = new RegExp(`\\{\\{\\s*${variable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
      preview = preview.replace(pattern, sampleValue);
    });

    // Handle conditional blocks
    preview = preview.replace(/\{\{#if[^}]+\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');

    return preview;
  };

  const copyVariableToClipboard = (variableName: string) => {
    const syntax = `{{${variableName}}}`;
    navigator.clipboard.writeText(syntax);
    toast.success(`Variable kopiert: ${syntax}`);
  };

  const insertVariable = (variableName: string) => {
    const content = form.getValues("content");
    const cursorPosition = (document.getElementById("content-textarea") as HTMLTextAreaElement)
      ?.selectionStart || content.length;

    const beforeCursor = content.substring(0, cursorPosition);
    const afterCursor = content.substring(cursorPosition);

    const newContent = `${beforeCursor}{{${variableName}}}${afterCursor}`;
    form.setValue("content", newContent);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-lg font-medium">Vorlage wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {templateId ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}
          </h2>
          <p className="text-muted-foreground">
            Erstellen und bearbeiten Sie Dokumentvorlagen mit dynamischen Variablen
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          )}
          <Button onClick={form.handleSubmit(handleSave)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grundinformationen</CardTitle>
            <CardDescription>
              Grundlegende Einstellungen für Ihre Dokumentvorlage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="z.B. Arbeitsvertrag Minijob"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Typ</Label>
                <Input
                  id="type"
                  {...form.register("type")}
                  placeholder="z.B. minijob_contract"
                />
                {form.formState.errors.type && (
                  <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategorie</Label>
                <Select
                  value={form.watch("category")}
                  onValueChange={(value) => form.setValue("category", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Mitarbeiter</SelectItem>
                    <SelectItem value="customer">Kunde</SelectItem>
                    <SelectItem value="object">Objekt</SelectItem>
                    <SelectItem value="offer">Angebot</SelectItem>
                    <SelectItem value="contract">Vertrag</SelectItem>
                    <SelectItem value="general">Allgemein</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Input
                  id="description"
                  {...form.register("description")}
                  placeholder="Kurze Beschreibung der Vorlage"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="editor">
              <Edit3 className="h-4 w-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="variables">
              <Variable className="h-4 w-4 mr-2" />
              Variablen ({variables.length})
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Vorschau
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vorlagen-Editor</CardTitle>
                <CardDescription>
                  Verwenden Sie Handlebars-Syntax für dynamische Inhalte. Variablen: {"{ {variable_name} }"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Handlebars Syntax Referenz</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <Badge variant="outline">{"{{variable}}"} - Variable</Badge>
                    <Badge variant="outline">{"{{#if var}}...{{/if}}"} - Bedingung</Badge>
                    <Badge variant="outline">{"{{#each items}}...{{/each}}"} - Schleife</Badge>
                    <Badge variant="outline">{"{{@index}}"} - Index in Schleife</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Vorlagen-Inhalt</Label>
                  <Textarea
                    id="content-textarea"
                    {...form.register("content")}
                    placeholder="Geben Sie hier Ihren Vorlageninhalt mit Handlebars-Variablen ein..."
                    rows={20}
                    className="font-mono text-sm"
                  />
                  {form.formState.errors.content && (
                    <p className="text-sm text-red-500">{form.formState.errors.content.message}</p>
                  )}
                </div>

                {variables.length > 0 && (
                  <div className="space-y-2">
                    <Label>Verfügbare Variablen (klicken zum Einfügen)</Label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable) => (
                        <Button
                          key={variable.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(variable.name)}
                          className="h-auto py-1 px-2 text-xs"
                        >
                          {variable.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Variablen verwalten</CardTitle>
                    <CardDescription>
                      Konfigurieren Sie die Variablen Ihrer Vorlage
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addCustomVariable} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Variable hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {variables.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Variablen gefunden</p>
                    <p className="text-sm">
                      Variablen werden automatisch aus dem Vorlageninhalt extrahiert
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variables.map((variable, index) => (
                      <div
                        key={`${variable.name}-${index}`}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{variable.name}</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyVariableToClipboard(variable.name)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariable(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Anzeigename</Label>
                            <Input
                              value={variable.label}
                              onChange={(e) => updateVariable(index, 'label', e.target.value)}
                              placeholder="z.B. Vorname"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Typ</Label>
                            <Select
                              value={variable.type}
                              onValueChange={(value) => updateVariable(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Zahl</SelectItem>
                                <SelectItem value="date">Datum</SelectItem>
                                <SelectItem value="currency">Währung</SelectItem>
                                <SelectItem value="boolean">Ja/Nein</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Standardwert</Label>
                            <Input
                              value={variable.default_value || ''}
                              onChange={(e) => updateVariable(index, 'default_value', e.target.value)}
                              placeholder="Optional"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`required-${index}`}
                            checked={variable.required}
                            onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`required-${index}`} className="text-sm">
                            Erforderlich
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vorschau</CardTitle>
                <CardDescription>
                  So wird Ihre Vorlage mit Beispieldaten aussehen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-white">
                  <pre className="whitespace-pre-wrap text-sm font-serif">
                    {generatePreview()}
                  </pre>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button type="button" variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Als PDF exportieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
