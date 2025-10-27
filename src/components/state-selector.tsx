"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// German states with their codes
const GERMAN_STATES = [
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' },
];

interface StateSelectorProps {
  onStateChange?: (stateCode: string) => void;
}

export function StateSelector({ onStateChange }: StateSelectorProps) {
  const [currentState, setCurrentStateLocal] = React.useState('HH'); // Default to Hamburg

  const handleStateChange = (newState: string) => {
    setCurrentStateLocal(newState);
    onStateChange?.(newState);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Bundesland:</span>
      <Select value={currentState} onValueChange={handleStateChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GERMAN_STATES.map((state: { code: string; name: string }) => (
            <SelectItem key={state.code} value={state.code}>
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}