"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  isValid?: boolean;
  isOptional?: boolean;
}

interface MobileFormWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export function MobileFormWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  title,
  subtitle,
}: MobileFormWizardProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    } else {
      setIsCompleted(true);
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const canGoNext = currentStepData.isValid !== false;
  const canGoPrevious = currentStep > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glassmorphism-card">
        <CardHeader className="text-center pb-3">
          {title && <CardTitle className="text-xl">{title}</CardTitle>}
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Schritt {currentStep + 1} von {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center",
                  index <= currentStep ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200",
                    index < currentStep && "bg-primary text-primary-foreground",
                    index === currentStep && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                    index > currentStep && "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs mt-1 text-center max-w-[60px] truncate">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card className="glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <span className="mr-2">{currentStep + 1}.</span>
            {currentStepData.title}
            {currentStepData.isOptional && (
              <Badge variant="outline" className="ml-2 text-xs">
                Optional
              </Badge>
            )}
          </CardTitle>
          {currentStepData.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {currentStepData.description}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStepData.component}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center space-x-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Abbrechen
        </Button>

        <div className="flex space-x-2">
          {canGoPrevious && (
            <Button
              variant="outline"
              size="mobile-touch"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <Button
            onClick={handleNext}
            disabled={!canGoNext}
            size="mobile-default"
            className={cn(
              currentStep === steps.length - 1 && "bg-green-600 hover:bg-green-700"
            )}
          >
            {currentStep === steps.length - 1 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Abschließen
              </>
            ) : (
              <>
                Weiter
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}