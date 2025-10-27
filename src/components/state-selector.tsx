"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getGermanStates, getCurrentState, setCurrentState } from "@/lib/date-utils";

interface StateSelectorProps {
  onStateChange?: (stateCode: string) => void;
}

export function StateSelector({ onStateChange }: StateSelectorProps) {
  const [currentState, setCurrentStateLocal] = React.useState(getCurrentState());
  const states = getGermanStates();

  const handleStateChange = (newState: string) => {
    setCurrentState(newState);
    setCurrentStateLocal(newState);
    onStateChange?.(newState);
  };

  React.useEffect(() => {
    const savedState = getCurrentState();
    if (savedState !== currentState) {
      setCurrentStateLocal(savedState);
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Bundesland:</span>
      <Select value={currentState} onValueChange={handleStateChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {states.map((state) => (
            <SelectItem key={state.code} value={state.code}>
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}