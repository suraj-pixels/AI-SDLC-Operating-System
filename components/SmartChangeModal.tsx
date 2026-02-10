
import React, { useState, useEffect } from 'react';
import { ChangeProposal, ExecutionResult, ProjectModule, FlowJourney, DesignSystemState } from '../types';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ScanSearch,
  Wand2,
  X,
  MessageSquare,
  ArrowRight,
  GitGraph,
  Layout,
  Play
} from 'lucide-react';
import * as geminiService from '../services/geminiService';
import { ModelSelector, GEMINI_PRO } from './ModelSelector';

interface SmartChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRequest?: string; // If triggered by a specific delete button
  projectModules: ProjectModule[];
  projectFlows: FlowJourney[];
  designSystem: DesignSystemState;
  onExecute: (result: ExecutionResult) => void;
}

export const SmartChangeModal: React.FC<SmartChangeModalProps> = ({
  isOpen,
  onClose,
  initialRequest = '',
  projectModules,
  projectFlows,
  designSystem,
  onExecute
}) => {
  const [request, setRequest] = useState(initialRequest);
  const [model, setModel] = useState(GEMINI_PRO);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [proposal, setProposal] = useState<ChangeProposal | null>(null);
  const [refinementInput, setRefinementInput] = useState('');

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
        setRequest(initialRequest);
        setProposal(null);
        setRefinementInput('');
        setIsAnalyzing(false);
        setIsExecuting(false);
    }
  }, [isOpen, initialRequest]);

  const handleAnalyze = async (refineText?: string) => {
    if (!request.trim() && !refineText) return;
    
    setIsAnalyzing(true);
    try {
        const dsSummary = geminiService.formatDesignSystemToContext(designSystem);
        
        // If refining, combine original request with new instruction
        const prompt = refineText 
            ? `${request} (Update: ${refineText})` 
            : request;

        const newProposal = await geminiService.proposeSmartChange(
            prompt,
            projectModules,
            projectFlows,
            dsSummary,
            model,
            proposal || undefined
        );
        
        setProposal(newProposal);
        if (refineText) {
            setRequest(prompt); // Update main request to reflect current state
            setRefinementInput('');
        }
    } catch (e) {
        console.error(e);
        alert("Analysis failed. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleConfirmExecute = async () => {
      if (!proposal) return;
      setIsExecuting(true);
      try {
          const result = await geminiService.executeSmartChange(
              proposal,
              projectModules,
              projectFlows,
              model
          );
          onExecute(result);
          onClose();
      } catch (e) {
          console.error(e);
          alert("Execution failed.");
      } finally {
          setIsExecuting(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
         
         {/* Header */}
         <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2 text-gray-800">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                    <ScanSearch size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Smart Change Negotiator</h3>
                    <p className="text-xs text-gray-500">Holistic Impact Analysis & Execution</p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full">
               <X size={20} />
            </button>
         </div>

         {/* Content */}
         <div className="flex-1 overflow-y-auto p-6 space-y-6">
             
             {/* Initial Request Input (Only if no proposal yet) */}
             {!proposal && (
                 <div className="space-y-4">
                     <label className="block text-sm font-bold text-gray-700">What would you like to change?</label>
                     <textarea 
                        value={request}
                        onChange={e => setRequest(e.target.value)}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-32 resize-none bg-gray-50 focus:bg-white transition-colors"
                        placeholder="e.g. 'Delete the Settings module', 'Rename Profile screen to Account', 'Add a forgotten password flow'..."
                        autoFocus
                     />
                     
                     <div className="flex justify-end gap-3 items-center">
                         <ModelSelector value={model} onChange={setModel} disabled={isAnalyzing} />
                         <button 
                            onClick={() => handleAnalyze()}
                            disabled={!request.trim() || isAnalyzing}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md flex items-center gap-2 disabled:opacity-50"
                         >
                            {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                            Analyze Impact
                         </button>
                     </div>
                 </div>
             )}

             {/* Proposal View */}
             {proposal && (
                 <div className="space-y-6 animate-in slide-in-from-bottom-4">
                     
                     {/* Impact Score */}
                     <div className={`p-4 rounded-xl border-l-4 shadow-sm ${
                         proposal.impactAnalysis.severity === 'high' ? 'bg-red-50 border-red-500' :
                         proposal.impactAnalysis.severity === 'medium' ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'
                     }`}>
                         <div className="flex items-center gap-2 mb-2">
                             <AlertTriangle size={18} className={
                                 proposal.impactAnalysis.severity === 'high' ? 'text-red-600' :
                                 proposal.impactAnalysis.severity === 'medium' ? 'text-orange-600' : 'text-green-600'
                             } />
                             <h4 className="font-bold text-gray-800 text-sm uppercase">
                                 Impact: {proposal.impactAnalysis.severity} Severity
                             </h4>
                         </div>
                         <p className="text-sm text-gray-700 font-medium">{proposal.impactAnalysis.summary}</p>
                         
                         {proposal.impactAnalysis.brokenLinks.length > 0 && (
                             <div className="mt-3 bg-white/50 p-2 rounded text-xs text-red-700">
                                 <strong>Breaking Changes:</strong>
                                 <ul className="list-disc pl-4 mt-1">
                                     {proposal.impactAnalysis.brokenLinks.map((item, i) => <li key={i}>{item}</li>)}
                                 </ul>
                             </div>
                         )}
                     </div>

                     {/* Proposed Actions List */}
                     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                         <div className="bg-gray-50 p-3 border-b border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                             <Layout size={14} /> Proposed Execution Plan
                         </div>
                         <div className="divide-y divide-gray-100">
                             {proposal.proposedActions.map((action, idx) => (
                                 <div key={idx} className="p-3 flex items-start gap-3">
                                     <div className={`mt-0.5 p-1.5 rounded-full ${
                                         action.type === 'delete' ? 'bg-red-100 text-red-600' :
                                         action.type === 'create' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                     }`}>
                                         {action.type === 'delete' ? <Trash2 size={12} /> : action.type === 'create' ? <Wand2 size={12} /> : <RefreshCw size={12} />}
                                     </div>
                                     <div>
                                         <div className="text-sm font-bold text-gray-800">
                                             <span className="uppercase text-xs text-gray-400 mr-2">{action.type}</span>
                                             {action.targetName}
                                         </div>
                                         <p className="text-xs text-gray-500">{action.description}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Iteration / Refinement Input */}
                     <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                         <label className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase mb-2">
                             <MessageSquare size={14} /> Negotiate Plan
                         </label>
                         <div className="flex gap-2">
                             <input 
                                value={refinementInput}
                                onChange={e => setRefinementInput(e.target.value)}
                                className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                placeholder="e.g. 'Wait, don't delete X, just rename it instead.'"
                                onKeyDown={e => e.key === 'Enter' && handleAnalyze(refinementInput)}
                             />
                             <button 
                                onClick={() => handleAnalyze(refinementInput)}
                                disabled={!refinementInput.trim() || isAnalyzing}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
                             >
                                {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : 'Update Plan'}
                             </button>
                         </div>
                     </div>

                     {/* Final Actions */}
                     <div className="flex justify-end gap-3 pt-2">
                         <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                         <button 
                            onClick={handleConfirmExecute}
                            disabled={isExecuting}
                            className="px-6 py-2 bg-gray-900 hover:bg-black text-white rounded-lg font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50"
                         >
                            {isExecuting ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                            Confirm Execution
                         </button>
                     </div>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};
