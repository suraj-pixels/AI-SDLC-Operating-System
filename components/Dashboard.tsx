
import React from 'react';
import { ProjectState, AppWorkspace } from '../types';
import { 
  Activity, 
  Target, 
  BrainCircuit, 
  PenTool, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Sparkles,
  Layers
} from 'lucide-react';

interface DashboardProps {
  projectState: ProjectState;
  onNavigate: (workspace: AppWorkspace) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projectState, onNavigate }) => {
  const sourcesCount = projectState.requirementSources.length;
  const prdCount = projectState.prdSections.length;
  const flowCount = projectState.flowData.length;
  const modulesCount = projectState.modules.length;
  const totalScreens = projectState.modules.reduce((acc, m) => acc + m.screens.length, 0);
  const designedScreens = projectState.modules.reduce((acc, m) => acc + m.screens.filter(s => s.status === 'designed').length, 0);
  
  // Simple completion calculation
  const strategyProgress = prdCount > 0 ? 100 : sourcesCount > 0 ? 50 : 0;
  const archProgress = flowCount > 0 && modulesCount > 0 ? 100 : flowCount > 0 ? 50 : 0;
  const designProgress = totalScreens > 0 ? Math.round((designedScreens / totalScreens) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
         
         <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Welcome to {projectState.config.projectName}</h1>
            <p className="text-slate-300 max-w-xl">
               Your AI Product Squad is ready. You have {totalScreens} screens planned with {designedScreens} designed.
               Continue refining your strategy or jump into architecture.
            </p>
            
            <div className="flex gap-4 mt-6">
               <button 
                  onClick={() => onNavigate(AppWorkspace.STRATEGY)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2"
               >
                  <Target size={16} /> Open Strategy
               </button>
               <button 
                  onClick={() => onNavigate(AppWorkspace.DESIGN)}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
               >
                  <PenTool size={16} /> View Designs
               </button>
            </div>
         </div>
      </div>

      {/* Project Pulse / Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Card 1: Strategy */}
         <div 
            onClick={() => onNavigate(AppWorkspace.STRATEGY)}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
         >
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-orange-50 rounded-lg text-orange-600 group-hover:scale-110 transition-transform">
                  <Target size={24} />
               </div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phase 1</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Strategy & Scope</h3>
            <p className="text-sm text-gray-500 mb-4 h-10">
               {sourcesCount === 0 ? 'No requirements yet.' : `${sourcesCount} sources analyzed. PRD has ${prdCount} sections.`}
            </p>
            
            <div className="flex items-center gap-2">
               <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${strategyProgress}%` }}></div>
               </div>
               <span className="text-xs font-bold text-gray-600">{strategyProgress}%</span>
            </div>
         </div>

         {/* Card 2: Architecture */}
         <div 
            onClick={() => onNavigate(AppWorkspace.ARCHITECTURE)}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
         >
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                  <BrainCircuit size={24} />
               </div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phase 2</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Architecture</h3>
            <p className="text-sm text-gray-500 mb-4 h-10">
               {modulesCount === 0 ? 'Structure pending.' : `${modulesCount} modules defined containing ${totalScreens} screens.`}
            </p>
            
            <div className="flex items-center gap-2">
               <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${archProgress}%` }}></div>
               </div>
               <span className="text-xs font-bold text-gray-600">{archProgress}%</span>
            </div>
         </div>

         {/* Card 3: Design */}
         <div 
            onClick={() => onNavigate(AppWorkspace.DESIGN)}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
         >
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-purple-50 rounded-lg text-purple-600 group-hover:scale-110 transition-transform">
                  <PenTool size={24} />
               </div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phase 3</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Experience Design</h3>
            <p className="text-sm text-gray-500 mb-4 h-10">
               {designProgress === 0 ? 'Not started.' : `${designedScreens} of ${totalScreens} screens generated.`}
            </p>
            
            <div className="flex items-center gap-2">
               <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: `${designProgress}%` }}></div>
               </div>
               <span className="text-xs font-bold text-gray-600">{designProgress}%</span>
            </div>
         </div>
      </div>

      {/* Recent Activity / Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-gray-400" /> Recent Actions
             </h3>
             <div className="space-y-4">
                {/* Mock timeline for now */}
                {projectState.modules.length > 0 ? (
                    <div className="flex gap-4">
                       <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                          <div className="w-px h-full bg-gray-100 my-1"></div>
                       </div>
                       <div className="pb-4">
                          <p className="text-sm font-bold text-gray-800">Architecture Defined</p>
                          <p className="text-xs text-gray-500">{projectState.modules.length} modules created.</p>
                       </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 italic">No major architecture events yet.</p>
                )}
                
                {projectState.prdSections.length > 0 && (
                    <div className="flex gap-4">
                       <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                          <div className="w-px h-full bg-gray-100 my-1"></div>
                       </div>
                       <div className="pb-4">
                          <p className="text-sm font-bold text-gray-800">Strategy Defined</p>
                          <p className="text-xs text-gray-500">PRD synthesized with {projectState.prdSections.length} sections.</p>
                       </div>
                    </div>
                )}
             </div>
         </div>

         <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-6">
             <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Sparkles size={18} /> Recommended Next Step
             </h3>
             
             {strategyProgress < 100 ? (
                 <div className="space-y-4">
                    <p className="text-sm text-blue-800">Your strategy is incomplete. Start by adding requirements or running an analysis.</p>
                    <button onClick={() => onNavigate(AppWorkspace.STRATEGY)} className="w-full py-2 bg-white border border-blue-200 text-blue-700 font-bold rounded shadow-sm text-sm hover:bg-blue-50">
                       Go to Strategy
                    </button>
                 </div>
             ) : archProgress < 100 ? (
                 <div className="space-y-4">
                    <p className="text-sm text-blue-800">You have a PRD but no architecture. Let's build the flows.</p>
                    <button onClick={() => onNavigate(AppWorkspace.ARCHITECTURE)} className="w-full py-2 bg-white border border-blue-200 text-blue-700 font-bold rounded shadow-sm text-sm hover:bg-blue-50">
                       Go to Architecture
                    </button>
                 </div>
             ) : (
                 <div className="space-y-4">
                    <p className="text-sm text-blue-800">Architecture is set. Time to design the screens.</p>
                    <button onClick={() => onNavigate(AppWorkspace.DESIGN)} className="w-full py-2 bg-white border border-blue-200 text-blue-700 font-bold rounded shadow-sm text-sm hover:bg-blue-50">
                       Go to Design Studio
                    </button>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};
