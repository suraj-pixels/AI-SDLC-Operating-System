
import React, { useState, useRef, useEffect } from 'react';
import { ProjectModule, ScreenItem, FlowJourney, AISystemState, AIGuideline, ExecutionResult } from '../types';
import { 
  ArrowRight, 
  Check, 
  Boxes, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  LayoutTemplate,
  Sparkles,
  Edit2,
  Trash2,
  X,
  ArrowDown,
  Scale,
  List,
  Kanban,
  GitFork,
  Smartphone,
  Wand2,
  ScanSearch
} from 'lucide-react';
import { ModelSelector, GEMINI_FLASH } from './ModelSelector';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { SmartChangeModal } from './SmartChangeModal';
import { ContextReviewModal, ContextItem } from './ContextReviewModal';
import { GuidelinesModal } from './GuidelinesModal';
import * as geminiService from '../services/geminiService';
import { DEFAULT_PROJECT_CONFIG } from '../constants';

interface StepScreenListProps {
  modules: ProjectModule[];
  flowData: FlowJourney[];
  aiSystem?: AISystemState;
  designSystem: any; // Passed for context
  onGenerateModules: (model: string) => void;
  onGenerateScreensForModule: (moduleId: string, model: string) => void;
  onRefineScreens: (moduleId: string, instruction: string, model: string) => void;
  onSelectScreen: (screenId: string, model: string) => void;
  onUpdateModule: (module: ProjectModule) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddModule: () => void;
  onAddScreen: (moduleId: string) => void;
  onUpdateScreen: (screen: ScreenItem) => void;
  onDeleteScreen: (moduleId: string, screenId: string) => void;
  onUpdateFlow: (newFlow: FlowJourney[]) => void;
  isLoading: boolean;
  onModulesUpdate: (modules: ProjectModule[]) => void; // New general update handler
}

