
import React, { useState, useEffect, useRef } from 'react';
import { ModelSelector, GEMINI_FLASH } from './ModelSelector';
import { Edit2, Eye, RefreshCw, CheckCircle2, Map as MapIcon, ArrowRight, X, Workflow } from 'lucide-react';
import { FlowJourney } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

declare global {
  interface Window {
    mermaid: any;
  }
}

interface StepFlowProps {
  flowData: FlowJourney[];
  onChange: (val: FlowJourney[]) => void;
  onNext: (model: string) => void;
  onRegenerate: (model: string) => void;
  isLoading: boolean;
}

export const StepFlow: React.FC<StepFlowProps> = ({ 
  flowData, 
  onChange, 
  onNext, 
  onRegenerate, 
  isLoading 
}) => {
  const [model, setModel] = useState(GEMINI_FLASH);
  const [viewMode, setViewMode] = useState<'list' | 'diagram' | 'json'>('diagram');
  const [jsonText, setJsonText] = useState('');
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Initialize mermaid
  useEffect(() => {
    if (window.mermaid) {
      window.mermaid.initialize({ 
        startOnLoad: true,
        theme: 'neutral',
        securityLevel: 'loose',
        flowchart: {
            curve: 'basis', // Smooth curves
            rankSpacing: 50,
            nodeSpacing: 50
        }
      });
    }
  }, []);

  // Render mermaid chart
  useEffect(() => {
    if (viewMode === 'diagram' && flowData.length > 0 && mermaidRef.current) {
      const renderChart = async () => {
        // We use a Map to merge identical nodes across different journeys to create a branching effect
        const nodeMap = new Map<string, string>(); // Description -> ID
        const edges = new Set<string>(); // "ID1-->ID2"
        let nodeCounter = 0;

        const getNodeId = (desc: string) => {
            const cleanDesc = desc.trim().toLowerCase();
            if (!nodeMap.has(cleanDesc)) {
                nodeMap.set(cleanDesc, `node_${nodeCounter++}`);
            }
            return nodeMap.get(cleanDesc)!;
        };

        const getSafeLabel = (desc: string) => {
            return desc.replace(/"/g, "'").substring(0, 50) + (desc.length > 50 ? '...' : '');
        };

        // Graph Definition
        let graphDefinition = 'graph LR\n';
        
        // Define Styles
        graphDefinition += '  classDef default fill:#fff,stroke:#cbd5e1,stroke-width:2px,color:#334155,rx:5,ry:5;\n';
        graphDefinition += '  classDef startNode fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a,font-weight:bold;\n';
        graphDefinition += '  classDef endNode fill:#f0fdf4,stroke:#22c55e,stroke-width:2px,color:#14532d;\n';

        flowData.forEach((journey) => {
          journey.steps.forEach((step, sIdx) => {
             const currentId = getNodeId(step.description);
             
             // Build Node Line
             const isStart = sIdx === 0;
             const isEnd = sIdx === journey.steps.length - 1;
             
             // Note: Mermaid might error if we redefine the node with different classes, 
             // but usually last definition wins or it's ignored. We'll try to apply classes at the end.
             
             if (sIdx > 0) {
                const prevId = getNodeId(journey.steps[sIdx - 1].description);
                edges.add(`${prevId} --> ${currentId}`);
             }
          });
        });

        // Output Nodes
        for (const [desc, id] of nodeMap.entries()) {
            // Find if this is a start or end node in ANY journey
            const isStart = flowData.some(j => j.steps[0].description.trim().toLowerCase() === desc);
            const isEnd = flowData.some(j => j.steps[j.steps.length-1].description.trim().toLowerCase() === desc);
            
            let className = 'default';
            if (isStart) className = 'startNode';
            else if (isEnd) className = 'endNode';

            // Capitalize for display
            const label = getSafeLabel(desc.charAt(0).toUpperCase() + desc.slice(1));
            graphDefinition += `  ${id}["${label}"]:::${className}\n`;
        }

        // Output Edges
        edges.forEach(edge => {
            graphDefinition += `  ${edge}\n`;
        });
        
        // Render
        if (mermaidRef.current) {
            mermaidRef.current.innerHTML = '';
            try {
                const { svg } = await window.mermaid.render('mermaid-chart-svg', graphDefinition);
                mermaidRef.current.innerHTML = svg;
            } catch (error) {
                console.error('Mermaid render error:', error);
                mermaidRef.current.innerHTML = '<div class="text-red-500 text-sm p-4 bg-red-50 rounded">Failed to render graph. Try List view.</div>';
            }
        }
      };
      
      setTimeout(renderChart, 200);
    }
  }, [viewMode, flowData]);

  const handleEditToggle = () => {
    if (viewMode !== 'json') {
      setJsonText(JSON.stringify(flowData, null, 2));
      setViewMode('json');
    } else {
      try {
        const parsed = JSON.parse(jsonText);
        onChange(parsed);
        setViewMode('list');
      } catch (e) {
        alert("Invalid JSON format");
      }
    }
  };

  const confirmRegenerate = () => {
    onRegenerate(model);
    setShowRegenConfirm(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <DeleteConfirmationModal 
         isOpen={showRegenConfirm}
         onClose={() => setShowRegenConfirm(false)}
         onConfirm={confirmRegenerate}
         title="Regenerate Flow?"
         description="Are you sure you want to discard the current user flow and generate a new one?"
         impactList={['All current steps and journeys will be overwritten.', 'You may need to re-map modules in the next step.']}
         confirmLabel="Regenerate"
         icon="refresh"
         isDestructive={true}
      />

      {/* Header Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
         <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><MapIcon className="text-blue-600" size={20} /> User Flow Blueprint</h3>
            <p className="text-xs text-gray-500 mt-1">Review the logic journeys before proceeding.</p>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
               <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}><Eye size={16} /> List</button>
               <button onClick={() => setViewMode('diagram')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'diagram' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}><Workflow size={16} /> Graph</button>
               <button onClick={handleEditToggle} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'json' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}><Edit2 size={16} /> JSON</button>
            </div>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
              <button onClick={() => setShowRegenConfirm(true)} disabled={isLoading} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Regenerate Flow"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
            </div>
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden rounded-xl bg-gray-50/50 relative flex flex-col border border-gray-200">
        {viewMode === 'json' && (
          <div className="w-full h-full p-0"><textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} className="w-full h-full p-4 font-mono text-xs leading-relaxed text-slate-900 outline-none resize-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder='[{"title": "...", "steps": [...]}]' /></div>
        )}

        {viewMode === 'diagram' && (
           <div className="w-full h-full overflow-auto bg-white flex items-center justify-center p-8">
              {(!flowData || flowData.length === 0) ? (
                 <p className="text-gray-400">No flow data.</p>
              ) : (
                 <div ref={mermaidRef} id="mermaid-chart" className="w-full h-full flex justify-center items-start"></div>
              )}
           </div>
        )}

        {viewMode === 'list' && (
          <div className="w-full h-full overflow-y-auto p-4 md:p-6">
            {(!flowData || flowData.length === 0) ? (
              <div className="flex items-center justify-center h-full text-gray-400"><p>No flow data generated yet.</p></div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {flowData.map((journey, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                      <h4 className="font-bold text-gray-800">{journey.title}</h4>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{journey.steps?.length || 0} Steps</span>
                    </div>
                    <div className="p-5">
                      <ul className="space-y-0 relative">
                        <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-gray-100"></div>
                        {journey.steps?.map((step, stepIdx) => (
                          <li key={stepIdx} className="relative pl-10 pb-6 last:pb-0 group">
                            <div className="absolute left-0 top-1 w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-gray-200 group-hover:border-blue-400 group-hover:text-blue-600 text-gray-400 text-xs font-bold transition-colors z-10">{stepIdx + 1}</div>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-100 group-hover:border-blue-200 group-hover:bg-blue-50/30 transition-colors">{step.description}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-end pt-2 flex-shrink-0">
         <button onClick={() => onNext(model)} disabled={isLoading || !flowData || flowData.length === 0} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:translate-y-[-1px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
            {isLoading ? 'Processing...' : <><CheckCircle2 size={20} /> Confirm & Generate Screens</>}
         </button>
      </div>
    </div>
  );
};
