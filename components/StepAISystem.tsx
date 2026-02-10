
import React, { useState } from 'react';
import { AISystemState, AIGuideline, GuidelineCategory, PRDSection } from '../types';
import { ModelSelector, GEMINI_FLASH } from './ModelSelector';
import { 
  Bot, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  X, 
  Sparkles, 
  BrainCircuit, 
  User, 
  Code2, 
  Briefcase, 
  Palette,
  FileText
} from 'lucide-react';
import * as geminiService from '../services/geminiService';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface StepAISystemProps {
  aiSystem: AISystemState;
  prdSections: PRDSection[];
  onUpdateSystem: (system: AISystemState) => void;
  isLoading: boolean;
}

const CATEGORY_ICONS: Record<GuidelineCategory, React.ElementType> = {
  persona: User,
  technical: Code2,
  business: Briefcase,
  style: Palette,
  other: FileText
};

export const StepAISystem: React.FC<StepAISystemProps> = ({
  aiSystem,
  prdSections,
  onUpdateSystem,
  isLoading
}) => {
  const [model, setModel] = useState(GEMINI_FLASH);
  const [isExtracting, setIsExtracting] = useState(false);
  const [guidelineToDelete, setGuidelineToDelete] = useState<AIGuideline | null>(null);

  // Edit/Create State
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<GuidelineCategory>('technical');
  const [formContent, setFormContent] = useState('');

  const handleExtractFromPRD = async () => {
    if (prdSections.length === 0) {
      alert("No PRD sections available to analyze. Please complete the Strategy phase first.");
      return;
    }

    setIsExtracting(true);
    try {
      const extracted = await geminiService.extractAIGuidelinesFromPRD(prdSections, model);
      // Merge unique
      const currentTitles = new Set(aiSystem.guidelines.map(g => g.title));
      const uniqueNew = extracted.filter(g => !currentTitles.has(g.title));
      
      onUpdateSystem({
        guidelines: [...aiSystem.guidelines, ...uniqueNew]
      });
    } catch (e) {
      console.error(e);
      alert("Failed to extract guidelines.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDelete = () => {
    if (!guidelineToDelete) return;
    onUpdateSystem({
      guidelines: aiSystem.guidelines.filter(g => g.id !== guidelineToDelete.id)
    });
    setGuidelineToDelete(null);
  };

  const openEdit = (g?: AIGuideline) => {
    if (g) {
      setCurrentId(g.id);
      setFormTitle(g.title);
      setFormCategory(g.category);
      setFormContent(g.content);
    } else {
      setCurrentId(null);
      setFormTitle('');
      setFormCategory('technical');
      setFormContent('');
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formTitle || !formContent) return;

    if (currentId) {
      // Update existing
      onUpdateSystem({
        guidelines: aiSystem.guidelines.map(g => 
          g.id === currentId ? { ...g, title: formTitle, category: formCategory, content: formContent } : g
        )
      });
    } else {
      // Create new
      const newG: AIGuideline = {
        id: crypto.randomUUID(),
        title: formTitle,
        category: formCategory,
        content: formContent,
        isActive: true
      };
      onUpdateSystem({
        guidelines: [...aiSystem.guidelines, newG]
      });
    }
    setIsEditing(false);
  };

  const toggleActive = (id: string) => {
    onUpdateSystem({
        guidelines: aiSystem.guidelines.map(g => 
            g.id === id ? { ...g, isActive: !g.isActive } : g
        )
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <DeleteConfirmationModal 
        isOpen={!!guidelineToDelete}
        onClose={() => setGuidelineToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Guideline?"
        itemName={guidelineToDelete?.title}
        description="This guideline will no longer be available in AI context menus."
      />

      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
         <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <Bot className="text-blue-600" size={24} /> AI Guidelines System
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
               Manage the instructions, personas, and constraints that guide the AI. 
               These blocks can be injected into any generation step to ensure consistency.
            </p>
         </div>
         <div className="flex items-center gap-3">
            <button 
              onClick={handleExtractFromPRD}
              disabled={isExtracting || isLoading}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-bold hover:bg-blue-100 flex items-center gap-2 disabled:opacity-50"
            >
              {isExtracting ? <BrainCircuit className="animate-pulse" size={16} /> : <Sparkles size={16} />}
              Extract from PRD
            </button>
            <button 
              onClick={() => openEdit()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> Add Guideline
            </button>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-6">
         
         {/* Guidelines Grid */}
         <div className="flex-1 overflow-y-auto pr-2">
            {aiSystem.guidelines.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Bot size={48} className="text-gray-300 mb-4" />
                  <h4 className="text-gray-500 font-bold mb-2">No Guidelines Yet</h4>
                  <p className="text-sm text-gray-400 max-w-sm mb-6">
                     Create specific rules (e.g., "Always use TypeScript") or extract them automatically from your Strategy documents.
                  </p>
                  <button onClick={() => openEdit()} className="text-blue-600 font-bold hover:underline">Create Manually</button>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiSystem.guidelines.map(g => {
                     const Icon = CATEGORY_ICONS[g.category];
                     return (
                        <div key={g.id} className={`bg-white rounded-xl border shadow-sm flex flex-col transition-all ${g.isActive ? 'border-blue-200 shadow-md' : 'border-gray-200 opacity-70 grayscale'}`}>
                           <div className="p-4 flex-1">
                              <div className="flex justify-between items-start mb-2">
                                 <div className={`p-2 rounded-lg ${g.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Icon size={20} />
                                 </div>
                                 <div className="flex gap-1">
                                    <button onClick={() => openEdit(g)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                       <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => setGuidelineToDelete(g)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                       <Trash2 size={14} />
                                    </button>
                                 </div>
                              </div>
                              <h4 className="font-bold text-gray-800 text-sm mb-1">{g.title}</h4>
                              <p className="text-xs text-gray-500 line-clamp-3 bg-gray-50 p-2 rounded border border-gray-100 font-mono">
                                 {g.content}
                              </p>
                           </div>
                           <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-b-xl">
                              <span className="text-[10px] font-bold uppercase text-gray-400">{g.category}</span>
                              <button 
                                onClick={() => toggleActive(g.id)}
                                className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${g.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                              >
                                 {g.isActive ? <CheckCircle2 size={12} /> : <X size={12} />}
                                 {g.isActive ? 'Active' : 'Inactive'}
                              </button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>

         {/* Edit/Create Side Panel (Overlay or split) */}
         {isEditing && (
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20 animate-in slide-in-from-right">
               <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-800">{currentId ? 'Edit Guideline' : 'New Guideline'}</h3>
                  <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
               </div>
               
               <div className="p-6 flex-1 overflow-y-auto space-y-4">
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Title</label>
                     <input 
                       value={formTitle}
                       onChange={e => setFormTitle(e.target.value)}
                       className="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none"
                       placeholder="e.g. Senior Persona"
                     />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Category</label>
                     <div className="grid grid-cols-2 gap-2">
                        {(['persona', 'technical', 'business', 'style', 'other'] as GuidelineCategory[]).map(c => (
                           <button
                             key={c}
                             onClick={() => setFormCategory(c)}
                             className={`text-xs py-2 rounded border capitalize ${formCategory === c ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                           >
                             {c}
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Prompt Instruction</label>
                     <textarea 
                        value={formContent}
                        onChange={e => setFormContent(e.target.value)}
                        className="flex-1 w-full p-3 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none resize-none min-h-[200px]"
                        placeholder="Enter the specific instruction text the AI should follow..."
                     />
                  </div>
               </div>
               
               <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Save Guideline</button>
               </div>
            </div>
         )}

      </div>
    </div>
  );
};