export const StepScreenList: React.FC<StepScreenListProps> = ({ 
  modules, 
  flowData,
  aiSystem,
  designSystem,
  onGenerateModules, 
  onGenerateScreensForModule,
  onRefineScreens,
  onSelectScreen, 
  onUpdateModule,
  onDeleteModule,
  onAddModule,
  onAddScreen,
  onUpdateScreen,
  onDeleteScreen,
  onUpdateFlow,
  onModulesUpdate,
  isLoading 
}) => {
  const [model, setModel] = useState(GEMINI_FLASH);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  
  // View Preference
  const [viewMode, setViewMode] = useState<'flow' | 'list' | 'tree'>('tree');

  // Context Modal State
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [pendingAction, setPendingAction] = useState<{ type: 'generateModules' } | { type: 'generateScreens', moduleId: string } | null>(null);

  // Guidelines Modal State
  const [guidelinesModalOpen, setGuidelinesModalOpen] = useState(false);
  const [guidelinesTarget, setGuidelinesTarget] = useState<{ type: 'Module' | 'Screen', id: string, name: string, currentText: string } | null>(null);

  // Edit State
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModTitle, setEditModTitle] = useState('');
  const [editModDesc, setEditModDesc] = useState('');

  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [editScreenName, setEditScreenName] = useState('');
  const [editScreenDesc, setEditScreenDesc] = useState('');

  // Refine State
  const [isRefining, setIsRefining] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [activeRefineModuleId, setActiveRefineModuleId] = useState<string | null>(null);

  // Smart Change State
  const [smartChangeOpen, setSmartChangeOpen] = useState(false);
  const [smartChangeRequest, setSmartChangeRequest] = useState('');

  // --- Handlers ---

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

  const prepareModuleGeneration = () => {
    const items: ContextItem[] = [
        {
            id: 'ctx-flows',
            layer: 'flow',
            title: 'User Flows (Source)',
            content: geminiService.formatFlowToString(flowData),
            isSelected: true,
            isEditable: false,
            relevance: 'high',
            meta: 'Primary Source'
        },
        {
            id: 'ctx-ds-overview',
            layer: 'foundation',
            title: 'Design System Overview',
            content: designSystem.guidelines,
            isSelected: true,
            isEditable: false,
            relevance: 'medium'
        }
    ];
    if (aiSystem && aiSystem.guidelines.length > 0) items.push(...mapGuidelinesToContextItems(aiSystem.guidelines));
    
    setContextItems(items);
    setPendingAction({ type: 'generateModules' });
    setIsContextModalOpen(true);
  };

  const prepareScreenGeneration = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    const items: ContextItem[] = [
        {
            id: 'ctx-module',
            layer: 'focus',
            title: `Target Module: ${module?.title}`,
            content: module?.description || '',
            isSelected: true,
            isEditable: true,
            relevance: 'high',
            meta: 'Focus Target'
        },
        {
            id: 'ctx-flows',
            layer: 'flow',
            title: 'Full User Flows',
            content: geminiService.formatFlowToString(flowData),
            isSelected: true,
            isEditable: false,
            relevance: 'medium',
            meta: 'Context'
        },
        {
            id: 'ctx-siblings',
            layer: 'architecture',
            title: 'Other Modules',
            content: modules.filter(m => m.id !== moduleId).map(m => `- ${m.title}`).join('\n'),
            isSelected: true,
            isEditable: false,
            relevance: 'low'
        }
    ];
    if (aiSystem && aiSystem.guidelines.length > 0) items.push(...mapGuidelinesToContextItems(aiSystem.guidelines));
    setContextItems(items);
    setPendingAction({ type: 'generateScreens', moduleId });
    setIsContextModalOpen(true);
  };

  const handleContextConfirm = (finalContext: string) => {
    setIsContextModalOpen(false);
    if (pendingAction?.type === 'generateModules') {
        onGenerateModules(model); 
    } else if (pendingAction?.type === 'generateScreens') {
        onGenerateScreensForModule(pendingAction.moduleId, model);
    }
    setPendingAction(null);
  };

  const handleToggleModule = (id: string) => {
    if (editingModuleId) return;
    setExpandedModuleId(expandedModuleId === id ? null : id);
    setActiveRefineModuleId(null);
  };

  const openGuidelines = (e: React.MouseEvent, type: 'Module' | 'Screen', item: ProjectModule | ScreenItem) => {
    e.stopPropagation();
    setGuidelinesTarget({
      type,
      id: item.id,
      name: 'title' in item ? item.title : item.name,
      currentText: item.guidelines || ''
    });
    setGuidelinesModalOpen(true);
  };

  const handleSaveGuidelines = (text: string) => {
    if (!guidelinesTarget) return;
    if (guidelinesTarget.type === 'Module') {
       const mod = modules.find(m => m.id === guidelinesTarget.id);
       if (mod) onUpdateModule({ ...mod, guidelines: text });
    } else {
       let foundScreen: ScreenItem | undefined;
       modules.some(m => {
           const s = m.screens.find(sc => sc.id === guidelinesTarget.id);
           if (s) { foundScreen = s; return true; }
           return false;
       });
       if (foundScreen) onUpdateScreen({ ...foundScreen, guidelines: text });
    }
  };

  // Module Edit
  const startEditModule = (e: React.MouseEvent, module: ProjectModule) => {
    e.stopPropagation();
    setEditingModuleId(module.id);
    setEditModTitle(module.title);
    setEditModDesc(module.description);
    setExpandedModuleId(module.id);
  };

  const saveEditModule = (e: React.MouseEvent, moduleId: string) => {
    e.stopPropagation();
    onUpdateModule({ ...modules.find(m => m.id === moduleId)!, title: editModTitle, description: editModDesc });
    setEditingModuleId(null);
  };

  // Screen Edit
  const startEditScreen = (e: React.MouseEvent, screen: ScreenItem) => {
    e.stopPropagation();
    setEditingScreenId(screen.id);
    setEditScreenName(screen.name);
    setEditScreenDesc(screen.description);
  };

  const saveEditScreen = (e: React.MouseEvent, screen: ScreenItem) => {
    e.stopPropagation();
    onUpdateScreen({ ...screen, name: editScreenName, description: editScreenDesc });
    setEditingScreenId(null);
  };

  // Smart Change Handlers
  const initiateSmartDelete = (e: React.MouseEvent, type: 'Module' | 'Screen', name: string) => {
      e.stopPropagation();
      setSmartChangeRequest(`Delete the ${type} "${name}"`);
      setSmartChangeOpen(true);
  };

  const handleSmartExecute = (result: ExecutionResult) => {
      if (result.updatedModules) onModulesUpdate(result.updatedModules);
      if (result.updatedFlows) onUpdateFlow(result.updatedFlows);
  };

  // Refine
  const handleRefineSubmit = (moduleId: string) => {
    if (!refineInstruction) return;
    setIsRefining(true);
    onRefineScreens(moduleId, refineInstruction, model);
  };

  useEffect(() => {
    if (!isLoading && isRefining) {
        setIsRefining(false);
        setActiveRefineModuleId(null);
    }
  }, [isLoading]);

  const hasModules = modules && modules.length > 0;

  // --- TREE VIEW RENDERER ---
  const renderTreeView = () => {
    // Basic Layout Calculation
    // Root -> (Link) -> Modules -> (Link) -> Screens
    // We calculate heights to position elements absolutely or via flex with connecting lines SVG overlay.
    
    // Constants
    const NODE_HEIGHT = 60;
    const NODE_GAP = 20;
    const LEVEL_1_X = 250;
    const LEVEL_2_X = 600;
    
    // Calculate vertical positions
    let currentY = 0;
    const modulePositions: { id: string, y: number, height: number, screenPositions: { id: string, y: number }[] }[] = [];

    modules.forEach(mod => {
       const screenCount = Math.max(mod.screens.length, 1); // At least 1 slot for "Add Screen" or placeholder
       const modHeight = screenCount * (NODE_HEIGHT + NODE_GAP);
       const screenPositions = [];
       
       for(let i=0; i<mod.screens.length; i++) {
           screenPositions.push({ id: mod.screens[i].id, y: currentY + i * (NODE_HEIGHT + NODE_GAP) });
       }
       // If no screens, reserve spot for "Add" button
       if (mod.screens.length === 0) {
           screenPositions.push({ id: 'add-placeholder', y: currentY });
       }

       modulePositions.push({
           id: mod.id,
           y: currentY + (modHeight / 2) - (NODE_HEIGHT / 2),
           height: modHeight,
           screenPositions
       });
       
       currentY += modHeight + NODE_GAP * 2; // Gap between modules
    });

    const totalHeight = Math.max(currentY, 800); // Ensure minimal height
    const rootY = totalHeight / 2 - 30; // Center root

    return (
        <div className="relative w-full h-full overflow-auto bg-slate-50/50 cursor-grab active:cursor-grabbing">
            <div className="min-w-[1000px]" style={{ height: totalHeight + 100 }}>
                {/* SVG Layer for Connectors */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                        </marker>
                    </defs>
                    {modulePositions.map(modPos => (
                        <React.Fragment key={`conn-${modPos.id}`}>
                            {/* Root to Module */}
                            <path 
                                d={`M 140 ${rootY + 25} C 190 ${rootY + 25}, 190 ${modPos.y + 25}, ${LEVEL_1_X} ${modPos.y + 25}`}
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth="2"
                            />
                            {/* Module to Screens */}
                            {modPos.screenPositions.map((scrPos, idx) => (
                                <path 
                                    key={`conn-scr-${idx}`}
                                    d={`M ${LEVEL_1_X + 220} ${modPos.y + 25} C ${LEVEL_1_X + 260} ${modPos.y + 25}, ${LEVEL_2_X - 40} ${scrPos.y + 25}, ${LEVEL_2_X} ${scrPos.y + 25}`}
                                    fill="none"
                                    stroke="#cbd5e1"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                />
                            ))}
                        </React.Fragment>
                    ))}
                </svg>

                {/* Nodes Layer */}
                <div className="relative z-10 p-10">
                    
                    {/* Root Node */}
                    <div 
                        className="absolute w-36 h-14 bg-slate-900 text-white rounded-xl shadow-lg flex items-center justify-center font-bold border-2 border-slate-700 z-20"
                        style={{ top: rootY, left: 0 }}
                    >
                        <Boxes size={18} className="mr-2 text-blue-400" /> App Root
                    </div>

                    {/* Modules & Screens */}
                    {modules.map((mod, i) => {
                        const pos = modulePositions[i];
                        
                        return (
                            <React.Fragment key={mod.id}>
                                {/* Module Node */}
                                <div 
                                    className="absolute w-56 p-3 bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all group"
                                    style={{ top: pos.y, left: LEVEL_1_X }}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-gray-800 text-sm truncate flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            {mod.title}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => startEditModule(e, mod)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><Edit2 size={12}/></button>
                                            <button onClick={(e) => initiateSmartDelete(e, 'Module', mod.title)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600"><Trash2 size={12}/></button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1 truncate">{mod.description}</div>
                                </div>

                                {/* Screen Nodes */}
                                {mod.screens.map((screen, sIdx) => {
                                    const scrPos = pos.screenPositions[sIdx];
                                    const isDesigned = screen.status === 'designed';
                                    const hasPrompt = screen.status === 'prompt-ready';

                                    return (
                                        <div 
                                            key={screen.id}
                                            className={`absolute w-64 p-3 bg-white rounded-lg border transition-all hover:shadow-md group flex items-center gap-3 cursor-pointer ${
                                                isDesigned ? 'border-green-200 shadow-sm' : hasPrompt ? 'border-blue-200' : 'border-gray-200'
                                            }`}
                                            style={{ top: scrPos.y, left: LEVEL_2_X }}
                                            onClick={() => onSelectScreen(screen.id, model)}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDesigned ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {isDesigned ? <Check size={14} /> : <Smartphone size={14} />}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <div className="font-bold text-gray-800 text-sm truncate">{screen.name}</div>
                                                <div className="text-[10px] text-gray-500 truncate">{screen.status}</div>
                                            </div>
                                            
                                            {/* Hover Actions */}
                                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full pl-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                                <button 
                                                    onClick={(e) => startEditScreen(e, screen)}
                                                    className="p-1.5 bg-white border border-gray-200 rounded-full hover:text-blue-600 shadow-sm"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button 
                                                    onClick={(e) => initiateSmartDelete(e, 'Screen', screen.name)}
                                                    className="p-1.5 bg-white border border-gray-200 rounded-full hover:text-red-600 shadow-sm"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Screen Button (if module has no screens or at end) */}
                                {mod.screens.length === 0 && (
                                    <button 
                                        onClick={() => onAddScreen(mod.id)}
                                        className="absolute px-3 py-1.5 bg-white border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-400 hover:text-blue-600 hover:border-blue-300 flex items-center gap-1 transition-colors"
                                        style={{ top: pos.screenPositions[0].y + 10, left: LEVEL_2_X }}
                                    >
                                        <Plus size={12} /> Add Screen
                                    </button>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  // --- Main Render ---

  if (!hasModules && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Boxes size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Architect Your Application</h3>
        <p className="text-sm text-gray-500 max-w-md mb-8">
          AI will analyze your user flows and organize them into functional modules (e.g., Onboarding, Dashboard, Settings).
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400 font-medium">ARCHITECT MODEL:</span>
            <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
          </div>
          <button
            onClick={prepareModuleGeneration}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <Sparkles size={18} />
            Generate Modules
          </button>
          <button onClick={onAddModule} className="text-sm text-gray-500 hover:text-gray-800 underline">Skip AI & Add Manually</button>
        </div>
        <ContextReviewModal 
            isOpen={isContextModalOpen}
            onClose={() => setIsContextModalOpen(false)}
            onConfirm={handleContextConfirm}
            title="Review Architecture Context"
            description="The AI will analyze these inputs to define your application modules."
            items={contextItems}
            modelName={model}
        />
      </div>
    );
  }

  if (isLoading && !hasModules) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p>Architecting application structure...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {guidelinesTarget && (
        <GuidelinesModal 
           isOpen={guidelinesModalOpen}
           onClose={() => setGuidelinesModalOpen(false)}
           title="Specific Guidelines"
           level={guidelinesTarget.type}
           entityName={guidelinesTarget.name}
           initialGuidelines={guidelinesTarget.currentText}
           globalConfig={DEFAULT_PROJECT_CONFIG}
           onSave={handleSaveGuidelines}
        />
      )}
      <ContextReviewModal 
          isOpen={isContextModalOpen}
          onClose={() => setIsContextModalOpen(false)}
          onConfirm={handleContextConfirm}
          title={pendingAction?.type === 'generateScreens' ? "Review Screen Generation Context" : "Review Context"}
          description="The AI will use this context to define specific screens."
          items={contextItems}
          modelName={model}
      />
      
      {/* Replaced DeleteConfirmation with SmartChangeModal */}
      <SmartChangeModal 
          isOpen={smartChangeOpen}
          onClose={() => setSmartChangeOpen(false)}
          initialRequest={smartChangeRequest}
          projectModules={modules}
          projectFlows={flowData}
          designSystem={designSystem}
          onExecute={handleSmartExecute}
      />

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between flex-shrink-0">
         <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Boxes className="text-blue-600" size={20} /> Module Architecture</h3>
            <p className="text-xs text-gray-500 mt-1">Review generated modules and manage screen flows.</p>
         </div>
         <div className="flex items-center gap-3">
           <button 
             onClick={() => { setSmartChangeRequest(''); setSmartChangeOpen(true); }}
             className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
           >
             <ScanSearch size={14} /> Smart Change
           </button>
           <div className="h-8 w-px bg-gray-200"></div>
           <button onClick={onAddModule} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-lg font-medium flex items-center gap-1 border border-blue-100"><Plus size={14} /> Add Module</button>
           
           <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'tree' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Tree View (Mind Map)"
              >
                <GitFork size={14} className="rotate-90" /> Tree
              </button>
              <button 
                onClick={() => setViewMode('flow')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'flow' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Flow View (Horizontal Cards)"
              >
                <Kanban size={14} /> Flow
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="List View (Vertical Cards)"
              >
                <List size={14} /> List
              </button>
           </div>
           <div className="h-8 w-px bg-gray-200"></div>
           <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 relative">
        {viewMode === 'tree' ? renderTreeView() : (
            // LIST/FLOW VIEW
            <div className="space-y-4">
                {modules.map((module) => {
                    const isExpanded = expandedModuleId === module.id;
                    const isEditing = editingModuleId === module.id;
                    const isRefineOpen = activeRefineModuleId === module.id;
                    const hasScreens = module.screens && module.screens.length > 0;
                    
                    return (
                        <div key={module.id} className={`bg-white rounded-xl border transition-all duration-200 ${isExpanded || isEditing ? 'border-blue-300 shadow-md' : 'border-gray-200 shadow-sm hover:border-blue-200'}`}>
                            {/* Module Header */}
                            <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => handleToggleModule(module.id)}>
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}><Boxes size={20} /></div>
                                    {isEditing ? (
                                        <div className="flex-1 space-y-2 pr-4" onClick={e => e.stopPropagation()}>
                                            <input value={editModTitle} onChange={e => setEditModTitle(e.target.value)} className="w-full text-lg font-bold border border-blue-300 rounded px-2 py-1 outline-none bg-white" placeholder="Module Title" autoFocus />
                                            <input value={editModDesc} onChange={e => setEditModDesc(e.target.value)} className="w-full text-sm border border-blue-300 rounded px-2 py-1 outline-none bg-white" placeholder="Description" />
                                        </div>
                                    ) : (
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                {module.title}
                                                {module.guidelines && <div title="Has specific rules" className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                                            </h4>
                                            <p className="text-sm text-gray-500">{module.description}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => saveEditModule(e, module.id)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16} /></button>
                                            <button onClick={() => setEditingModuleId(null)} className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            {isExpanded && <button onClick={(e) => openGuidelines(e, 'Module', module)} className={`text-xs flex items-center gap-1 px-2 py-1 rounded border ${module.guidelines ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-200 hover:text-indigo-600'}`}><Scale size={12} />{module.guidelines ? 'Edit Rules' : 'Add Rules'}</button>}
                                            <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                                                <button onClick={(e) => startEditModule(e, module)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                                <button onClick={(e) => initiateSmartDelete(e, 'Module', module.title)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                            </div>
                                            {isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            {isExpanded && (
                                <div className="border-t border-gray-100 bg-gray-50/50 p-4 rounded-b-xl">
                                    <div className="flex justify-between items-center mb-6 px-1">
                                        <div className="flex items-center gap-2">
                                            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Screen Flow</h5>
                                            {hasScreens && (
                                                <button onClick={() => { if(activeRefineModuleId === module.id) setActiveRefineModuleId(null); else { setActiveRefineModuleId(module.id); setRefineInstruction(''); }}} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${isRefineOpen ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-purple-600 border-gray-200'}`}><Sparkles size={12} /> Refine/Edit Flow</button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => onAddScreen(module.id)} className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 flex items-center gap-1 font-medium"><Plus size={12} /> Add Manual</button>
                                            {!hasScreens && <button onClick={() => prepareScreenGeneration(module.id)} disabled={isLoading} className="text-xs bg-blue-600 border border-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 flex items-center gap-1 font-medium">{isLoading ? <span className="animate-spin">⟳</span> : <Sparkles size={12} />} Generate Flow</button>}
                                        </div>
                                    </div>

                                    {isRefineOpen && (
                                        <div className="mb-6 bg-purple-50 p-4 rounded-xl border border-purple-100">
                                            <label className="text-xs font-bold text-purple-800 block mb-2">Instructions for AI:</label>
                                            <div className="flex gap-2">
                                                <input className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" placeholder="e.g. 'Add a Forgot Password screen'" value={refineInstruction} onChange={(e) => setRefineInstruction(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit(module.id)} autoFocus />
                                                <button onClick={() => handleRefineSubmit(module.id)} disabled={isLoading || !refineInstruction} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50">{isLoading ? 'Processing...' : 'Update Flow'}</button>
                                            </div>
                                        </div>
                                    )}

                                    {!hasScreens ? (
                                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50"><p className="text-sm text-gray-400 mb-2">No screens defined.</p></div>
                                    ) : (
                                        viewMode === 'flow' ? (
                                            <div className="flex flex-row gap-4 overflow-x-auto pb-4 pt-2 px-1 snap-x">
                                                {module.screens.map((screen, index) => (
                                                    <div key={screen.id} className="relative flex items-center shrink-0 snap-start">
                                                        <div onClick={editingScreenId === screen.id ? undefined : () => onSelectScreen(screen.id, model)} className={`w-72 bg-white p-4 rounded-xl border transition-all relative group flex flex-col h-full shadow-sm hover:shadow-md ${editingScreenId === screen.id ? 'border-blue-400 ring-2 ring-blue-50' : 'border-gray-200 hover:border-blue-400 cursor-pointer'}`}>
                                                            {editingScreenId === screen.id ? (
                                                                <div className="space-y-3 flex-1" onClick={e => e.stopPropagation()}>
                                                                    <input value={editScreenName} onChange={e => setEditScreenName(e.target.value)} className="w-full text-sm font-bold border border-gray-300 rounded px-2 py-1 outline-none bg-white" placeholder="Screen Name" autoFocus />
                                                                    <textarea value={editScreenDesc} onChange={e => setEditScreenDesc(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none resize-none h-32 bg-white" placeholder="Description" />
                                                                    <div className="flex justify-end gap-2 pt-1"><button onClick={(e) => saveEditScreen(e, screen)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Save</button><button onClick={() => setEditingScreenId(null)} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Cancel</button></div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="flex items-center gap-2"><span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full text-[10px] font-bold text-gray-500">{index + 1}</span><span className="font-bold text-gray-800 text-sm truncate max-w-[150px]">{screen.name}</span></div>
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => startEditScreen(e, screen)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><Edit2 size={12}/></button><button onClick={(e) => initiateSmartDelete(e, 'Screen', screen.name)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500"><Trash2 size={12}/></button></div>
                                                                    </div>
                                                                    <div className="flex-1"><p className="text-xs text-gray-500 line-clamp-4 leading-relaxed">{screen.description}</p></div>
                                                                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${screen.status === 'designed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{screen.status}</span><div className="text-blue-600 group-hover:translate-x-1 transition-transform"><ArrowRight size={14} /></div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        {index < module.screens.length - 1 && <div className="mx-2 text-gray-300"><ArrowRight size={20} /></div>}
                                                    </div>
                                                ))}
                                                <div className="mx-2 text-gray-300 flex items-center justify-center"><ArrowRight size={20} /></div>
                                                <button onClick={() => onAddScreen(module.id)} className="w-24 h-48 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-600 transition-all shrink-0 snap-start"><Plus size={24} /><span className="text-xs font-bold">Add Step</span></button>
                                            </div>
                                        ) : (
                                            <div className="space-y-0 relative pl-4 pb-4">
                                                <div className="absolute left-[28px] top-4 bottom-10 w-0.5 bg-gray-200 z-0"></div>
                                                {module.screens.map((screen, index) => (
                                                    <div key={screen.id} className="relative z-10 mb-4 group/item">
                                                        {index < module.screens.length - 1 && <div className="absolute left-[20px] -bottom-5 text-gray-300 z-0"><ArrowDown size={16} /></div>}
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 mt-2 shadow-sm flex-shrink-0">{index + 1}</div>
                                                            <div onClick={() => onSelectScreen(screen.id, model)} className="flex-1 bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer relative group">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <div className="flex items-center gap-2"><LayoutTemplate size={16} className="text-gray-400 group-hover:text-blue-500" /><span className="font-bold text-gray-800 text-sm">{screen.name}</span>{screen.guidelines && <div title="Has specific rules" className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}</div>
                                                                </div>
                                                                <p className="text-sm text-gray-500 line-clamp-2 mb-2">{screen.description}</p>
                                                                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                                                                    <button onClick={(e) => startEditScreen(e, screen)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 size={14} /></button>
                                                                    <button onClick={(e) => initiateSmartDelete(e, 'Screen', screen.name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};
