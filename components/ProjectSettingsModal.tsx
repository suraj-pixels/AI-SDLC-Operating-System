
import React, { useState } from 'react';
import { ProjectConfig, DesignStyle, DesignLibrary } from '../types';
import { Settings, X, Check, Paintbrush, Type, Layout, Library } from 'lucide-react';
import { STYLE_GUIDES, LIBRARY_PRESETS } from '../constants';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProjectConfig;
  onSave: (newConfig: ProjectConfig) => void;
}

const TAILWIND_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
];

const RADII = [
  { label: 'Sharp (None)', value: 'none' },
  { label: 'Subtle (sm)', value: 'sm' },
  { label: 'Standard (md)', value: 'md' },
  { label: 'Rounded (lg)', value: 'lg' },
  { label: 'Soft (xl)', value: 'xl' },
  { label: 'Very Soft (2xl)', value: '2xl' },
  { label: 'Full (Pill)', value: 'full' },
];

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<ProjectConfig>(config);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-800">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
               <Settings size={20} />
            </div>
            <div>
               <h3 className="font-bold text-lg">Project Configuration</h3>
               <p className="text-xs text-gray-500">Global settings for AI generation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           
           {/* Section 1: Basic Info */}
           <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">Project Name</label>
              <input 
                 value={localConfig.projectName}
                 onChange={e => setLocalConfig({...localConfig, projectName: e.target.value})}
                 className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900 bg-white"
                 placeholder="e.g. My Awesome App"
              />
           </div>

           <div className="border-t border-gray-100 pt-6 space-y-6">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                 <Paintbrush size={14} /> Visual Identity
              </h4>

              {/* Design Library Selector */}
              <div className="space-y-3">
                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Library size={16} className="text-indigo-500" />
                    Design System Preset
                 </label>
                 <select 
                   value={localConfig.designLibrary}
                   onChange={e => setLocalConfig({...localConfig, designLibrary: e.target.value as DesignLibrary})}
                   className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                 >
                    {Object.keys(LIBRARY_PRESETS).map(lib => (
                       <option key={lib} value={lib}>{lib}</option>
                    ))}
                 </select>
                 <p className="text-xs text-gray-500">
                    {LIBRARY_PRESETS[localConfig.designLibrary]}
                 </p>
              </div>

              {/* Style Selector */}
              <div className="grid grid-cols-1 gap-4">
                 <label className="text-sm font-semibold text-gray-700">Design Aesthetic</label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.keys(STYLE_GUIDES).map((style) => (
                       <button
                         key={style}
                         onClick={() => setLocalConfig({...localConfig, designStyle: style as DesignStyle})}
                         className={`text-left p-3 rounded-lg border text-sm transition-all ${
                            localConfig.designStyle === style 
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                         }`}
                       >
                          <div className="font-bold text-gray-800">{style}</div>
                          <div className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-tight">
                             {STYLE_GUIDES[style]}
                          </div>
                       </button>
                    ))}
                 </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-3">
                 <label className="text-sm font-semibold text-gray-700 flex justify-between">
                    <span>Primary Color</span>
                    <span className={`text-xs font-mono uppercase text-${localConfig.primaryColor}-600`}>{localConfig.primaryColor}</span>
                 </label>
                 <div className="flex flex-wrap gap-2">
                    {TAILWIND_COLORS.map(color => (
                       <button
                         key={color}
                         onClick={() => setLocalConfig({...localConfig, primaryColor: color})}
                         className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                            localConfig.primaryColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                         }`}
                         style={{ backgroundColor: `var(--color-${color}-500)` }} 
                       >
                          <div className={`w-full h-full rounded-full bg-${color}-500 ${localConfig.primaryColor === color ? 'ring-2 ring-white' : ''}`}></div>
                       </button>
                    ))}
                 </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-3">
                 <label className="text-sm font-semibold text-gray-700">Corner Radius Preference</label>
                 <div className="flex gap-2 overflow-x-auto pb-2">
                    {RADII.map((r) => (
                       <button
                          key={r.value}
                          onClick={() => setLocalConfig({...localConfig, borderRadius: r.value})}
                          className={`px-3 py-2 rounded-md border text-xs whitespace-nowrap transition-all ${
                             localConfig.borderRadius === r.value
                             ? 'bg-gray-800 text-white border-gray-800'
                             : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                       >
                          {r.label}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* Custom Instructions */}
           <div className="border-t border-gray-100 pt-6 space-y-4">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                 <Type size={16} className="text-purple-500" />
                 Global AI Instructions
              </label>
              <textarea 
                 value={localConfig.customInstructions}
                 onChange={e => setLocalConfig({...localConfig, customInstructions: e.target.value})}
                 className="w-full p-4 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none bg-gray-50 focus:bg-white transition-colors text-gray-900"
                 placeholder="e.g. 'Always use dark mode by default', 'Avoid using gradients', 'Make buttons very large'."
              />
              <p className="text-xs text-gray-400">These instructions will be appended to every prompt sent to the AI.</p>
           </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
           <button 
             onClick={handleSave}
             className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2"
           >
             <Check size={16} /> Save Settings
           </button>
        </div>
      </div>
    </div>
  );
};