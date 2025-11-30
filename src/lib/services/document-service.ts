"use client";

import { createClient } from "@/lib/supabase/client";
import { pdfService, PDFGenerationOptions } from "./pdf-service";

export interface DocumentTemplate {
  id: string;
  user_id: string;
  name: string;
  template_type: string;
  content: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplatePlaceholder {
  id: string;
  template_id: string;
  placeholder_key: string;
  placeholder_label: string;
  placeholder_type: 'text' | 'string' | 'date' | 'number' | 'currency' | 'boolean' | 'array';
  is_required: boolean;
  default_value?: string;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  user_id: string;
  template_id: string;
  entity_type: 'employee' | 'customer' | 'object';
  entity_id: string;
  file_name: string;
  file_path: string;
  file_url?: string;
  file_size?: number;
  generated_data?: any;
  status: 'generated' | 'signed' | 'archived';
  created_at: string;
  expires_at?: string;
}

export interface CompanyBranding {
  id: string;
  user_id: string;
  company_name: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  logo_position: 'top-left' | 'top-right' | 'top-center';
  footer_text?: string;
  created_at: string;
  updated_at: string;
}

class DocumentService {
  private supabase = createClient();

  /**
   * Get all templates for the current user
   */
  async getTemplates(): Promise<DocumentTemplate[]> {
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_type');

    if (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get template with placeholders
   */
  async getTemplate(templateId: string): Promise<(DocumentTemplate & { placeholders: TemplatePlaceholder[] }) | null> {
    const { data: template, error: templateError } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Error fetching template:', templateError);
      return null;
    }

    const { data: placeholders, error: placeholderError } = await this.supabase
      .from('template_placeholders')
      .select('*')
      .eq('template_id', templateId)
      .order('placeholder_key');

    if (placeholderError) {
      console.error('Error fetching placeholders:', placeholderError);
      return { ...template, placeholders: [] };
    }

    return { ...template, placeholders: placeholders || [] };
  }

  /**
   * Create a new template
   */
  async createTemplate(
    templateData: Omit<DocumentTemplate, 'id' | 'created_at' | 'updated_at'>,
    placeholders: Omit<TemplatePlaceholder, 'id' | 'template_id' | 'created_at'>[]
  ): Promise<{ success: boolean; error?: string; templateId?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create template
      const { data: template, error: templateError } = await this.supabase
        .from('document_templates')
        .insert({
          ...templateData,
          user_id: user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create placeholders
      if (placeholders.length > 0) {
        const { error: placeholderError } = await this.supabase
          .from('template_placeholders')
          .insert(
            placeholders.map(p => ({
              ...p,
              template_id: template.id,
            }))
          );

        if (placeholderError) throw placeholderError;
      }

      return { success: true, templateId: template.id };
    } catch (error: any) {
      console.error('Error creating template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update template and placeholders
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<DocumentTemplate>,
    placeholders: Omit<TemplatePlaceholder, 'id' | 'template_id' | 'created_at'>[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: templateError } = await this.supabase
        .from('document_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (templateError) throw templateError;

      // Delete existing placeholders
      const { error: deleteError } = await this.supabase
        .from('template_placeholders')
        .delete()
        .eq('template_id', templateId);

      if (deleteError) throw deleteError;

      // Insert new placeholders
      if (placeholders.length > 0) {
        const { error: insertError } = await this.supabase
          .from('template_placeholders')
          .insert(
            placeholders.map(p => ({
              ...p,
              template_id: templateId,
            }))
          );

        if (insertError) throw insertError;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('document_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate document from template
   */
  async generateDocument(
    templateId: string,
    entityType: 'employee' | 'customer' | 'object',
    entityId: string,
    customData: Record<string, any> = {}
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get template with placeholders
      const template = await this.getTemplate(templateId);
      if (!template) throw new Error("Template not found");

      // Get entity data
      const entityData = await this.getEntityData(entityType, entityId);
      if (!entityData) throw new Error("Entity not found");

      // Get company branding
      const branding = await this.getCompanyBranding(user.id);

      // Merge all data for template rendering
      const renderData = {
        ...entityData,
        company: branding,
        custom: customData,
        currentDate: new Date().toLocaleDateString('de-DE'),
      };

      // Render template with Handlebars
      const renderedContent = await this.renderTemplate(template.content, renderData);

      return {
        success: true,
        data: {
          template: template.name,
          content: renderedContent,
          data: renderData,
        },
      };
    } catch (error: any) {
      console.error('Error generating document:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Render Handlebars template
   */
  private async renderTemplate(template: string, data: any): Promise<string> {
    // Simple Handlebars-like rendering
    // In production, use a proper Handlebars library
    let rendered = template;

    // Helper function to get nested value from object path
    const getValue = (obj: any, path: string) => {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };

    // Replace {{key}} with values
    const placeholderPattern = /\{\{([^}]+)\}\}/g;
    rendered = rendered.replace(placeholderPattern, (match, key) => {
      const value = getValue(data, key.trim());
      return value !== undefined && value !== null ? String(value) : '';
    });

    // Handle {{#if}} blocks (simple implementation)
    const ifPattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    rendered = rendered.replace(ifPattern, (match, condition, content) => {
      const value = getValue(data, condition.trim());
      return value ? content : '';
    });

    // Handle {{#each}} blocks (simple implementation)
    const eachPattern = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    rendered = rendered.replace(eachPattern, (match, arrayPath, content) => {
      const array = getValue(data, arrayPath.trim());
      if (!Array.isArray(array)) return '';

      return array
        .map((item, index) => {
          let itemContent = content;
          // Replace {{this}} with current item
          itemContent = itemContent.replace(/\{\{this\}\}/g, JSON.stringify(item));
          // Replace {{@index}} with current index
          itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
          return itemContent;
        })
        .join('');
    });

    return rendered;
  }

  /**
   * Get entity data based on type
   */
  private async getEntityData(entityType: string, entityId: string): Promise<any> {
    switch (entityType) {
      case 'employee':
        const { data: employee } = await this.supabase
          .from('employees')
          .select('*')
          .eq('id', entityId)
          .single();
        return employee;

      case 'customer':
        const { data: customer } = await this.supabase
          .from('customers')
          .select('*')
          .eq('id', entityId)
          .single();
        return customer;

      case 'object':
        const { data: obj } = await this.supabase
          .from('objects')
          .select('*')
          .eq('id', entityId)
          .single();
        return obj;

      default:
        return null;
    }
  }

  /**
   * Get company branding
   */
  async getCompanyBranding(userId: string): Promise<CompanyBranding | null> {
    const { data, error } = await this.supabase
      .from('company_branding')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching company branding:', error);
      return null;
    }

    return data || null;
  }

  /**
   * Create or update company branding
   */
  async updateCompanyBranding(
    branding: Partial<CompanyBranding>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await this.supabase
        .from('company_branding')
        .upsert({
          user_id: user.id,
          ...branding,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating company branding:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get generated documents for an entity
   */
  async getGeneratedDocuments(
    entityType: 'employee' | 'customer' | 'object',
    entityId: string
  ): Promise<GeneratedDocument[]> {
    const { data, error } = await this.supabase
      .from('generated_documents')
      .select(`
        *,
        document_templates(name, template_type)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching generated documents:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Generate PDF document from template
   */
  async generatePDFDocument(
    templateId: string,
    entityType: 'employee' | 'customer' | 'object',
    entityId: string,
    customData: Record<string, any> = {},
    options: PDFGenerationOptions = {}
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // Generate document content
      const result = await this.generateDocument(templateId, entityType, entityId, customData);

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to generate document' };
      }

      // Get company branding
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const branding = await this.getCompanyBranding(user.id);
      if (!branding) {
        return { success: false, error: 'Company branding not configured' };
      }

      // Get bank details
      const { data: bankConnection } = await this.supabase
        .from('company_branding')
        .select('account_holder, iban, bic, bank_name')
        .eq('user_id', user.id)
        .single();

      // Generate PDF
      const pdfResult = await pdfService.generatePDF(
        result.data.content,
        {
          company_name: branding.company_name,
          company_address: branding.company_address,
          company_phone: branding.company_phone,
          company_email: branding.company_email,
          logo_url: branding.logo_url,
          footer_text: branding.footer_text,
        },
        bankConnection || undefined,
        {
          title: `${result.data.template} - ${entityType}`,
          author: branding.company_name,
          subject: `Generated ${result.data.template} document`,
          ...options,
        }
      );

      if (!pdfResult.success || !pdfResult.pdf) {
        return { success: false, error: pdfResult.error || 'Failed to generate PDF' };
      }

      return {
        success: true,
        data: {
          ...result.data,
          pdf: pdfResult.pdf,
          fileName: pdfResult.fileName,
        },
      };
    } catch (error: any) {
      console.error('Error generating PDF document:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate and download PDF document
   */
  async generateAndDownloadPDF(
    templateId: string,
    entityType: 'employee' | 'customer' | 'object',
    entityId: string,
    customData: Record<string, any> = {},
    options: PDFGenerationOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const result = await this.generatePDFDocument(templateId, entityType, entityId, customData, options);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const branding = await this.getCompanyBranding(user.id);
      if (!branding) {
        return { success: false, error: 'Company branding not configured' };
      }

      const { data: bankConnection } = await this.supabase
        .from('company_branding')
        .select('account_holder, iban, bic, bank_name')
        .eq('user_id', user.id)
        .single();

      const downloadResult = await pdfService.generateAndDownloadPDF(
        result.data!.content,
        {
          company_name: branding.company_name,
          company_address: branding.company_address,
          company_phone: branding.company_phone,
          company_email: branding.company_email,
          logo_url: branding.logo_url,
          footer_text: branding.footer_text,
        },
        bankConnection || undefined,
        {
          title: `${result.data!.template} - ${entityType}`,
          author: branding.company_name,
          subject: `Generated ${result.data!.template} document`,
          ...options,
        }
      );

      if (!downloadResult.success) {
        return { success: false, error: downloadResult.error };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error downloading PDF document:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate PDF preview (data URI)
   */
  async generatePDFPreview(
    templateId: string,
    entityType: 'employee' | 'customer' | 'object',
    entityId: string,
    customData: Record<string, any> = {},
    options: PDFGenerationOptions = {}
  ): Promise<{ success: boolean; dataUri?: string; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const result = await this.generatePDFDocument(templateId, entityType, entityId, customData, options);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const branding = await this.getCompanyBranding(user.id);
      if (!branding) {
        return { success: false, error: 'Company branding not configured' };
      }

      const { data: bankConnection } = await this.supabase
        .from('company_branding')
        .select('account_holder, iban, bic, bank_name')
        .eq('user_id', user.id)
        .single();

      const dataUri = await pdfService.previewPDF(
        result.data!.content,
        {
          company_name: branding.company_name,
          company_address: branding.company_address,
          company_phone: branding.company_phone,
          company_email: branding.company_email,
          logo_url: branding.logo_url,
          footer_text: branding.footer_text,
        },
        bankConnection || undefined,
        {
          title: `${result.data!.template} - ${entityType}`,
          author: branding.company_name,
          subject: `Generated ${result.data!.template} document`,
          ...options,
        }
      );

      return { success: true, dataUri };
    } catch (error: any) {
      console.error('Error generating PDF preview:', error);
      return { success: false, error: error.message };
    }
  }
}

export const documentService = new DocumentService();
