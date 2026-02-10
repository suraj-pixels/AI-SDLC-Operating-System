
import React, { useState, useEffect } from 'react';
import { X, Scale, Save, Info, Sparkles } from 'lucide-react';
import { ProjectConfig } from '../types';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  level: 'Module' | 'Screen';
  entityName: string;
  initialGuidelines?: string;
  globalConfig: ProjectConfig; // For context
  onSave: (guidelines: string) => void;
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({
  isOpen,
  onClose,
  title,
  level,
  entityName,
  initialGuidelines = '',
  globalConfig,
  onSave
}) => {
  const [text, setText] = useState(initialGuidelines);

  useEffect(() => {
    setText(initialGuidelines || '');
  }, [initialGuidelines, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Scale size={20} />
             </div>
             <div>
                <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
                    Targeting {level}: {entityName}
                </p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
           {/* Context Block */}
           <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                 <Info size={14} /> Active Global Guidelines
              </h4>
              <p className="text-sm text-gray-600 italic">
                 "{globalConfig.customInstructions || 'No global instructions set.'}"
              </p>
              <div className="mt-2 text-[10px] text-gray-400">
                 These global rules apply to everything. Your specific rules below will refine or override them for this {level.toLowerCase()}.
              </div>
           </div>

           <div className="flex-1 flex flex-col">
              <label className="text-sm font-bold text-gray-700 mb-2 flex items-center justify-between">
                 <span>{level} Specific Rules</span>
                 <span className="text-xs font-normal text-gray-400">Markdown Supported</span>
              </label>
              <textarea 
                 value={text}
                 onChange={e => setText(e.target.value)}
                 className="flex-1 w-full p-4 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed text-gray-800 bg-white shadow-sm min-h-[200px]"
                 placeholder={`e.g.,\nUX: Ensure the primary action is always sticky at the bottom.\nUI: Use the 'Accent' color for all pricing numbers.\nTech: Avoid using heavy image carousels here.`}
              />
           </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
           <button 
             onClick={handleSave}
             className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm flex items-center gap-2"
           >
             <Save size={16} /> Save Guidelines
           </button>
        </div>

      </div>
    </div>
  );
};
