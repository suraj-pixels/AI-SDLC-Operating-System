
import React, { useState } from 'react';
import { AppStep, AppWorkspace, ProjectState } from '../types';
import { 
  CheckCircle2,
  Save,
  Check,
  Upload,
  Database,
  FlaskConical,
  Settings,
  LayoutDashboard,
  BrainCircuit,
  Compass,
  PenTool,
  Code2,
  TestTube2,
  Rocket,
  Wrench,
  Lock,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
  Server
} from 'lucide-react';
import { ContextInspector } from './ContextInspector';

interface LayoutProps {
  currentWorkspace: AppWorkspace;
  currentStep: AppStep; // Keep for context awareness
  projectState: ProjectState;
  onWorkspaceChange: (workspace: AppWorkspace) => void;
  children: React.ReactNode;
  onCopyState?: () => void;
  onImportState?: (jsonString: string) => void;
  onLoadDemo?: () => void;
  onOpenSettings: () => void;
}

// SDLC Navigation Structure
const NAVIGATION = [
  {
    category: 'Product Hub',
    items: [
      { id: AppWorkspace.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, description: 'Project Overview' }
    ]
  },
  {
    category: 'Product Engineering',
    items: [
      { id: AppWorkspace.STRATEGY, label: 'Strategy', icon: Compass, description: 'Requirements & PRD' },
      { id: AppWorkspace.AI_SYSTEM, label: 'AI Guidelines', icon: Bot, description: 'Context & Behavior' },
      { id: AppWorkspace.ARCHITECTURE, label: 'Architecture & IA', icon: BrainCircuit, description: 'Sitemap & User Flows' },
      { id: AppWorkspace.DATA_API, label: 'Data & Schema', icon: Server, description: 'Entities & API Spec' }, // NEW
      { id: AppWorkspace.DESIGN, label: 'Experience', icon: PenTool, description: 'UI/UX & System' },
    ]
  },
  {
    category: 'Engineering & Ops',
    items: [
      { id: AppWorkspace.IMPLEMENTATION, label: 'Implementation', icon: Code2, description: 'React & API Code', locked: false },
      { id: AppWorkspace.TESTING, label: 'Quality Assurance', icon: TestTube2, description: 'E2E & Unit Tests', locked: false },
      { id: AppWorkspace.DEPLOYMENT, label: 'Deployment', icon: Rocket, description: 'CI/CD & DevOps', locked: false },
      { id: AppWorkspace.MAINTENANCE, label: 'Maintenance', icon: Wrench, description: 'SRE & Observability', locked: false },
    ]
  }
];

