
import React, { useState, useEffect } from 'react';
import { DesignSystemState, DesignComponent, ProjectConfig, ComponentType } from '../types';
import { ModelSelector, GEMINI_FLASH } from './ModelSelector';
import { Palette, Atom, Component, Layout, CheckCircle2, RefreshCw, Code, Eye, Plus, Image as ImageIcon, Type, X, Trash2, Droplet, CaseSensitive, Terminal, Edit2, Check, Download, Wand2 } from 'lucide-react';
import * as geminiService from '../services/geminiService';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface StepDesignSystemProps {
  designSystem: DesignSystemState;
  config: ProjectConfig;
  onUpdateSystem: (ds: DesignSystemState) => void;
  onGenerateBaseline: (model: string) => void;
  onNext: () => void;
  isLoading: boolean;
}

export const StepDesignSystem: React.FC<StepDesignSystemProps> = ({
  designSystem,
  config,
  onUpdateSystem,
  onGenerateBaseline,
  onNext,
  isLoading
}) => {
  const [model, setModel] = useState(GEMINI_FLASH);
  const [activeTab, setActiveTab] = useState<'tokens' | 'components'>('components');
  const [activeComponentType, setActiveComponentType] = useState<ComponentType>('atom');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // Style Editing State
  const [editingToken, setEditingToken] = useState<{ type: 'color' | 'typography', index: number } | null>(null);
  const [tokenValueName, setTokenValueName] = useState('');
  const [tokenValueCode, setTokenValueCode] = useState('');
  
  // Component Live Editing
  const [isEditingComponentCode, setIsEditingComponentCode] = useState(false);
  const [editedComponentCode, setEditedComponentCode] = useState('');

  // Generator State
  const [isGeneratingTokens, setIsGeneratingTokens] = useState(false);

  // Creation Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [creationName, setCreationName] = useState('');
  const [creationType, setCreationType] = useState<ComponentType>('molecule');
  const [creationDesc, setCreationDesc] = useState('');
  const [creationImage, setCreationImage] = useState<string | null>(null); // base64
  const [creationTab, setCreationTab] = useState<'text' | 'image' | 'manual'>('text');
  const [generatedPreview, setGeneratedPreview] = useState<string>('');
  const [isGeneratingComponent, setIsGeneratingComponent] = useState(false);

  // Deletion State
  const [componentToDelete, setComponentToDelete] = useState<DesignComponent | null>(null);
  
  // Export Modal
  const [showExport, setShowExport] = useState(false);

  const filteredComponents = designSystem.components.filter(c => c.type === activeComponentType);
  const selectedComponent = designSystem.components.find(c => c.id === selectedComponentId);
  const hasComponents = designSystem.components.length > 0;

  // Sync edited code when selection changes
  useEffect(() => {
    if (selectedComponent) {
        setEditedComponentCode(selectedComponent.code);
        setIsEditingComponentCode(false);
    }
  }, [selectedComponent]);

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCreationImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateComponent = async () => {
    if (!creationName || (!creationDesc && !creationImage)) return;
    
    setIsGeneratingComponent(true);
    try {
        // Strip data:image prefix if present for API
        let imageBytes = undefined;
        if (creationImage) {
            imageBytes = creationImage.split(',')[1];
        }

        const code = await geminiService.generateSpecificComponent(
            creationName,
            creationType,
            creationDesc,
            imageBytes,
            designSystem,
            config
        );
        setGeneratedPreview(code);
    } catch (e) {
        console.error(e);
        alert("Failed to generate component.");
    } finally {
        setIsGeneratingComponent(false);
    }
  };

  const handleSaveComponent = () => {
    const newComponent: DesignComponent = {
        id: crypto.randomUUID(),
        name: creationName,
        type: creationType,
        description: creationDesc || 'Manually created component',
        code: generatedPreview
    };
    
    onUpdateSystem({
        ...designSystem,
        components: [...designSystem.components, newComponent]
    });
    
    setIsCreating(false);
    resetCreationForm();
    setActiveTab('components');
    setActiveComponentType(creationType);
    setSelectedComponentId(newComponent.id);
  };

  const handleSaveEditedComponent = () => {
    if (selectedComponent) {
        const updated = { ...selectedComponent, code: editedComponentCode };
        onUpdateSystem({
            ...designSystem,
            components: designSystem.components.map(c => c.id === updated.id ? updated : c)
        });
        setIsEditingComponentCode(false);
    }
  };

  const handleDeleteComponent = () => {
    if (!componentToDelete) return;
    onUpdateSystem({
        ...designSystem,
        components: designSystem.components.filter(c => c.id !== componentToDelete.id)
    });
    if (selectedComponentId === componentToDelete.id) {
        setSelectedComponentId(null);
    }
    setComponentToDelete(null);
  };

  const resetCreationForm = () => {
    setCreationName('');
    setCreationType('molecule');
    setCreationDesc('');
    setCreationImage(null);
    setCreationTab('text');
    setGeneratedPreview('');
  };

  // --- Token Generators ---
  const handleGenerateTokens = async (type: 'colors' | 'typography') => {
      setIsGeneratingTokens(true);
      try {
         const newTokens = await geminiService.generateVisualTokens(type, config);
         if (type === 'colors') {
             onUpdateSystem({ ...designSystem, colors: newTokens });
         } else {
             onUpdateSystem({ ...designSystem, typography: newTokens });
         }
      } catch (e) {
          console.error(e);
          alert("Failed to generate tokens");
      } finally {
          setIsGeneratingTokens(false);
      }
  };

  // --- Style Token Handlers ---
  const handleUpdateToken = () => {
    if (!editingToken) return;
    if (editingToken.type === 'color') {
        const newColors = [...designSystem.colors];
        newColors[editingToken.index] = { name: tokenValueName, value: tokenValueCode };
        onUpdateSystem({ ...designSystem, colors: newColors });
    } else {
        const newTypo = [...designSystem.typography];
        newTypo[editingToken.index] = { name: tokenValueName, value: tokenValueCode };
        onUpdateSystem({ ...designSystem, typography: newTypo });
    }
    setEditingToken(null);
  };

  const handleAddToken = (type: 'color' | 'typography') => {
    if (type === 'color') {
        onUpdateSystem({ 
            ...designSystem, 
            colors: [...designSystem.colors, { name: 'New Color', value: '#000000' }] 
        });
        setEditingToken({ type: 'color', index: designSystem.colors.length }); // Start editing the new one
        setTokenValueName('New Color');
        setTokenValueCode('#000000');
    } else {
        onUpdateSystem({ 
            ...designSystem, 
            typography: [...designSystem.typography, { name: 'New Style', value: 'font-sans text-base' }] 
        });
        setEditingToken({ type: 'typography', index: designSystem.typography.length });
        setTokenValueName('New Style');
        setTokenValueCode('font-sans text-base');
    }
  };

  const handleDeleteToken = (type: 'color' | 'typography', index: number) => {
    if (type === 'color') {
        onUpdateSystem({ ...designSystem, colors: designSystem.colors.filter((_, i) => i !== index) });
    } else {
        onUpdateSystem({ ...designSystem, typography: designSystem.typography.filter((_, i) => i !== index) });
    }
  };

  const getExportString = () => {
    return `module.exports = {
  theme: {
    extend: {
      colors: {
${designSystem.colors.map(c => `        '${c.name.toLowerCase().replace(/ /g, '-')}': '${c.value}',`).join('\n')}
      },
      fontFamily: {
        // Map your typography tokens here
      }
    }
  }
}`;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      
      <DeleteConfirmationModal 
         isOpen={!!componentToDelete}
         onClose={() => setComponentToDelete(null)}
         onConfirm={handleDeleteComponent}
         title="Delete Component?"
         itemName={componentToDelete?.name}
         description="Are you sure you want to delete this component from the library?"
      />

      {/* Export Modal */}
      {showExport && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Export Tailwind Config</h3>
                    <button onClick={() => setShowExport(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                 </div>
                 <div className="p-4 bg-slate-900 overflow-auto max-h-[60vh]">
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{getExportString()}</pre>
                 </div>
                 <div className="p-4 flex justify-end">
                    <button 
                      onClick={() => navigator.clipboard.writeText(getExportString())}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                    >
                        Copy to Clipboard
                    </button>
                 </div>
             </div>
         </div>
      )}

      {/* Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                     <Plus size={18} className="text-purple-600" /> Create New Component
                  </h3>
                  <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              
              <div className="flex-1 flex overflow-hidden">
                  {/* Left: Inputs */}
                  <div className="w-1/3 p-6 border-r border-gray-100 overflow-y-auto bg-gray-50/30 flex flex-col">
                     <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Component Name</label>
                            <input 
                              value={creationName}
                              onChange={e => setCreationName(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-purple-500 outline-none text-gray-900 bg-white"
                              placeholder="e.g. User Profile Card"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Atomic Type</label>
                            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                                {(['atom', 'molecule', 'organism'] as ComponentType[]).map(t => (
                                    <button
                                      key={t}
                                      onClick={() => setCreationType(t)}
                                      className={`flex-1 py-1 text-xs rounded capitalize font-medium ${creationType === t ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4 flex-1 flex flex-col">
                            <div className="flex gap-4 mb-2">
                                <button 
                                  onClick={() => setCreationTab('text')}
                                  className={`flex items-center gap-1 text-xs font-bold uppercase pb-1 border-b-2 ${creationTab === 'text' ? 'border-purple-500 text-purple-700' : 'border-transparent text-gray-400'}`}
                                >
                                    <Type size={14} /> AI Text
                                </button>
                                <button 
                                  onClick={() => setCreationTab('image')}
                                  className={`flex items-center gap-1 text-xs font-bold uppercase pb-1 border-b-2 ${creationTab === 'image' ? 'border-purple-500 text-purple-700' : 'border-transparent text-gray-400'}`}
                                >
                                    <ImageIcon size={14} /> AI Image
                                </button>
                                <button 
                                  onClick={() => setCreationTab('manual')}
                                  className={`flex items-center gap-1 text-xs font-bold uppercase pb-1 border-b-2 ${creationTab === 'manual' ? 'border-purple-500 text-purple-700' : 'border-transparent text-gray-400'}`}
                                >
                                    <Terminal size={14} /> Manual Code
                                </button>
                            </div>

                            {creationTab === 'text' && (
                                <textarea 
                                  value={creationDesc}
                                  onChange={e => setCreationDesc(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded text-sm focus:border-purple-500 outline-none h-40 resize-none text-gray-900 bg-white"
                                  placeholder={`Describe the ${creationType}... e.g. "A card with a rounded avatar on the left and title on right."`}
                                />
                            )}
                            
                            {creationTab === 'image' && (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative h-40 flex items-center justify-center">
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {creationImage ? (
                                        <img src={creationImage} alt="Ref" className="h-full object-contain rounded" />
                                    ) : (
                                        <div className="text-gray-400">
                                            <ImageIcon size={24} className="mx-auto mb-2" />
                                            <span className="text-xs">Upload Figma Screenshot</span>
                                        </div>
                                    )}
                                </div>
                            )}

                             {creationTab === 'manual' && (
                                <div className="flex-1 flex flex-col">
                                    <p className="text-xs text-gray-500 mb-2">Paste raw HTML/Tailwind below. It will be rendered on the right.</p>
                                    <textarea 
                                        value={generatedPreview}
                                        onChange={e => setGeneratedPreview(e.target.value)}
                                        className="w-full p-3 bg-slate-900 text-green-400 font-mono text-xs rounded-lg flex-1 outline-none resize-none border border-slate-700 focus:border-purple-500"
                                        placeholder="<div class='bg-red-500 p-4'>...</div>"
                                        spellCheck={false}
                                    />
                                </div>
                            )}
                        </div>
                        
                        {creationTab !== 'manual' && (
                            <button
                            onClick={handleCreateComponent}
                            disabled={isGeneratingComponent || !creationName}
                            className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                            >
                                {isGeneratingComponent ? <RefreshCw size={16} className="animate-spin" /> : <Code size={16} />}
                                Generate Component
                            </button>
                        )}
                     </div>
                  </div>

                  {/* Right: Preview */}
                  <div className="flex-1 bg-gray-100 relative flex flex-col">
                      <div className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur px-2 py-1 rounded text-xs text-gray-500 font-mono">
                          Live Preview
                      </div>
                      
                      {generatedPreview ? (
                          <>
                            <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                <div dangerouslySetInnerHTML={{ __html: generatedPreview }} />
                            </div>
                            {creationTab !== 'manual' && (
                                <div className="h-1/3 bg-slate-900 p-4 border-t border-gray-300 overflow-auto">
                                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{generatedPreview}</pre>
                                </div>
                            )}
                          </>
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                              <Eye size={48} className="mb-4 opacity-50" />
                              <p>Preview will appear here</p>
                          </div>
                      )}
                  </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2">
                  <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                  <button 
                    onClick={handleSaveComponent}
                    disabled={!generatedPreview || !creationName}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm disabled:opacity-50"
                  >
                    Save to System
                  </button>
              </div>
           </div>
        </div>
      )}


      {/* Main Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Palette className="text-purple-600" size={20} />
            Atomic Design System
          </h3>
          <p className="text-xs text-gray-500 mt-1">Manage styles, tokens, and reusable components.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowExport(true)}
             className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium flex items-center gap-1"
           >
              <Download size={14} /> Export Config
           </button>
           <div className="h-6 w-px bg-gray-200 mx-2"></div>

           <div className="flex bg-gray-100 rounded-lg p-1">
               <button 
                  onClick={() => setActiveTab('components')} 
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${activeTab === 'components' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
               >
                   Components
               </button>
               <button 
                  onClick={() => setActiveTab('tokens')} 
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${activeTab === 'tokens' ? 'bg-white text-pink-700 shadow-sm' : 'text-gray-500'}`}
               >
                   Style Tokens
               </button>
           </div>
           
           <div className="h-6 w-px bg-gray-200 mx-2"></div>

           {activeTab === 'components' && (
               <button 
                onClick={() => { resetCreationForm(); setIsCreating(true); }}
                disabled={!hasComponents}
                className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <Plus size={16} /> Add Component
                </button>
           )}
           <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
         
         {/* --- TOKENS VIEW --- */}
         {activeTab === 'tokens' && (
             <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto">
                 <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                     
                     {/* Color Tokens */}
                     <div>
                         <div className="flex justify-between items-center mb-4">
                             <h4 className="font-bold text-gray-800 flex items-center gap-2"><Droplet size={18} className="text-pink-500"/> Colors</h4>
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => handleGenerateTokens('colors')}
                                  disabled={isGeneratingTokens}
                                  className="text-xs bg-pink-50 text-pink-600 px-2 py-1 rounded border border-pink-100 flex items-center gap-1 hover:bg-pink-100 disabled:opacity-50"
                                >
                                   {isGeneratingTokens ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                   Generate Palette
                                </button>
                                <button onClick={() => handleAddToken('color')} className="text-xs text-blue-600 hover:underline">+ Add Color</button>
                             </div>
                         </div>
                         <div className="space-y-2">
                             {designSystem.colors.map((color, idx) => (
                                 <div key={idx} className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg hover:border-gray-200 group">
                                     <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm flex-shrink-0" style={{ backgroundColor: color.value }}></div>
                                     {editingToken?.type === 'color' && editingToken?.index === idx ? (
                                         <div className="flex-1 flex gap-2">
                                             <input value={tokenValueName} onChange={e => setTokenValueName(e.target.value)} className="border rounded px-2 py-1 text-sm w-1/2 text-gray-900 bg-white" placeholder="Name" />
                                             <input value={tokenValueCode} onChange={e => setTokenValueCode(e.target.value)} className="border rounded px-2 py-1 text-sm w-1/2 font-mono text-gray-900 bg-white" placeholder="Hex/Class" />
                                             <button onClick={handleUpdateToken} className="text-green-600"><CheckCircle2 size={16}/></button>
                                         </div>
                                     ) : (
                                         <div className="flex-1">
                                             <div className="text-sm font-medium text-gray-800">{color.name}</div>
                                             <div className="text-xs text-gray-500 font-mono">{color.value}</div>
                                         </div>
                                     )}
                                     {!editingToken && (
                                         <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                             <button onClick={() => { setEditingToken({type:'color', index: idx}); setTokenValueName(color.name); setTokenValueCode(color.value); }} className="text-gray-400 hover:text-blue-600"><Code size={14}/></button>
                                             <button onClick={() => handleDeleteToken('color', idx)} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Typography Tokens */}
                     <div>
                         <div className="flex justify-between items-center mb-4">
                             <h4 className="font-bold text-gray-800 flex items-center gap-2"><CaseSensitive size={18} className="text-blue-500"/> Typography</h4>
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => handleGenerateTokens('typography')}
                                  disabled={isGeneratingTokens}
                                  className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 hover:bg-blue-100 disabled:opacity-50"
                                >
                                   {isGeneratingTokens ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                   Generate Type
                                </button>
                                <button onClick={() => handleAddToken('typography')} className="text-xs text-blue-600 hover:underline">+ Add Style</button>
                             </div>
                         </div>
                         <div className="space-y-2">
                             {designSystem.typography.map((typo, idx) => (
                                 <div key={idx} className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg hover:border-gray-200 group">
                                     <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 font-serif font-bold text-sm">Aa</div>
                                     {editingToken?.type === 'typography' && editingToken?.index === idx ? (
                                         <div className="flex-1 flex gap-2">
                                             <input value={tokenValueName} onChange={e => setTokenValueName(e.target.value)} className="border rounded px-2 py-1 text-sm w-1/3 text-gray-900 bg-white" placeholder="Name" />
                                             <input value={tokenValueCode} onChange={e => setTokenValueCode(e.target.value)} className="border rounded px-2 py-1 text-sm w-full font-mono text-gray-900 bg-white" placeholder="Classes" />
                                             <button onClick={handleUpdateToken} className="text-green-600"><CheckCircle2 size={16}/></button>
                                         </div>
                                     ) : (
                                         <div className="flex-1">
                                             <div className="text-sm font-medium text-gray-800">{typo.name}</div>
                                             <div className="text-xs text-gray-500 font-mono truncate">{typo.value}</div>
                                         </div>
                                     )}
                                     {!editingToken && (
                                         <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                             <button onClick={() => { setEditingToken({type:'typography', index: idx}); setTokenValueName(typo.name); setTokenValueCode(typo.value); }} className="text-gray-400 hover:text-blue-600"><Code size={14}/></button>
                                             <button onClick={() => handleDeleteToken('typography', idx)} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             </div>
         )}


         {/* --- COMPONENTS VIEW --- */}
         {activeTab === 'components' && (
             <>
                {/* Left: Library Nav */}
                <div className="w-1/3 flex flex-col gap-4">
                    
                    {!hasComponents ? (
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                        <div className="p-3 bg-purple-50 rounded-full mb-4 text-purple-600">
                            <Atom size={32} />
                        </div>
                        <h4 className="font-bold text-gray-800 mb-2">Initialize Design System</h4>
                        <p className="text-sm text-gray-500 mb-6">
                            AI will generate a baseline set of atomic components (Buttons, Inputs, Colors) based on your project config: 
                            <span className="font-semibold text-gray-700"> {config.designStyle}</span>.
                        </p>
                        <button
                            onClick={() => onGenerateBaseline(model)}
                            disabled={isLoading}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
                        >
                            {isLoading ? 'Generating...' : 'Generate Baseline'}
                            <RefreshCw size={16} />
                        </button>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                            <div className="flex border-b border-gray-100">
                            {(['atom', 'molecule', 'organism'] as ComponentType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => { setActiveComponentType(type); setSelectedComponentId(null); setIsEditingComponentCode(false); }}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1 ${
                                        activeComponentType === type ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {type === 'atom' && <Atom size={14} />}
                                    {type === 'molecule' && <Component size={14} />}
                                    {type === 'organism' && <Layout size={14} />}
                                    {type}s
                                </button>
                            ))}
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {filteredComponents.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4">No {activeComponentType}s yet.</p>
                            )}
                            {filteredComponents.map(comp => (
                                <div 
                                    key={comp.id}
                                    onClick={() => setSelectedComponentId(comp.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group ${
                                        selectedComponentId === comp.id 
                                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-200' 
                                        : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="overflow-hidden">
                                        <div className="font-bold text-gray-800 text-sm">{comp.name}</div>
                                        <div className="text-xs text-gray-500 line-clamp-1">{comp.description}</div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setComponentToDelete(comp); }}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Preview */}
                <div className="flex-1 flex flex-col bg-gray-100 rounded-xl border border-gray-200 overflow-hidden relative">
                    {selectedComponent ? (
                        <>
                        <div className="bg-white border-b border-gray-200 p-3 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-800">{selectedComponent.name}</h4>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded uppercase">{selectedComponent.type}</span>
                            </div>
                            {isEditingComponentCode ? (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setIsEditingComponentCode(false)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Cancel</button>
                                    <button onClick={handleSaveEditedComponent} className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1 font-bold">
                                        <Check size={14} /> Save Changes
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditingComponentCode(true)} className="text-xs px-2 py-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded flex items-center gap-1">
                                    <Edit2 size={14} /> Edit Code
                                </button>
                            )}
                        </div>
                        
                        {/* Visual Preview */}
                        <div className="flex-1 p-8 flex items-center justify-center overflow-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                            <div className="bg-white p-4 border border-dashed border-gray-300 rounded shadow-sm max-w-full">
                                <div dangerouslySetInnerHTML={{ __html: isEditingComponentCode ? editedComponentCode : selectedComponent.code }} />
                            </div>
                        </div>

                        {/* Code Snippet / Editor */}
                        <div className="h-1/3 bg-slate-900 p-0 flex flex-col border-t border-gray-300">
                             <div className="px-4 py-2 bg-slate-800 text-xs text-gray-400 font-mono flex justify-between items-center">
                                <span className="flex items-center gap-2"><Code size={12} /> HTML / Tailwind</span>
                                {isEditingComponentCode && <span className="text-amber-400 text-[10px] animate-pulse">Editing...</span>}
                             </div>
                             {isEditingComponentCode ? (
                                <textarea 
                                    value={editedComponentCode}
                                    onChange={(e) => setEditedComponentCode(e.target.value)}
                                    className="flex-1 w-full p-4 bg-slate-900 text-green-400 font-mono text-xs outline-none resize-none"
                                    spellCheck={false}
                                />
                             ) : (
                                <pre className="flex-1 p-4 overflow-auto text-xs text-green-400 font-mono whitespace-pre-wrap">{selectedComponent.code}</pre>
                             )}
                        </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Eye size={48} className="mb-4 opacity-50" />
                        <p>Select a component to view details.</p>
                        </div>
                    )}
                </div>
             </>
         )}
      </div>

    </div>
  );
};