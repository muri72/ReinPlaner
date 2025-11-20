"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface UnsavedForm {
  id: string;
  isDirty: boolean;
}

interface UnsavedChangesContextType {
  register: (id: string, isDirty: boolean) => void;
  unregister: (id: string) => void;
  update: (id: string, isDirty: boolean) => void;
  isDirty: (id?: string) => boolean;
  isAnyDirty: () => boolean;
  getDirtyForms: () => UnsavedForm[];
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [forms, setForms] = useState<Map<string, UnsavedForm>>(new Map());

  const register = useCallback((id: string, isDirty: boolean) => {
    setForms(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { id, isDirty });
      return newMap;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setForms(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const update = useCallback((id: string, isDirty: boolean) => {
    setForms(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { id, isDirty });
      return newMap;
    });
  }, []);

  const isDirty = useCallback((id?: string) => {
    if (id) {
      return forms.get(id)?.isDirty ?? false;
    }
    return false;
  }, [forms]);

  const isAnyDirty = useCallback(() => {
    return Array.from(forms.values()).some(form => form.isDirty);
  }, [forms]);

  const getDirtyForms = useCallback(() => {
    return Array.from(forms.values()).filter(form => form.isDirty);
  }, [forms]);

  return (
    <UnsavedChangesContext.Provider value={{
      register,
      unregister,
      update,
      isDirty,
      isAnyDirty,
      getDirtyForms,
    }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  }
  return context;
}

// Hook for forms to register themselves
export function useFormUnsavedChanges(formId: string, isDirty: boolean) {
  const { register, unregister, update } = useUnsavedChanges();

  useEffect(() => {
    register(formId, isDirty);

    return () => {
      unregister(formId);
    };
  }, [formId, register, unregister]);

  useEffect(() => {
    update(formId, isDirty);
  }, [formId, isDirty, update]);
}

// Hook for CREATE forms - ignores initial mount isDirty to prevent false positives from prefills
export function useFormUnsavedChangesForCreate(formId: string, isDirty: boolean, isCreateMode: boolean = true) {
  const { register, unregister, update } = useUnsavedChanges();
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    // Register with false on mount if in create mode, otherwise use actual isDirty
    const initialDirty = isCreateMode ? false : isDirty;
    register(formId, initialDirty);

    if (isCreateMode) {
      // Mark as initialized after a short delay to allow form to settle
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 100);

      return () => {
        clearTimeout(timer);
        unregister(formId);
      };
    } else {
      // In edit mode, initialize immediately
      setIsInitialized(true);
      return () => {
        unregister(formId);
      };
    }
  }, [formId, register, unregister, isCreateMode, isDirty]);

  useEffect(() => {
    // Only track isDirty after initialization
    if (isInitialized) {
      update(formId, isDirty);
    }
  }, [formId, isDirty, update, isInitialized]);
}

// Hook for dialogs to check if any form is dirty
export function useDialogUnsavedChanges() {
  const { isAnyDirty, getDirtyForms } = useUnsavedChanges();
  return {
    isDirty: isAnyDirty(),
    dirtyForms: getDirtyForms(),
  };
}