export const Layout: React.FC<LayoutProps> = ({ 
  currentWorkspace,
  currentStep,
  projectState, 
  onWorkspaceChange, 
  children, 
  onCopyState, 
  onImportState,
  onLoadDemo,
  onOpenSettings
}) => {
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleCopy = () => {
    if (onCopyState) {
      onCopyState();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImportSubmit = () => {
    if (onImportState && importText.trim()) {
      onImportState(importText);
      setIsImporting(false);
      setImportText('');
    }
  };

  const getWorkspaceTitle = () => {
    const item = NAVIGATION.flatMap(n => n.items).find(i => i.id === currentWorkspace);
    return item?.label || 'Workspace';
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className={`bg-white border-r border-gray-200 flex-shrink-0 flex flex-col z-20 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className={`p-4 border-b border-gray-100 flex items-center ${isSidebarCollapsed ? 'flex-col gap-4 justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'flex-col' : ''}`}>
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
               P6
             </div>
             {!isSidebarCollapsed && (
                <div className="overflow-hidden whitespace-nowrap">
                    <h1 className="text-sm font-bold text-gray-900 leading-tight">
                      AI Product Engine
                    </h1>
                    <p className="text-[10px] text-gray-400 font-medium tracking-wide">SDLC OS v2.1</p>
                </div>
             )}
          </div>
          
          <button 
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
             className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
             title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
             {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-6 space-y-8 ${isSidebarCollapsed ? 'px-2' : 'px-4'} custom-scrollbar`}>
          {NAVIGATION.map((section, idx) => (
             <div key={idx} className="flex flex-col">
                {!isSidebarCollapsed ? (
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2 whitespace-nowrap overflow-hidden">
                      {section.category}
                    </h3>
                ) : (
                    <div className="h-px bg-gray-100 mx-2 mb-3"></div>
                )}
                
                <div className="space-y-1">
                   {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentWorkspace === item.id;
                      const isLocked = item.locked;

                      return (
                         <button
                           key={item.id}
                           onClick={() => !isLocked && onWorkspaceChange(item.id)}
                           disabled={isLocked}
                           title={isSidebarCollapsed ? item.label : undefined}
                           className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative ${
                              isActive 
                                ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm ring-1 ring-blue-100' 
                                : isLocked
                                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                           } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                         >
                            <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-blue-600' : isLocked ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            
                            {!isSidebarCollapsed && (
                                <>
                                    <div className="text-left flex-1 overflow-hidden whitespace-nowrap">
                                        <span className="block truncate">{item.label}</span>
                                        <span className="text-[10px] opacity-70 block font-normal leading-tight truncate">{item.description}</span>
                                    </div>
                                    {isLocked && <Lock size={12} className="text-gray-300 flex-shrink-0" />}
                                    {isActive && <ChevronRight size={14} className="text-blue-400 flex-shrink-0" />}
                                </>
                            )}
                         </button>
                      );
                   })}
                </div>
             </div>
          ))}

        </nav>

        <div className="p-4 border-t border-gray-100">
           <button 
             onClick={() => setIsContextOpen(!isContextOpen)}
             title={isSidebarCollapsed ? "Context Memory" : undefined}
             className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all border ${
               isContextOpen ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
             } ${isSidebarCollapsed ? 'justify-center' : ''}`}
           >
              <Database size={16} className={`flex-shrink-0 ${isContextOpen ? 'text-purple-600' : 'text-gray-400'}`} />
              {!isSidebarCollapsed && (
                  <div className="flex-1 text-left overflow-hidden whitespace-nowrap">
                    <span className="block font-semibold truncate">Adaptive Context</span>
                    <span className="text-[10px] opacity-70 truncate">State & Intelligence</span>
                  </div>
              )}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-white/50">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
             <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Workspace /</span>
             <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
               {getWorkspaceTitle()}
             </h2>
          </div>

          <div className="flex items-center gap-3">
             {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  className="flex items-center gap-2 text-xs font-medium transition-colors px-3 py-1.5 rounded-md border text-amber-600 hover:bg-amber-50 border-amber-200"
                  title="Fill with Demo Data for current workspace"
                >
                  <FlaskConical size={14} />
                  <span>Demo Data</span>
                </button>
             )}
             
             <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 text-xs font-medium transition-colors px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
                title="Project Settings"
              >
                <Settings size={14} />
                <span>Config</span>
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1"></div>

            {onImportState && (
              <button
                onClick={() => setIsImporting(true)}
                className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200"
              >
                <Upload size={14} />
                <span>Load</span>
              </button>
            )}
            {onCopyState && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Save size={14} />}
                <span>{copied ? 'Copied!' : 'Save State'}</span>
              </button>
            )}
          </div>
        </header>
        
        {/* Expanded Workspace Area */}
        <div className="flex-1 overflow-y-auto relative bg-slate-50">
          <div className="h-full w-full p-4 md:p-6">
            {children}
          </div>
        </div>
      </main>

      {/* Context Inspector Panel */}
      <ContextInspector 
        isOpen={isContextOpen} 
        onClose={() => setIsContextOpen(false)} 
        projectState={projectState}
        currentStep={currentStep}
        currentWorkspace={currentWorkspace}
      />

      {/* Import Modal */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-800">Load Project State</h3>
              <button onClick={() => setIsImporting(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <p className="text-sm text-gray-500 mb-2">Paste your saved JSON string below to resume your project.</p>
              <textarea 
                className="w-full flex-1 min-h-[200px] p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none text-gray-900 bg-white"
                placeholder='{"version":1,"step":"..."}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button 
                onClick={() => setIsImporting(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleImportSubmit}
                disabled={!importText.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
