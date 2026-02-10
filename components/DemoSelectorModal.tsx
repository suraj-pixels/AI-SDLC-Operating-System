
import React from 'react';
import { DemoScenario } from '../demoData';
import { Stethoscope, ArrowRight, X, Building2 } from 'lucide-react';

interface DemoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: Record<string, DemoScenario>;
  onSelect: (key: string) => void;
}

export const DemoSelectorModal: React.FC<DemoSelectorModalProps> = ({ 
  isOpen, 
  onClose, 
  scenarios, 
  onSelect 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-slate-50">
          <div>
             <h2 className="text-xl font-bold text-gray-900">Load Demo Data</h2>
             <p className="text-sm text-gray-500 mt-1">Choose a pre-configured scenario to explore the platform's capabilities.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
             <X size={20} />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="p-8 grid grid-cols-1 gap-6 bg-gray-50/50">
           
           {/* Scenario 2: Healthcare */}
           <div 
             onClick={() => onSelect('health')}
             className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:ring-4 hover:ring-teal-500/20 hover:-translate-y-1 transition-all group relative overflow-hidden shadow-sm"
           >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-3xl rounded-full"></div>
              
              <div className="relative z-10">
                 <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                    <Stethoscope size={24} />
                 </div>
                 <h3 className="text-gray-900 font-bold text-lg mb-2">Healthcare Platform</h3>
                 <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    "MediFlow": A clean, compliant pharmacy and patient care system. Showcases light mode, accessible UI, and professional clinical design. Includes transcripts and technical specs.
                 </p>
                 <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wide group-hover:gap-3 transition-all">
                    Load Scenario <ArrowRight size={14} />
                 </div>
              </div>
           </div>

        </div>

        <div className="p-4 bg-white border-t border-gray-100 text-center text-xs text-gray-400">
           Loading a demo will overwrite your current project state.
        </div>
      </div>
    </div>
  );
};
