
import React, { useState, useEffect } from 'react';
import { ScreenItem, WireframeItem, PromptBlueprint, ProjectModule, ProjectConfig, DesignSystemState, AISystemState, AIGuideline, FlowJourney } from '../types';
import { ModelSelector, GEMINI_FLASH, GEMINI_PRO } from './ModelSelector';
import * as geminiService from '../services/geminiService';
import { ContextReviewModal, ContextItem } from './ContextReviewModal';
import { 
  ArrowLeft, 
  ArrowRight, 
  Layers, 
  MoveUp, 
  MoveDown, 
  Plus, 
  Trash2, 
  Wand2, 
  LayoutTemplate,
  Palette,
  Component,
  MousePointerClick,
  FileCode2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface StepPromptReviewProps {
  screen: ScreenItem;
  module?: ProjectModule;
  allModules: ProjectModule[];
  flowData: FlowJourney[];
  projectContext: string;
  designSystem: DesignSystemState;
  aiSystem?: AISystemState; // Optional to prevent breakage
  config: ProjectConfig;
  
  onUpdateScreen: (screen: ScreenItem) => void;
  onGenerate: (model: string) => void;
  isLoading: boolean;
  onBack: () => void;
}

type WizardPhase = 'wireframe' | 'blueprint';

export const StepPromptReview: React.FC<StepPromptReviewProps> = ({ 
  screen, 
  module,
  allModules,
  flowData,
  projectContext,
  designSystem,
  aiSystem,
  config,
  onUpdateScreen, 
  onGenerate, 
  isLoading,
  onBack
}) => {
  const [model, setModel] = useState(GEMINI_PRO); 
  const [phase, setPhase] = useState<WizardPhase>('wireframe');
  
  // Modal State
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [pendingAction, setPendingAction] = useState<'wireframe' | 'blueprint' | null>(null);

  // Wireframe State
  const [wireframeItems, setWireframeItems] = useState<WireframeItem[]>(screen.wireframe || []);
  const [isGeneratingWireframe, setIsGeneratingWireframe] = useState(false);
  const [wireframeInstruction, setWireframeInstruction] = useState('');
  
  // Blueprint State
  const [blueprint, setBlueprint] = useState<PromptBlueprint>(
    screen.promptBlueprint || {
      layoutInstructions: '',
      visualStyle: '',
      componentUsage: '',
      interactivity: ''
    }
  );
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [activeBlueprintTab, setActiveBlueprintTab] = useState<keyof PromptBlueprint>('layoutInstructions');

  // Initialize Wireframe if empty
  useEffect(() => {
    if ((!screen.wireframe || screen.wireframe.length === 0) && !isGeneratingWireframe && phase === 'wireframe') {
       prepareWireframeGeneration();
    }
  }, []);

  // --- Context Preparation Helpers ---

  const mapGuidelinesToContextItems = (guidelines: AIGuideline[]): ContextItem[] => {
    return guidelines.map(g => ({
      id: `gl-${g.id}`,
      layer: 'guideline',
      title: `${g.category.toUpperCase()}: ${g.title}`,
      content: g.content,
      isSelected: g.isActive, 
      isEditable: false,
      relevance: g.isActive ? 'high' : 'low'
    }));
  };

  const prepareWireframeGeneration = () => {
    const globalGuidelines = config.customInstructions ? `GLOBAL RULES:\n${config.customInstructions}` : '';
    const moduleGuidelines = module?.guidelines ? `MODULE RULES:\n${module.guidelines}` : '';
    const screenGuidelines = screen.guidelines ? `SCREEN RULES:\n${screen.guidelines}` : '';
    const allGuidelines = [globalGuidelines, moduleGuidelines, screenGuidelines].filter(Boolean).join('\n\n');
    const flowContext = geminiService.buildFlowContext(screen.id, allModules, flowData);

    const items: ContextItem[] = [
      {
        id: 'ctx-screen',
        layer: 'focus',
        title: `Target Screen: ${screen.name}`,
        content: screen.description,
        isSelected: true,
        isEditable: true,
        relevance: 'high',
        meta: 'Target'
      },
      {
        id: 'ctx-flow',
        layer: 'flow',
        title: 'Sequential Flow Context',
        content: flowContext,
        isSelected: true,
        isEditable: true,
        relevance: 'high',
        meta: 'Nearest Journey'
      },
      {
        id: 'ctx-guidelines',
        layer: 'focus',
        title: 'Hierarchical Guidelines',
        content: allGuidelines || 'No specific guidelines set.',
        isSelected: true,
        isEditable: false,
        relevance: 'medium'
      },
      {
        id: 'ctx-module',
        layer: 'architecture',
        title: `Module: ${module?.title || 'Unknown'}`,
        content: module?.description || '',
        isSelected: true,
        isEditable: false,
        relevance: 'medium'
      },
      {
        id: 'ctx-prd',
        layer: 'foundation',
        title: 'Project Requirements (PRD)',
        content: projectContext,
        isSelected: true,
        isEditable: false,
        relevance: 'low'
      }
    ];

    if (aiSystem && aiSystem.guidelines.length > 0) {
        items.push(...mapGuidelinesToContextItems(aiSystem.guidelines));
    }

    setContextItems(items);
    setPendingAction('wireframe');
    setIsContextModalOpen(true);
  };

  const prepareBlueprintGeneration = () => {
    const dsContext = geminiService.formatDesignSystemToContext(designSystem);
    const wireframeStr = wireframeItems.map(w => `- ${w.sectionName}: ${w.description} (Elements: ${w.essentialElements.join(', ')})`).join('\n');
    const flowContext = geminiService.buildFlowContext(screen.id, allModules, flowData);
    
    const globalGuidelines = config.customInstructions ? `GLOBAL RULES:\n${config.customInstructions}` : '';
    const moduleGuidelines = module?.guidelines ? `MODULE RULES:\n${module.guidelines}` : '';
    const screenGuidelines = screen.guidelines ? `SCREEN RULES:\n${screen.guidelines}` : '';
    const allGuidelines = [globalGuidelines, moduleGuidelines, screenGuidelines].filter(Boolean).join('\n\n');

    const items: ContextItem[] = [
      {
        id: 'ctx-wireframe',
        layer: 'focus',
        title: 'Wireframe Structure',
        content: wireframeStr,
        isSelected: true,
        isEditable: true,
        relevance: 'high',
        meta: 'Design Source'
      },
      {
        id: 'ctx-ds',
        layer: 'foundation',
        title: 'Design System & Tokens',
        content: dsContext,
        isSelected: true,
        isEditable: false,
        relevance: 'high',
        meta: 'Styling Source'
      },
      {
        id: 'ctx-flow',
        layer: 'flow',
        title: 'Sequential Flow Context',
        content: flowContext,
        isSelected: true,
        isEditable: true,
        relevance: 'medium'
      },
      {
        id: 'ctx-guidelines',
        layer: 'focus',
        title: 'Hierarchical Guidelines',
        content: allGuidelines || 'No specific guidelines set.',
        isSelected: true,
        isEditable: false,
        relevance: 'medium'
      },
      {
        id: 'ctx-config',
        layer: 'foundation',
        title: 'Style Config',
        content: `Style: ${config.designStyle}\nRadius: ${config.borderRadius}\nInstructions: ${config.customInstructions}`,
        isSelected: true,
        isEditable: true,
        relevance: 'medium'
      }
    ];

    if (aiSystem && aiSystem.guidelines.length > 0) {
        items.push(...mapGuidelinesToContextItems(aiSystem.guidelines));
    }

    setContextItems(items);
    setPendingAction('blueprint');
    setIsContextModalOpen(true);
  };

  // --- AI Triggers ---

  const handleContextConfirm = async (finalContext: string) => {
    setIsContextModalOpen(false);

    if (pendingAction === 'wireframe') {
      setIsGeneratingWireframe(true);
      try {
         const items = await geminiService.generateScreenWireframe(screen, module, finalContext, model);
         setWireframeItems(items);
         onUpdateScreen({ ...screen, wireframe: items });
      } catch (e) {
         console.error(e);
      } finally {
         setIsGeneratingWireframe(false);
      }
    } else if (pendingAction === 'blueprint') {
      setIsGeneratingBlueprint(true);
      try {
          const bp = await geminiService.generatePromptBlueprint(screen, wireframeItems, finalContext, config, model);
          setBlueprint(bp);
          onUpdateScreen({ ...screen, promptBlueprint: bp });
      } catch (e) {
          console.error(e);
          alert("Failed to generate blueprint.");
      } finally {
          setIsGeneratingBlueprint(false);
      }
    }
    setPendingAction(null);
  };

  const handleRefineWireframe = async () => {
    if (!wireframeInstruction) return;
    setIsGeneratingWireframe(true);
    try {
       const newItems = await geminiService.refineWireframe(wireframeItems, wireframeInstruction, screen.name, model);
       setWireframeItems(newItems);
       onUpdateScreen({ ...screen, wireframe: newItems });
       setWireframeInstruction('');
    } catch (e) {
       console.error(e);
    } finally {
       setIsGeneratingWireframe(false);
    }
  };

  const handleWireframeItemChange = (id: string, field: keyof WireframeItem, value: string) => {
     const updated = wireframeItems.map(item => item.id === id ? { ...item, [field]: value } : item);
     setWireframeItems(updated);
     onUpdateScreen({ ...screen, wireframe: updated });
  };

  const moveWireframeItem = (index: number, direction: 'up' | 'down') => {
      const newItems = [...wireframeItems];
      if (direction === 'up' && index > 0) {
          [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
      } else if (direction === 'down' && index < newItems.length - 1) {
          [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      }
      setWireframeItems(newItems);
      onUpdateScreen({ ...screen, wireframe: newItems });
  };

  const deleteWireframeItem = (id: string) => {
      const newItems = wireframeItems.filter(i => i.id !== id);
      setWireframeItems(newItems);
      onUpdateScreen({ ...screen, wireframe: newItems });
  };

  const addWireframeItem = () => {
      const newItem: WireframeItem = {
          id: crypto.randomUUID(),
          sectionName: 'New Section',
          description: 'Describe functionality...',
          essentialElements: []
      };
      setWireframeItems([...wireframeItems, newItem]);
  };

  // --- Transition to Blueprint ---

  const handleProceedToBlueprint = async () => {
     if (wireframeItems.length === 0) {
         alert("Please add at least one section to the wireframe.");
         return;
     }

     setPhase('blueprint');
     
     if (!screen.promptBlueprint || Object.values(screen.promptBlueprint).every(v => !v)) {
        prepareBlueprintGeneration();
     }
  };

  const handleBlueprintChange = (key: keyof PromptBlueprint, val: string) => {
      const updated = { ...blueprint, [key]: val };
      setBlueprint(updated);
      onUpdateScreen({ ...screen, promptBlueprint: updated });
  };

  // --- Final Generation ---

  const handleFinalGenerate = () => {
     // We include a summary of the flow context even in the final prompt wrapper for safety
     const flowSummary = geminiService.buildFlowContext(screen.id, allModules, flowData);

     const compiledPrompt = `
SCREEN NAME: ${screen.name}
DESCRIPTION: ${screen.description}

FLOW CONTEXT:
${flowSummary}

WIREFRAME STRUCTURE (Top to Bottom):
${wireframeItems.map((w, i) => `${i+1}. ${w.sectionName}: ${w.description} [Elements: ${w.essentialElements.join(', ')}]`).join('\n')}

DETAILED IMPLEMENTATION BLUEPRINT:
1. LAYOUT RULES:
${blueprint.layoutInstructions}

2. VISUAL STYLE:
${blueprint.visualStyle}

3. COMPONENT USAGE:
${blueprint.componentUsage}

4. INTERACTIVITY:
${blueprint.interactivity}
     `;
     
     onUpdateScreen({ ...screen, designPrompt: compiledPrompt });
     onGenerate(model);
  };

  // --- RENDERERS ---

  const renderWireframeEditor = () => (
      <div className="flex h-full gap-6 overflow-hidden">
          {/* Left: List */}
          <div className="flex-1 flex flex-col min-w-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
             <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-gray-700 font-bold">
                    <Layers size={18} className="text-blue-600" />
                    Structure Builder
                </div>
                <button onClick={addWireframeItem} className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-600">
                    <Plus size={14} /> Add Block
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {isGeneratingWireframe && wireframeItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <RefreshCw className="animate-spin mb-2" size={24} />
                        <p className="text-sm">Architecting page structure...</p>
                    </div>
                )}
                
                {wireframeItems.map((item, idx) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm group hover:border-blue-300 transition-colors">
                        <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1 mt-1 text-gray-300">
                                <button onClick={() => moveWireframeItem(idx, 'up')} disabled={idx === 0} className="hover:text-blue-500 disabled:opacity-20"><MoveUp size={14} /></button>
                                <span className="text-xs font-mono font-bold text-center text-gray-400">{idx + 1}</span>
                                <button onClick={() => moveWireframeItem(idx, 'down')} disabled={idx === wireframeItems.length - 1} className="hover:text-blue-500 disabled:opacity-20"><MoveDown size={14} /></button>
                            </div>
                            
                            <div className="flex-1 space-y-2">
                                <input 
                                   className="w-full text-sm font-bold text-gray-900 border-none p-0 focus:ring-0 placeholder:text-gray-300"
                                   value={item.sectionName}
                                   onChange={(e) => handleWireframeItemChange(item.id, 'sectionName', e.target.value)}
                                   placeholder="Section Name (e.g. Hero)"
                                />
                                <textarea 
                                   className="w-full text-xs text-gray-900 border border-gray-100 bg-gray-50 rounded p-2 focus:bg-white focus:border-blue-200 outline-none resize-none"
                                   value={item.description}
                                   onChange={(e) => handleWireframeItemChange(item.id, 'description', e.target.value)}
                                   placeholder="What goes in this section?"
                                   rows={2}
                                />
                            </div>

                            <button onClick={() => deleteWireframeItem(item.id)} className="text-gray-300 hover:text-red-500 self-start p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          </div>

          {/* Right: AI Assist */}
          <div className="w-80 flex flex-col bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
              <div className="p-4 bg-blue-100/50 border-b border-blue-200">
                 <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Wand2 size={16} /> AI Architect
                 </h4>
                 <p className="text-xs text-blue-700 mt-1">Suggest structural changes.</p>
              </div>
              <div className="flex-1 p-4">
                  <label className="text-xs font-bold text-blue-800 mb-2 block">Refinement Instruction</label>
                  <textarea 
                     className="w-full h-32 p-3 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none resize-none bg-white text-gray-900"
                     placeholder="e.g. 'Add a testimonial section before the footer', 'Make the hero focused on video content'."
                     value={wireframeInstruction}
                     onChange={e => setWireframeInstruction(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleRefineWireframe()}
                  />
                  <button 
                    onClick={handleRefineWireframe}
                    disabled={isGeneratingWireframe || !wireframeInstruction}
                    className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                     {isGeneratingWireframe ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
                     Update Structure
                  </button>
              </div>
              <div className="p-4 border-t border-blue-200 bg-white">
                 <div className="text-xs text-gray-500 mb-2">Model:</div>
                 <ModelSelector value={model} onChange={setModel} disabled={isLoading || isGeneratingWireframe} />
              </div>
          </div>
      </div>
  );

  const renderBlueprintEditor = () => (
      <div className="flex h-full gap-6 overflow-hidden">
          {/* Left: Tabs */}
          <div className="w-64 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
             <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                 Blueprint Sections
             </div>
             <div className="flex-1 overflow-y-auto py-2">
                 {[
                    { id: 'layoutInstructions', label: 'Layout & Grid', icon: LayoutTemplate },
                    { id: 'visualStyle', label: 'Visual Style', icon: Palette },
                    { id: 'componentUsage', label: 'Components', icon: Component },
                    { id: 'interactivity', label: 'Interactivity', icon: MousePointerClick },
                 ].map((tab) => (
                    <button
                       key={tab.id}
                       onClick={() => setActiveBlueprintTab(tab.id as keyof PromptBlueprint)}
                       className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm font-medium border-l-4 transition-colors ${
                          activeBlueprintTab === tab.id 
                          ? 'border-purple-600 bg-purple-50 text-purple-800' 
                          : 'border-transparent text-gray-600 hover:bg-gray-50'
                       }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                 ))}
             </div>
             <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={prepareBlueprintGeneration} 
                  className="w-full py-2 bg-purple-50 text-purple-700 rounded text-xs font-bold hover:bg-purple-100 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={12} /> Regenerate All
                </button>
             </div>
          </div>

          {/* Right: Editor */}
          <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative">
              {isGeneratingBlueprint ? (
                  <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                      <RefreshCw className="animate-spin text-purple-600 mb-4" size={32} />
                      <p className="font-bold text-gray-700">Generating detailed blueprint...</p>
                  </div>
              ) : null}

              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                     <FileCode2 size={18} className="text-purple-600" /> 
                     {activeBlueprintTab === 'layoutInstructions' ? 'Layout Strategy' : 
                      activeBlueprintTab === 'visualStyle' ? 'Visual Styling Rules' :
                      activeBlueprintTab === 'componentUsage' ? 'Component Selection' : 'Interaction Behaviors'}
                  </h4>
                  <span className="text-xs text-gray-400">Markdown Supported</span>
              </div>
              <textarea 
                  className="flex-1 w-full p-6 text-sm font-mono leading-relaxed text-gray-900 outline-none resize-none focus:bg-gray-50 transition-colors"
                  value={blueprint[activeBlueprintTab]}
                  onChange={(e) => handleBlueprintChange(activeBlueprintTab, e.target.value)}
                  placeholder={`Detailed instructions for ${activeBlueprintTab}...`}
              />
          </div>
      </div>
  );

  return (
    <>
      <ContextReviewModal 
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        onConfirm={handleContextConfirm}
        title={pendingAction === 'wireframe' ? "Review Wireframe Context" : "Review Blueprint Context"}
        description="Select the knowledge sources the AI should use to generate this artifact."
        items={contextItems}
        modelName={model}
      />

      <div className="flex flex-col h-full space-y-4">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                <ArrowLeft size={16} /> Map
            </button>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-gray-400 font-normal">Prompt Architect:</span> {screen.name}
            </h3>
          </div>

          {/* Phase Indicator */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setPhase('wireframe')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${phase === 'wireframe' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >
                <Layers size={14} /> 1. Wireframe
            </button>
            <ArrowRight size={14} className="mx-2 text-gray-400 self-center" />
            <button 
              onClick={() => { if(wireframeItems.length > 0) handleProceedToBlueprint(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${phase === 'blueprint' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}
            >
                <FileCode2 size={14} /> 2. Blueprint
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0">
            {phase === 'wireframe' ? renderWireframeEditor() : renderBlueprintEditor()}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-400 flex items-center gap-2">
              <ModelSelector value={model} onChange={setModel} disabled={isLoading || isGeneratingBlueprint || isGeneratingWireframe} />
          </div>

          {phase === 'wireframe' ? (
              <button
                  onClick={handleProceedToBlueprint}
                  disabled={wireframeItems.length === 0}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                  Next: Build Blueprint <ArrowRight size={18} />
              </button>
          ) : (
              <div className="flex gap-3">
                  <button onClick={() => setPhase('wireframe')} className="text-gray-500 hover:text-gray-800 text-sm font-medium px-4">
                      Back to Structure
                  </button>
                  <button
                      onClick={handleFinalGenerate}
                      disabled={isLoading}
                      className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:translate-y-[-1px] flex items-center gap-2 disabled:opacity-50"
                  >
                      {isLoading ? (
                          <>
                              <RefreshCw className="animate-spin" size={20} /> Generating UI...
                          </>
                      ) : (
                          <>
                              <CheckCircle2 size={20} /> Generate Final Design
                          </>
                      )}
                  </button>
              </div>
          )}
        </div>
      </div>
    </>
  );
};
