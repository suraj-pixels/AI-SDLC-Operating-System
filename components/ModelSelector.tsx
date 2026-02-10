
import React from 'react';
import { Zap, BrainCircuit } from 'lucide-react';

export const GEMINI_FLASH = 'gemini-3-flash-preview';
export const GEMINI_PRO = 'gemini-3-pro-preview';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
      <button
        onClick={() => onChange(GEMINI_FLASH)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          value === GEMINI_FLASH
            ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Best for speed and high-volume tasks"
      >
        <Zap size={14} className={value === GEMINI_FLASH ? "fill-current" : ""} />
        <span>Flash</span>
      </button>
      <button
        onClick={() => onChange(GEMINI_PRO)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          value === GEMINI_PRO
            ? 'bg-white text-purple-600 shadow-sm border border-gray-100'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Best for complex reasoning and coding"
      >
        <BrainCircuit size={14} />
        <span>Pro</span>
      </button>
    </div>
  );
};
