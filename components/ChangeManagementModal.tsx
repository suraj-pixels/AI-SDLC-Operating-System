
import React, { useState } from 'react';
import { ChangeImpact, ScreenItem, FlowJourney } from '../types';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight, 
  GitGraph, 
  Layout, 
  X,
  CheckCircle2,
  ScanSearch,
  Wand2
} from 'lucide-react';
import * as geminiService from '../services/geminiService';

interface ChangeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetScreen: ScreenItem;
  allScreens: ScreenItem[];
  currentFlows: FlowJourney[];
  onConfirmChange: (
    action: 'delete' | 'replace', 
    replaceWith: string, 
    healedData: { updatedFlows: FlowJourney[], updatedScreens: ScreenItem[] }
  ) => void;
}

type Mode = 'select' | 'analyzing' | 'review' | 'healing';

export const ChangeManagementModal: React.FC<ChangeManagementModalProps> = ({
  isOpen,
  onClose,
  targetScreen,
  allScreens,
  currentFlows,
  onConfirmChange
}) => {
  const [mode, setMode] = useState<Mode>('select');
  const [action, setAction] = useState<'delete' | 'replace'>('delete');
  const [replaceText, setReplaceText] = useState('');
  const [impact, setImpact] = useState<ChangeImpact | null>(null);
  
  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    setMode('analyzing');
    try {
      const result = await geminiService.analyzeChangeImpact(
        targetScreen,
        action,
        replaceText,
        allScreens,
        currentFlows
      );
      setImpact(result);
      setMode('review');
    } catch (e) {
      console.error(e);
      alert("Analysis failed. Please try again.");
      setMode('select');
    }
  };

  const handleConfirm = async () => {
    setMode('healing');
    try {
      const healedData = await geminiService.applyChangeAndHeal(
        targetScreen,
        action,
        replaceText,
        allScreens,
        currentFlows
      );
      onConfirmChange(action, replaceText, healedData);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to apply changes.");
      setMode('review');
    }
  };

  const reset = () => {
    setMode('select');
    setImpact(null);
    setReplaceText('');
    setAction('delete');
  };

  const renderContent = () => {
    switch(mode) {
      case 'select':
        return (
          <div className="space-y-6">
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 mb-1">
                   <Layout size={16} className="text-blue-500" />
                   Target: {targetScreen.name}
                </h4>
                <p className="text-xs text-gray-500 line-clamp-2">{targetScreen.description}</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setAction('delete')}
                  className={`p-4 rounded-xl border-2 transition-all text-left group ${action === 'delete' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}
                >
                   <div className={`p-2 rounded-full w-fit mb-3 ${action === 'delete' ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400 group-hover:text-red-500'}`}>
                      <Trash2 size={20} />
                   </div>
                   <h5 className="font-bold text-gray-800">Delete Screen</h5>
                   <p className="text-xs text-gray-500 mt-1">Remove completely. Adjacent steps will be bridged if possible.</p>
                </button>

                <button 
                  onClick={() => setAction('replace')}
                  className={`p-4 rounded-xl border-2 transition-all text-left group ${action === 'replace' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                >
                   <div className={`p-2 rounded-full w-fit mb-3 ${action === 'replace' ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-400 group-hover:text-blue-500'}`}>
                      <RefreshCw size={20} />
                   </div>
                   <h5 className="font-bold text-gray-800">Swap / Replace</h5>
                   <p className="text-xs text-gray-500 mt-1">Change this step to something else. User flows will be updated.</p>
                </button>
             </div>

             {action === 'replace' && (
                <div className="animate-in slide-in-from-top-2">
                   <label className="text-sm font-bold text-gray-700 mb-2 block">What should replace this screen?</label>
                   <textarea 
                      className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24 resize-none text-gray-900 bg-white"
                      placeholder="e.g., Replace 'Login' with 'Phone OTP Authentication'. Maintain the same flow afterwards."
                      value={replaceText}
                      onChange={e => setReplaceText(e.target.value)}
                      autoFocus
                   />
                </div>
             )}

             <div className="flex justify-end pt-4 border-t border-gray-100">
                <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg mr-2 text-sm font-medium">Cancel</button>
                <button 
                   onClick={handleRunAnalysis}
                   disabled={action === 'replace' && !replaceText}
                   className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                >
                   <ScanSearch size={16} />
                   Analyze Impact
                </button>
             </div>
          </div>
        );

      case 'analyzing':
      case 'healing':
        return (
          <div className="py-12 flex flex-col items-center justify-center text-center">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Wand2 className="text-blue-600 animate-pulse" size={24} />
                </div>
             </div>
             <h4 className="mt-6 font-bold text-gray-800 text-lg">
                {mode === 'analyzing' ? 'Analyzing Dependencies...' : 'Healing User Flows...'}
             </h4>
             <p className="text-gray-500 text-sm max-w-xs mt-2">
                {mode === 'analyzing' ? 'Checking for broken links and flow logic.' : 'Rewriting logic and updating screen descriptions.'}
             </p>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-5">
             <div className={`p-4 rounded-lg border-l-4 ${
                impact?.severity === 'high' ? 'bg-red-50 border-red-500' :
                impact?.severity === 'medium' ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'
             }`}>
                <div className="flex items-center gap-2 mb-2">
                   <AlertTriangle size={16} className={
                      impact?.severity === 'high' ? 'text-red-600' :
                      impact?.severity === 'medium' ? 'text-orange-600' : 'text-green-600'
                   } />
                   <h4 className="font-bold text-gray-800 text-sm uppercase">Impact Analysis: {impact?.severity} Severity</h4>
                </div>
                <p className="text-sm text-gray-700">{impact?.impactSummary}</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                   <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <GitGraph size={14} /> Affected Flows
                   </h5>
                   {impact?.affectedFlows.length === 0 ? (
                      <span className="text-gray-400 text-xs italic">None detected</span>
                   ) : (
                      <ul className="text-sm space-y-1">
                         {impact?.affectedFlows.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-gray-700">
                               <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span> {f}
                            </li>
                         ))}
                      </ul>
                   )}
                </div>

                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                   <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Layout size={14} /> Related Screens
                   </h5>
                   {impact?.adjacentScreens.length === 0 ? (
                      <span className="text-gray-400 text-xs italic">No other screens affected</span>
                   ) : (
                      <ul className="text-sm space-y-1">
                         {impact?.adjacentScreens.map((s, i) => (
                            <li key={i} className="flex items-center gap-2 text-gray-700">
                               <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> {s}
                            </li>
                         ))}
                      </ul>
                   )}
                </div>
             </div>
             
             <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-800">
                   Back to Selection
                </button>
                <div className="flex gap-2">
                   <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                   <button 
                      onClick={handleConfirm}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm flex items-center gap-2 shadow-sm"
                   >
                      <CheckCircle2 size={16} />
                      Confirm & Heal
                   </button>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
         {/* Header */}
         <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-lg">Change Management</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full">
               <X size={20} />
            </button>
         </div>
         
         {/* Content */}
         <div className="p-6 overflow-y-auto">
            {renderContent()}
         </div>
      </div>
    </div>
  );
};