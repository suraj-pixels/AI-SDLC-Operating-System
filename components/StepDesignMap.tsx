
import React from 'react';
import { ProjectModule, ScreenItem } from '../types';
import { LayoutTemplate, ChevronRight, CheckCircle2, Circle, ArrowRight, BrainCircuit, GripVertical } from 'lucide-react';

interface StepDesignMapProps {
  modules: ProjectModule[];
  onSelectScreen: (screenId: string) => void;
  onGoToArchitecture: () => void;
}

export const StepDesignMap: React.FC<StepDesignMapProps> = ({ 
  modules, 
  onSelectScreen,
  onGoToArchitecture
}) => {
  const hasModules = modules.length > 0;

  if (!hasModules) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="relative z-10 text-center max-w-md p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-xl">
           <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutTemplate size={32} />
           </div>
           <h2 className="text-xl font-bold text-gray-900 mb-2">Design Map Empty</h2>
           <p className="text-gray-500 mb-6 text-sm">
             Your Information Architecture (IA) hasn't been defined yet. You need to generate modules and screens before designing them.
           </p>
           <button 
             onClick={onGoToArchitecture}
             className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
           >
             <BrainCircuit size={18} />
             Go to Architecture & IA
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-100 relative overflow-y-auto flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:24px_24px] z-0 h-full"></div>

      {/* Header overlay */}
      <div className="sticky top-0 z-30 px-8 py-4 pointer-events-none">
        <div className="inline-flex bg-white/90 backdrop-blur border border-gray-200 px-4 py-2 rounded-xl shadow-sm pointer-events-auto">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <LayoutTemplate size={16} className="text-purple-600"/> 
                Module Grid
            </h3>
            <div className="w-px h-4 bg-gray-300 mx-3"></div>
            <p className="text-xs text-gray-500">Select a screen card to open Design Studio</p>
        </div>
      </div>

      {/* Grid Layout for Modules */}
      <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-8 auto-rows-max relative z-10 pb-24">
        {modules.map((module) => (
            <div key={module.id} className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                
                {/* Module Header */}
                <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-gray-800 text-lg">{module.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{module.description}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                        {module.screens.length} Screens
                    </div>
                </div>

                {/* Screens Grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/30 flex-1">
                    {module.screens.length === 0 ? (
                        <div className="col-span-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400">
                            <p className="text-xs font-medium">No screens defined</p>
                        </div>
                    ) : (
                        module.screens.map((screen) => {
                            const isDesigned = screen.status === 'designed';
                            const hasPrompt = screen.status === 'prompt-ready' || screen.status === 'designed';

                            return (
                                <div 
                                    key={screen.id}
                                    onClick={() => onSelectScreen(screen.id)}
                                    className={`relative bg-white p-4 rounded-xl border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-md group flex flex-col justify-between min-h-[160px] ${
                                        isDesigned ? 'border-green-200 shadow-sm ring-1 ring-green-100' : 
                                        hasPrompt ? 'border-blue-200 shadow-sm' : 'border-gray-200 shadow-sm'
                                    }`}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight pr-1">{screen.name}</h5>
                                            {isDesigned ? (
                                                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                            ) : hasPrompt ? (
                                                <Circle size={16} className="text-blue-400 shrink-0" />
                                            ) : (
                                                <Circle size={16} className="text-gray-200 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-500 line-clamp-3 leading-relaxed">{screen.description}</p>
                                    </div>
                                    
                                    <div className="pt-3 border-t border-gray-50 mt-2 flex justify-between items-center">
                                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                                            isDesigned ? 'bg-green-50 text-green-700' :
                                            hasPrompt ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {isDesigned ? 'Done' : hasPrompt ? 'Ready' : 'Pending'}
                                        </span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                                            <ArrowRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
