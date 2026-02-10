
import React, { useState, useMemo } from 'react';
import { ProjectState, AppStep, AppWorkspace } from '../types';
import { 
  Database, 
  BrainCircuit, 
  Layers, 
  Palette, 
  ChevronRight, 
  ChevronDown, 
  Activity, 
  Cpu, 
  Zap, 
  User, 
  Target, 
  Search, 
  Code2, 
  Box, 
  GitBranch, 
  Lightbulb,
  ArrowRight,
  Sliders,
  Eye,
  Network,
  Focus,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

interface ContextInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  projectState: ProjectState;
  currentStep: AppStep;
  currentWorkspace: AppWorkspace;
}

// Helper to estimate tokens
const estimateTokens = (text: string) => Math.ceil((text || '').length / 4);

type ContextRelevance = 'high' | 'medium' | 'low' | 'background';

interface ContextItem {
  id: string;
  title: string;
  type: string;
  relevance: ContextRelevance;
  tokens: number;
  description?: string;
}

export const ContextInspector: React.FC<ContextInspectorProps> = ({ 
  isOpen, 
  onClose, 
  projectState, 
  currentStep, 
  currentWorkspace 
}) => {
  const [activeTab, setActiveTab] = useState<'focus' | 'memory' | 'prompt'>('focus');
  const [searchTerm, setSearchTerm] = useState('');

  // --- 1. DETERMINE CURRENT CONTEXTUAL FOCUS ---
  const currentFocus = useMemo(() => {
      // Find active screen/module if in Design mode
      let targetName = 'Global Project';
      let targetType = 'System';
      
      if (currentWorkspace === AppWorkspace.DESIGN && projectState.selectedScreenId) {
          const mod = projectState.modules.find(m => m.screens.some(s => s.id === projectState.selectedScreenId));
          const screen = mod?.screens.find(s => s.id === projectState.selectedScreenId);
          if (screen) {
              targetName = screen.name;
              targetType = 'Screen';
          }
      } else if (currentWorkspace === AppWorkspace.STRATEGY) {
          targetName = 'Product Requirements';
          targetType = 'Strategy';
      } else if (currentWorkspace === AppWorkspace.ARCHITECTURE) {
          targetName = 'User Flows & IA';
          targetType = 'Architecture';
      }

      return { targetName, targetType };
  }, [currentWorkspace, projectState]);

  // --- 2. CALCULATE CONTEXT RELEVANCE MAP ---
  const contextMap = useMemo(() => {
      const items: ContextItem[] = [];
      const { selectedScreenId, modules, flowData, designSystem, prdSections, aiSystem, projectInsights, userPersonas } = projectState;

      // Helper to add item
      const add = (id: string, title: string, type: string, text: string, defaultRel: ContextRelevance) => {
          items.push({
              id, title, type, relevance: defaultRel, tokens: estimateTokens(text), description: text.slice(0, 100)
          });
      };

      // A. Strategy Data
      const prdRel = currentWorkspace === AppWorkspace.STRATEGY ? 'high' : 'medium';
      prdSections.forEach(s => add(s.id, s.title, 'PRD', s.content, prdRel));
      
      const insightRel = currentWorkspace === AppWorkspace.STRATEGY ? 'high' : 'low';
      projectInsights.forEach(i => add(i.id, i.title, 'Insight', i.description, insightRel));

      const personaRel = (currentWorkspace === AppWorkspace.STRATEGY || currentWorkspace === AppWorkspace.DESIGN) ? 'high' : 'medium';
      userPersonas.forEach(p => add(p.id, p.name, 'Persona', p.description, personaRel));

      // B. Architecture Data
      const flowRel = currentWorkspace === AppWorkspace.ARCHITECTURE ? 'high' : currentWorkspace === AppWorkspace.DESIGN ? 'medium' : 'low';
      flowData.forEach((f, i) => add(`flow-${i}`, f.title, 'Flow', JSON.stringify(f.steps), flowRel));

      // C. Design Context (Dynamic)
      if (selectedScreenId) {
          // Find the active module and screen
          const activeMod = modules.find(m => m.screens.some(s => s.id === selectedScreenId));
          const activeScreen = activeMod?.screens.find(s => s.id === selectedScreenId);

          if (activeMod && activeScreen) {
              // 1. The Screen Itself (Highest Priority)
              add(activeScreen.id, activeScreen.name, 'Active Screen', activeScreen.description, 'high');
              
              // 2. The Module (High Priority)
              add(activeMod.id, activeMod.title, 'Parent Module', activeMod.description, 'high');

              // 3. Adjacent Screens (Medium Priority) - Strategy: Provide context on where user comes from/goes to
              const screenIdx = activeMod.screens.findIndex(s => s.id === selectedScreenId);
              if (screenIdx > 0) {
                  const prev = activeMod.screens[screenIdx - 1];
                  add(prev.id, `Previous: ${prev.name}`, 'Context', prev.description, 'medium');
              }
              if (screenIdx < activeMod.screens.length - 1) {
                  const next = activeMod.screens[screenIdx + 1];
                  add(next.id, `Next: ${next.name}`, 'Context', next.description, 'medium');
              }

              // 4. Other Modules (Background)
              modules.forEach(m => {
                  if (m.id !== activeMod.id) {
                      add(m.id, m.title, 'Other Module', m.description, 'background');
                  }
              });
          }
      } else {
          // No specific screen selected
          modules.forEach(m => add(m.id, m.title, 'Module', m.description, currentWorkspace === AppWorkspace.ARCHITECTURE ? 'high' : 'low'));
      }

      // D. Design System
      const dsRel = currentWorkspace === AppWorkspace.DESIGN ? 'high' : 'low';
      add('ds-colors', 'Color Palette', 'Design System', JSON.stringify(designSystem.colors), dsRel);
      add('ds-typo', 'Typography', 'Design System', JSON.stringify(designSystem.typography), dsRel);
      add('ds-components', 'Component Library', 'Design System', JSON.stringify(designSystem.components), dsRel);

      // E. AI Guidelines
      aiSystem.guidelines.forEach(g => {
          add(g.id, g.title, 'Guideline', g.content, g.isActive ? 'high' : 'background');
      });

      return items.sort((a, b) => {
          const score = { high: 4, medium: 3, low: 2, background: 1 };
          return score[b.relevance] - score[a.relevance];
      });
  }, [projectState, currentWorkspace, currentStep]);

  // --- 3. PROMPT PREVIEW GENERATOR ---
  const promptPreview = useMemo(() => {
      const activeItems = contextMap.filter(i => i.relevance === 'high' || i.relevance === 'medium');
      const systemInstructions = projectState.config.customInstructions;
      
      return `
SYSTEM: ${systemInstructions}

CONTEXT (${activeItems.length} items):
${activeItems.map(i => `- [${i.type}] ${i.title}`).join('\n')}

TASK:
[AI will perform action relevant to ${currentWorkspace} workspace...]
      `.trim();
  }, [contextMap, projectState.config, currentWorkspace]);

  // --- 4. STATS ---
  const stats = useMemo(() => {
      const activeTokens = contextMap.filter(i => i.relevance === 'high' || i.relevance === 'medium').reduce((acc, i) => acc + i.tokens, 0);
      const totalTokens = contextMap.reduce((acc, i) => acc + i.tokens, 0);
      return { activeTokens, totalTokens, usage: Math.round((activeTokens / 128000) * 100) };
  }, [contextMap]);

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col h-full shadow-2xl z-50 transform transition-transform font-sans">
      
      {/* Header: Dynamic Status */}
      <div className="p-5 border-b border-slate-200 bg-slate-50 relative overflow-hidden flex-shrink-0">
        {/* Dynamic Background Gradient based on Relevance */}
        <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 opacity-20 ${
            currentWorkspace === AppWorkspace.STRATEGY ? 'bg-orange-500' :
            currentWorkspace === AppWorkspace.DESIGN ? 'bg-purple-500' : 'bg-blue-500'
        }`}></div>
        
        <div className="relative z-10 flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-900 rounded-lg text-white">
                    <Database size={18} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 text-sm">Adaptive Context</h3>
                    <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        Monitoring: <span className="text-blue-600 font-bold">{currentFocus.targetType}</span>
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-1.5 rounded-md border border-slate-200 hover:border-slate-300">✕</button>
        </div>

        {/* Token Budget Meter */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Cpu size={10} /> Active Memory Load
                </span>
                <span className={`text-[10px] font-mono font-bold ${stats.usage > 50 ? 'text-orange-500' : 'text-green-500'}`}>
                    {stats.activeTokens.toLocaleString()} tokens
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500" style={{ width: `${(stats.activeTokens / stats.totalTokens) * 100}%` }}></div>
                <div className="h-full bg-slate-300" style={{ width: `${((stats.totalTokens - stats.activeTokens) / stats.totalTokens) * 100}%` }}></div>
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-slate-400">
                <span>Focus Data</span>
                <span>Background Data</span>
            </div>
        </div>
      </div>
      
      {/* View Switcher */}
      <div className="p-2 border-b border-slate-100 bg-white grid grid-cols-3 gap-1 sticky top-0 z-20">
          <button 
            onClick={() => setActiveTab('focus')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'focus' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              <Focus size={14} /> Focus
          </button>
          <button 
            onClick={() => setActiveTab('memory')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'memory' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              <Database size={14} /> Memory
          </button>
          <button 
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'prompt' ? 'bg-purple-50 text-purple-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              <MessageSquare size={14} /> Preview
          </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
        
        {/* VIEW 1: ACTIVE FOCUS */}
        {activeTab === 'focus' && (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-100 rounded text-blue-800 text-xs">
                    <Activity size={14} className="animate-pulse" />
                    <span>The AI is currently prioritized on these items:</span>
                </div>

                {/* High Relevance */}
                <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">High Priority</h4>
                    <div className="space-y-2">
                        {contextMap.filter(i => i.relevance === 'high').map(item => (
                            <div key={item.id} className="bg-white border border-l-4 border-l-green-500 border-gray-200 rounded-lg p-3 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-xs text-gray-800">{item.title}</span>
                                    <span className="text-[9px] bg-gray-100 px-1.5 rounded text-gray-500">{item.type}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 truncate">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Medium Relevance */}
                <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Supporting Context</h4>
                    <div className="space-y-2">
                        {contextMap.filter(i => i.relevance === 'medium').map(item => (
                            <div key={item.id} className="bg-white border border-l-4 border-l-blue-400 border-gray-200 rounded-lg p-3 shadow-sm opacity-90">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-xs text-gray-700">{item.title}</span>
                                    <span className="text-[9px] bg-gray-100 px-1.5 rounded text-gray-500">{item.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* VIEW 2: FULL MEMORY */}
        {activeTab === 'memory' && (
            <div className="space-y-4">
                <div className="relative mb-4">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search system memory..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
                    />
                </div>

                {/* All Items Grouped */}
                {['PRD', 'Persona', 'Module', 'Screen', 'Design System', 'Guideline'].map(type => {
                    const items = contextMap.filter(i => i.type.includes(type) && i.title.toLowerCase().includes(searchTerm.toLowerCase()));
                    if (items.length === 0) return null;
                    return (
                        <div key={type}>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">{type}s</h4>
                            <div className="space-y-1">
                                {items.map(item => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded px-3 py-2 flex justify-between items-center hover:bg-gray-50">
                                        <span className="text-xs text-gray-600 truncate max-w-[180px]">{item.title}</span>
                                        <span className={`text-[9px] px-1.5 rounded ${
                                            item.relevance === 'high' ? 'bg-green-100 text-green-700' :
                                            item.relevance === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {item.relevance}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* VIEW 3: PROMPT SIMULATOR */}
        {activeTab === 'prompt' && (
            <div className="h-full flex flex-col">
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-bold text-purple-800 flex items-center gap-2 mb-1">
                        <BrainCircuit size={14} /> Simulation
                    </h4>
                    <p className="text-[10px] text-purple-600">
                        This is a preview of the structural prompt the AI receives based on your current focus.
                    </p>
                </div>
                <div className="flex-1 bg-slate-900 rounded-lg p-3 overflow-auto border border-slate-700">
                    <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                        {promptPreview}
                    </pre>
                </div>
            </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-[9px] text-slate-400 font-mono">Auto-Context: ON</span>
          <button className="text-[9px] text-blue-600 font-bold flex items-center gap-1 hover:underline">
              <Sliders size={10} /> Configure Rules
          </button>
      </div>
    </div>
  );
};
