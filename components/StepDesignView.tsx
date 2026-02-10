
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScreenItem, DesignVersion, DesignChangePlan, ProjectConfig, DesignSystemState, ProjectModule, DesignAnalysisResult, AISystemState, FlowJourney, UserPersona, UXAudit } from '../types';
import { 
  Code, 
  Sparkles, 
  Monitor, 
  Smartphone, 
  Tablet, 
  History, 
  Send, 
  CheckCircle2, 
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  ChevronDown,
  Layers,
  MousePointer2,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize, 
  Play,
  Grid,
  Layout,
  Focus,
  Settings2,
  Atom,
  Palette,
  Wand2,
  Type,
  BoxSelect,
  PaintBucket,
  Image as ImageIcon,
  MoreHorizontal,
  Download,
  Share2,
  Trash,
  Globe,
  Plus,
  Edit,
  UserCheck,
  AlertTriangle,
  User,
  ThumbsUp,
  ThumbsDown,
  MousePointerClick
} from 'lucide-react';
import * as geminiService from '../services/geminiService';
import { ModelSelector, GEMINI_FLASH, GEMINI_PRO } from './ModelSelector';

interface DesignWorkspaceProps {
  screen: ScreenItem;
  allModules: ProjectModule[];
  flowData: FlowJourney[]; 
  config: ProjectConfig;
  designSystem: DesignSystemState;
  aiSystem?: AISystemState; 
  userPersonas: UserPersona[]; // Added prop
  onBack: () => void;
  onUpdateScreen: (screen: ScreenItem) => void;
  onSwitchScreen: (screenId: string) => void;
  onDesignAction: (result: DesignAnalysisResult) => void; 
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

// Quick Actions Configuration
const QUICK_ACTIONS = [
    { label: 'Dark Mode', prompt: 'Convert this design to dark mode using slate-900 backgrounds and light text.' },
    { label: 'Glassmorphism', prompt: 'Apply glassmorphism effects (backdrop-blur, white/10 backgrounds) to cards and sidebars.' },
    { label: 'Rounder', prompt: 'Increase border radius of all buttons and cards to rounded-2xl or rounded-3xl.' },
    { label: 'High Contrast', prompt: 'Increase contrast for accessibility. Make text darker and backgrounds lighter.' },
    { label: 'Flat Design', prompt: 'Remove all shadows and gradients. Use solid borders and colors.' },
];

export const StepDesignView: React.FC<DesignWorkspaceProps> = ({ 
  screen, 
  allModules,
  flowData,
  config, 
  designSystem,
  aiSystem,
  userPersonas, // New
  onBack, 
  onUpdateScreen,
  onSwitchScreen,
  onDesignAction
}) => {
  const [model, setModel] = useState(GEMINI_FLASH);
  const [viewMode, setViewMode] = useState<'canvas' | 'focus'>('focus');
  
  // Canvas State
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Tool: 'hand' (Pan), 'select' (AI Edit), 'interact' (Play/Use)
  const [tool, setTool] = useState<'select' | 'hand' | 'interact'>('hand');
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Viewport State
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop' | 'custom'>('mobile');
  const [customSize, setCustomSize] = useState({ w: 1440, h: 900 });
  
  // Panels State
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'ai' | 'code' | 'ux'>('ai'); // Added 'ux'
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);

  // Data State
  const [versions, setVersions] = useState<DesignVersion[]>(screen.history || []);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState(screen.designCode || '');
  const [copied, setCopied] = useState(false);

  // AI & Selection State
  const [chatInput, setChatInput] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null); // base64
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<DesignChangePlan | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [analysisResult, setAnalysisResult] = useState<DesignAnalysisResult | null>(null);
  
  // New: Selection State
  const [selectedElement, setSelectedElement] = useState<{ tagName: string, html: string, path: string } | null>(null);

  // New: Audit State
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(userPersonas[0]?.id || '');
  const [auditResult, setAuditResult] = useState<UXAudit | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // --- Helpers for Dimensions ---
  const getFrameDimensions = (v: typeof viewport) => {
      switch(v) {
          case 'mobile': return { w: 375, h: 812, label: 'iPhone X' };
          case 'tablet': return { w: 768, h: 1024, label: 'iPad Mini' };
          case 'desktop': return { w: 1280, h: 800, label: 'Desktop' };
          case 'custom': return { w: customSize.w, h: customSize.h, label: 'Custom' };
      }
  };
  const frame = getFrameDimensions(viewport);

  // --- Canvas Logic ---

  const handleFitToScreen = useCallback(() => {
    if (canvasRef.current) {
        const { width: containerW, height: containerH } = canvasRef.current.getBoundingClientRect();
        const currentFrame = getFrameDimensions(viewport);
        const paddingX = 80; 
        const paddingY = 140;
        
        const availableW = containerW - paddingX;
        const availableH = containerH - paddingY;

        const scaleX = availableW / currentFrame.w;
        const scaleY = availableH / currentFrame.h;

        let newScale = Math.min(scaleX, scaleY);
        if (newScale > 1.2) newScale = 1;

        setTransform({
            x: containerW / 2,
            y: (containerH / 2) + 20,
            scale: newScale
        });
    }
  }, [viewport, customSize]);

  // --- Action Handlers (Edit Modes) ---

  const handleGlobalEdit = useCallback(() => {
    setTool('hand');
    setSelectedElement(null);
    setRightPanelOpen(true);
    setRightPanelTab('ai');
    setChatInput(''); 
    setIsEditMenuOpen(false);
    setTimeout(() => chatInputRef.current?.focus(), 100);
  }, []);

  const handleSectionEdit = useCallback(() => {
    setTool('select');
    setRightPanelOpen(true);
    setRightPanelTab('ai');
    setIsEditMenuOpen(false);
  }, []);

  const handleManualEdit = useCallback(() => {
    setRightPanelOpen(true);
    setRightPanelTab('code');
    setIsEditMenuOpen(false);
  }, []);

  const handleAddSection = useCallback(() => {
    setTool('hand');
    setSelectedElement(null);
    setRightPanelOpen(true);
    setRightPanelTab('ai');
    setChatInput('Add a new section: ');
    setIsEditMenuOpen(false);
    setTimeout(() => chatInputRef.current?.focus(), 100);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'g': e.preventDefault(); handleGlobalEdit(); break;
          case 's': e.preventDefault(); handleSectionEdit(); break;
          case 'm': e.preventDefault(); handleManualEdit(); break;
          case 'a': e.preventDefault(); handleAddSection(); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGlobalEdit, handleSectionEdit, handleManualEdit, handleAddSection]);

  // Initialize & Listeners
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'ELEMENT_CLICK') {
            setSelectedElement({
                tagName: event.data.tagName,
                html: event.data.html,
                path: event.data.path
            });
            // Open AI panel if closed
            if (!rightPanelOpen) setRightPanelOpen(true);
            setRightPanelTab('ai');
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [rightPanelOpen]);

  useEffect(() => {
    const currentHistory = screen.history || [];
    setVersions(currentHistory);
    
    if (currentHistory.length === 0 && screen.designCode) {
        const initialVersion: DesignVersion = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            code: screen.designCode,
            prompt: "Initial Generation",
            aiComment: "First draft created."
        };
        setVersions([initialVersion]);
        setActiveVersionId(initialVersion.id);
        setActiveCode(screen.designCode);
        onUpdateScreen({ ...screen, history: [initialVersion] });
    } else if (currentHistory.length > 0) {
        const latest = currentHistory[currentHistory.length - 1];
        setActiveVersionId(latest.id);
        setActiveCode(latest.code);
    } else {
        setActiveCode(screen.designCode || '');
        setActiveVersionId(null);
    }
    
    setPendingPlan(null);
    setChatInput('');
    setReferenceImage(null);
    setAnalysisResult(null);
    setSelectedElement(null);
    
    setTimeout(handleFitToScreen, 100);

  }, [screen.id]);

  useEffect(() => { handleFitToScreen(); }, [viewport, viewMode, handleFitToScreen]);

  useEffect(() => {
    if (activeVersionId) {
        const v = versions.find(v => v.id === activeVersionId);
        if (v) {
            setActiveCode(v.code);
            setAuditResult(v.uxAudit || null);
            setSelectedElement(null); // Clear selection on version change
        }
        setAnalysisResult(null);
    }
  }, [activeVersionId]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [pendingPlan, isProcessing, rightPanelTab, analysisResult]);


  const handleWheel = (e: React.WheelEvent) => {
      if (viewMode === 'focus') return;
      if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const zoomSensitivity = 0.001;
          const newScale = Math.min(Math.max(0.1, transform.scale - e.deltaY * zoomSensitivity), 5);
          setTransform(prev => ({ ...prev, scale: newScale }));
      } else {
          setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (viewMode === 'focus') return; 
      if (e.button === 1 || tool === 'hand' || e.shiftKey) {
          setIsDragging(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          e.preventDefault();
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging && viewMode === 'canvas') {
          const dx = e.clientX - lastMousePos.x;
          const dy = e.clientY - lastMousePos.y;
          setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          setLastMousePos({ x: e.clientX, y: e.clientY });
      }
  };

  const handleMouseUp = () => setIsDragging(false);

  // --- Handlers ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setReferenceImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleExportHTML = () => {
      const blob = new Blob([wrapCodeWithTailwind(activeCode, false)], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${screen.name.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsMoreMenuOpen(false);
  };

  // --- AI Logic ---

  // Compile active guidelines with FLOW CONTEXT
  const getGuidelinesContext = () => {
      const flowContext = geminiService.buildFlowContext(screen.id, allModules, flowData);
      
      let systemGuides = '';
      if (aiSystem) {
          systemGuides = aiSystem.guidelines
            .filter(g => g.isActive)
            .map(g => `${g.category.toUpperCase()}: ${g.title}\n${g.content}`)
            .join('\n\n');
      }

      return `FLOW CONTEXT:\n${flowContext}\n\nSYSTEM GUIDELINES:\n${systemGuides}`;
  };

  const handlePlanChanges = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || chatInput;
    if (!promptToUse.trim() && !referenceImage) return;
    
    setIsProcessing(true);
    setPendingPlan(null);
    setAnalysisResult(null);

    try {
        // If element is selected, prepend context to prompt for better planning
        let enrichedPrompt = promptToUse;
        if (selectedElement) {
            enrichedPrompt = `User selected element <${selectedElement.tagName}>: "${promptToUse}"`;
        }
        if (referenceImage) {
            enrichedPrompt += ` (User attached a reference image to guide this change)`;
        }

        const plan = await geminiService.planDesignModifications(
            activeCode,
            enrichedPrompt,
            screen.name,
            getGuidelinesContext(),
            model
        );
        setPendingPlan(plan);
    } catch (e) {
        alert("Failed to plan changes. Try again.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleExecuteChanges = async () => {
    if (!pendingPlan) return;
    setIsProcessing(true);

    try {
        const dsContext = geminiService.formatDesignSystemToContext(designSystem);
        
        // Strip base64 header if present for API
        let cleanImage = undefined;
        if (referenceImage) {
            cleanImage = referenceImage.split(',')[1];
        }

        const result = await geminiService.executeDesignModifications(
            activeCode,
            chatInput || pendingPlan.summary,
            screen.name,
            pendingPlan,
            dsContext,
            getGuidelinesContext(),
            model,
            selectedElement?.html, // Pass selection context
            cleanImage // Pass image
        );

        const analysis = await geminiService.analyzeDesignAdaptation(result.code, designSystem);
        onDesignAction(analysis);
        setAnalysisResult(analysis);

        const newVersion: DesignVersion = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            code: result.code,
            prompt: chatInput || pendingPlan.summary,
            aiComment: result.summary,
            dsSyncReport: {
                addedComponents: analysis.newComponents.map(c => c.name),
                addedColors: analysis.newColors.map(c => c.name)
            }
        };

        const newHistory = [...versions, newVersion];
        setVersions(newHistory);
        setActiveVersionId(newVersion.id);
        setActiveCode(result.code);
        setPendingPlan(null);
        setChatInput('');
        setReferenceImage(null);
        setSelectedElement(null); // Clear selection after update
        setAuditResult(null); // Reset audit for new version
        
        onUpdateScreen({ ...screen, designCode: result.code, history: newHistory });

    } catch (e) {
        console.error(e);
        alert("Failed to apply changes.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRunAudit = async () => {
      const persona = userPersonas.find(p => p.id === selectedPersonaId);
      setIsAuditing(true);
      try {
          const audit = await geminiService.runUXAudit(activeCode, persona, GEMINI_PRO);
          setAuditResult(audit);
          
          // Save audit to current version
          if (activeVersionId) {
              const updatedHistory = versions.map(v => 
                  v.id === activeVersionId ? { ...v, uxAudit: audit } : v
              );
              setVersions(updatedHistory);
              onUpdateScreen({ ...screen, history: updatedHistory });
          }
      } catch (e) {
          alert("Audit failed.");
      } finally {
          setIsAuditing(false);
      }
  };

  const handleCopyCode = () => {
      navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  // Helper to inject Tailwind & Interaction Scripts
  // Unconditionally inject the script to prevent iframe reload on tool switch
  const wrapCodeWithTailwind = (code: string, enableSelection: boolean) => {
    const interactionScript = enableSelection ? `
      <script>
        document.addEventListener('mouseover', (e) => {
           e.stopPropagation();
           // Remove old highlights
           const old = document.querySelectorAll('.__ai-highlight');
           old.forEach(el => el.classList.remove('__ai-highlight'));
           // Add highlight to target
           e.target.classList.add('__ai-highlight');
        });
        document.addEventListener('mouseout', (e) => {
           e.target.classList.remove('__ai-highlight');
        });
        document.addEventListener('click', (e) => {
           e.preventDefault();
           e.stopPropagation();
           const el = e.target;
           window.parent.postMessage({
              type: 'ELEMENT_CLICK',
              tagName: el.tagName.toLowerCase(),
              html: el.outerHTML,
              path: '' 
           }, '*');
        });
      </script>
      <style>
        .__ai-highlight {
           outline: 2px solid #3b82f6 !important;
           outline-offset: -2px !important;
           cursor: pointer !important;
           background-color: rgba(59, 130, 246, 0.1) !important;
        }
      </style>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
             tailwind.config = {
               theme: {
                 extend: {
                   fontFamily: { sans: ['Inter', 'sans-serif'] }
                 }
               }
             }
          </script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { margin: 0; padding: 0; background: transparent; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
            ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          </style>
          ${interactionScript}
        </head>
        <body>
          ${code}
        </body>
      </html>
    `;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] text-slate-200 flex flex-col font-sans overflow-hidden">
      
      {/* 1. FLOATING HEADER */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#18181b]/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-1.5 px-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={18} />
          </button>
          
          <div className="h-6 w-px bg-white/10 mx-1"></div>

          {/* Screen Switcher */}
          <div className="relative">
             <button 
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors text-sm font-semibold text-slate-100 min-w-[140px]"
             >
                 <span className="truncate max-w-[120px]">{screen.name}</span>
                 <ChevronDown size={14} className={`text-slate-500 transition-transform ${isNavOpen ? 'rotate-180' : ''}`} />
             </button>
             {isNavOpen && (
                 <div className="absolute top-full left-0 mt-2 w-64 max-h-[50vh] overflow-y-auto bg-[#18181b] border border-white/10 rounded-xl shadow-xl z-50 p-1">
                     {allModules.map(mod => (
                         <div key={mod.id} className="mb-1">
                             <div className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                 <Layers size={10} /> {mod.title}
                             </div>
                             {mod.screens.map(s => (
                                 <button
                                     key={s.id}
                                     onClick={() => { onSwitchScreen(s.id); setIsNavOpen(false); }}
                                     className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                                         s.id === screen.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'
                                     }`}
                                 >
                                     <span className="truncate">{s.name}</span>
                                     {s.id === screen.id && <Check size={12} className="ml-auto" />}
                                 </button>
                             ))}
                         </div>
                     ))}
                 </div>
             )}
          </div>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          {/* EDIT DROPDOWN MENU (NEW) */}
          <div className="relative">
             <button 
                onClick={() => setIsEditMenuOpen(!isEditMenuOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold border ${isEditMenuOpen ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'}`}
             >
                 <Edit size={14} /> Edit
                 <ChevronDown size={12} />
             </button>
             {isEditMenuOpen && (
                 <div className="absolute top-full left-0 mt-2 w-56 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                     <div className="p-1 space-y-0.5">
                         <button onClick={handleGlobalEdit} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center justify-between group">
                             <span className="flex items-center gap-2"><Globe size={14} className="text-blue-400" /> Global Edit</span>
                             <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400">Alt+G</span>
                         </button>
                         <button onClick={handleSectionEdit} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center justify-between group">
                             <span className="flex items-center gap-2"><BoxSelect size={14} className="text-green-400" /> Section Edit</span>
                             <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400">Alt+S</span>
                         </button>
                         <button onClick={handleManualEdit} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center justify-between group">
                             <span className="flex items-center gap-2"><Code size={14} className="text-purple-400" /> Manual Edit</span>
                             <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400">Alt+M</span>
                         </button>
                         <div className="h-px bg-white/10 my-1"></div>
                         <button onClick={handleAddSection} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center justify-between group">
                             <span className="flex items-center gap-2"><Plus size={14} className="text-orange-400" /> Add New Section</span>
                             <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400">Alt+A</span>
                         </button>
                     </div>
                 </div>
             )}
          </div>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          {/* View Mode Toggle */}
          <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/5">
             <button 
                onClick={() => setViewMode('canvas')} 
                className={`p-1.5 rounded transition-colors ${viewMode === 'canvas' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Canvas View (Pan & Zoom)"
             >
                 <Grid size={16} />
             </button>
             <button 
                onClick={() => setViewMode('focus')} 
                className={`p-1.5 rounded transition-colors ${viewMode === 'focus' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Focus View (Centered & Fixed)"
             >
                 <Layout size={16} />
             </button>
          </div>

          {/* Tool Toggle */}
          <div className="h-6 w-px bg-white/10 mx-1"></div>
          <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/5">
              <button 
                onClick={() => { setTool('select'); setSelectedElement(null); }} 
                className={`p-1.5 rounded flex items-center gap-2 px-2 text-xs font-medium transition-colors ${tool === 'select' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Select Elements to Edit"
              >
                  <MousePointer2 size={16} />
                  <span className="hidden sm:inline">Select</span>
              </button>
              <button 
                onClick={() => setTool('hand')} 
                className={`p-1.5 rounded ${tool === 'hand' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                title="Pan Canvas"
              >
                  <Hand size={16} />
              </button>
              <button 
                onClick={() => setTool('interact')} 
                className={`p-1.5 rounded flex items-center gap-2 px-2 text-xs font-medium transition-colors ${tool === 'interact' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Interact with Prototype"
              >
                  <MousePointerClick size={16} />
                  <span className="hidden sm:inline">Play</span>
              </button>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1"></div>
          
          {/* Viewport Toggles */}
          <div className="flex items-center gap-2">
            <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/5">
              {(['mobile', 'tablet', 'desktop', 'custom'] as const).map(v => (
                  <button 
                      key={v}
                      onClick={() => setViewport(v)}
                      className={`p-1.5 rounded transition-all ${viewport === v ? 'bg-white/20 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      title={v}
                  >
                      {v === 'mobile' && <Smartphone size={16} />}
                      {v === 'tablet' && <Tablet size={16} />}
                      {v === 'desktop' && <Monitor size={16} />}
                      {v === 'custom' && <Settings2 size={16} />}
                  </button>
              ))}
            </div>
            {viewport === 'custom' && (
                <div className="flex items-center gap-1 bg-black/50 rounded-lg p-1 border border-white/5 animate-in fade-in slide-in-from-left-2">
                    <input 
                        type="text" 
                        value={customSize.w} 
                        onChange={(e) => setCustomSize(prev => ({...prev, w: parseInt(e.target.value) || 0}))} 
                        className="w-10 bg-transparent text-white text-[10px] font-mono text-center outline-none border-b border-white/10 focus:border-blue-500" 
                    />
                    <span className="text-slate-500 text-[10px]">x</span>
                    <input 
                        type="text" 
                        value={customSize.h} 
                        onChange={(e) => setCustomSize(prev => ({...prev, h: parseInt(e.target.value) || 0}))} 
                        className="w-10 bg-transparent text-white text-[10px] font-mono text-center outline-none border-b border-white/10 focus:border-blue-500" 
                    />
                </div>
            )}
          </div>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          {/* More Actions Dropdown */}
          <div className="relative">
             <button 
               onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
               className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ${isMoreMenuOpen ? 'bg-white/10 text-white' : ''}`}
             >
                <MoreHorizontal size={18} />
             </button>
             
             {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                   <div className="p-1">
                      <button 
                        onClick={handleExportHTML}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                      >
                         <Download size={14} /> Export HTML
                      </button>
                      <button 
                        onClick={() => { setLeftPanelOpen(!leftPanelOpen); setIsMoreMenuOpen(false); }}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                      >
                         <History size={14} /> {leftPanelOpen ? 'Hide History' : 'Show History'}
                      </button>
                      <div className="h-px bg-white/10 my-1"></div>
                      <button 
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-white/5 hover:text-slate-400 flex items-center gap-2 cursor-not-allowed"
                      >
                         <Share2 size={14} /> Share Link (Soon)
                      </button>
                   </div>
                </div>
             )}
          </div>
      </div>

      {/* 2. INFINITE CANVAS */}
      <div 
         ref={canvasRef}
         className={`flex-1 overflow-hidden relative bg-[#09090b] ${
             viewMode === 'canvas' 
             ? (tool === 'hand' || isDragging ? 'cursor-grab active:cursor-grabbing' : 'cursor-default') 
             : 'flex items-center justify-center pt-16 pb-4 cursor-default'
         }`}
         onWheel={handleWheel}
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
      >
          {/* Background Grid */}
          <div 
              className="absolute inset-0 pointer-events-none opacity-[0.08]"
              style={{ 
                  backgroundImage: viewMode === 'canvas' ? 'radial-gradient(#ffffff 1px, transparent 1px)' : 'none',
                  backgroundSize: viewMode === 'canvas' ? `${20 * transform.scale}px ${20 * transform.scale}px` : '20px 20px',
                  backgroundPosition: viewMode === 'canvas' ? `${transform.x}px ${transform.y}px` : 'center'
              }}
          />

          {/* The Content Wrapper */}
          <div 
             className={`origin-center transition-transform duration-200 ease-out will-change-transform ${
                 viewMode === 'canvas' ? 'absolute top-0 left-0' : 'relative'
             }`}
             style={
                 viewMode === 'canvas' 
                 ? { transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, marginLeft: `-${frame.w / 2}px`, marginTop: `-${frame.h / 2}px` }
                 : { transform: `scale(${transform.scale})` }
             }
          >
              <div className="absolute -top-10 left-0 text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none flex items-center gap-2">
                 <span className="bg-blue-600 w-2 h-2 rounded-full inline-block"></span>
                 {frame.label} <span className="text-slate-600">|</span> {frame.w}x{frame.h}
              </div>

              <div 
                 className={`bg-white relative shadow-2xl transition-all duration-300 ring-1 ring-white/10`}
                 style={{ width: frame.w, height: frame.h }}
              >
                 <iframe 
                   ref={iframeRef}
                   srcDoc={wrapCodeWithTailwind(activeCode, tool === 'select')}
                   className="w-full h-full border-0 bg-white"
                   // If tool is 'hand', pointer events are disabled so clicks don't register in iframe.
                   // If tool is 'select' or 'interact', pointer events are auto.
                   style={{ pointerEvents: (tool === 'hand' || isDragging) ? 'none' : 'auto' }}
                   title="Design Preview"
                 />
              </div>
          </div>
      </div>

      {/* 3. LEFT PANEL: HISTORY */}
      <div 
        className={`fixed top-24 left-4 bottom-4 w-64 bg-[#18181b]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl flex flex-col transition-transform duration-300 z-40 ${leftPanelOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}
      >
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
             <h4 className="font-bold text-slate-300 text-xs uppercase flex items-center gap-2">
                <History size={14} /> Revisions
             </h4>
             <button onClick={() => setLeftPanelOpen(false)} className="text-slate-500 hover:text-white"><ChevronLeft size={16}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
             {versions.slice().reverse().map((v, i) => {
                 const realIndex = versions.length - 1 - i;
                 const isActive = v.id === activeVersionId;
                 return (
                     <div 
                        key={v.id} 
                        onClick={() => { setActiveVersionId(v.id); setPendingPlan(null); }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all group relative ${
                            isActive 
                            ? 'bg-blue-600/10 border-blue-500/50' 
                            : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                        }`}
                     >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-xs font-bold ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>v{realIndex + 1}</span>
                            <span className="text-[10px] text-slate-500">{new Date(v.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{v.aiComment || v.prompt}</p>
                        
                        {v.uxAudit && (
                            <div className={`mt-2 text-[10px] px-2 py-1 rounded flex items-center gap-1 w-fit ${v.uxAudit.score >= 80 ? 'bg-green-900/30 text-green-400' : v.uxAudit.score >= 60 ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}`}>
                                <UserCheck size={10} /> Audit: {v.uxAudit.score}
                            </div>
                        )}
                     </div>
                 );
             })}
          </div>
      </div>
      
      {!leftPanelOpen && (
         <button onClick={() => setLeftPanelOpen(true)} className="fixed top-24 left-4 z-40 p-2 bg-[#18181b] border border-white/10 rounded-lg text-slate-400 hover:text-white shadow-lg">
            <History size={20} />
         </button>
      )}

      {/* 4. RIGHT PANEL: INTELLIGENT INSPECTOR */}
      <div 
         className={`fixed top-24 right-4 bottom-4 w-96 bg-[#18181b]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl flex flex-col transition-transform duration-300 z-40 ${rightPanelOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
      >
          {/* Focus Header */}
          {selectedElement ? (
              <div className="bg-blue-600 p-3 flex justify-between items-center rounded-t-xl">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <BoxSelect size={16} />
                      <span className="uppercase">{selectedElement.tagName} Selected</span>
                  </div>
                  <button onClick={() => setSelectedElement(null)} className="text-white/70 hover:text-white"><Wand2 size={16}/></button>
              </div>
          ) : (
              <div className="flex border-b border-white/5 p-2 gap-2">
                <button onClick={() => setRightPanelTab('ai')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${rightPanelTab === 'ai' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5'}`}>
                    <Sparkles size={14} /> AI Copilot
                </button>
                <button onClick={() => setRightPanelTab('ux')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${rightPanelTab === 'ux' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5'}`}>
                    <UserCheck size={14} /> UX Audit
                </button>
                <button onClick={() => setRightPanelTab('code')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${rightPanelTab === 'code' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5'}`}>
                    <Code size={14} /> Dev
                </button>
                <button onClick={() => setRightPanelOpen(false)} className="px-2 text-slate-500 hover:text-white ml-auto"><ChevronRight size={16}/></button>
              </div>
          )}

          <div className="flex-1 overflow-hidden relative flex flex-col">
              {rightPanelTab === 'ai' && (
                  <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                           
                           {/* Quick Actions Palette */}
                           {!selectedElement && !pendingPlan && (
                               <div className="space-y-2 mb-4">
                                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                       <PaintBucket size={12} /> Instant Styles
                                   </div>
                                   <div className="flex flex-wrap gap-2">
                                       {QUICK_ACTIONS.map((action) => (
                                           <button 
                                              key={action.label}
                                              onClick={() => { setChatInput(action.prompt); handlePlanChanges(action.prompt); }}
                                              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all whitespace-nowrap"
                                           >
                                               {action.label}
                                           </button>
                                       ))}
                                   </div>
                               </div>
                           )}

                           {selectedElement && !pendingPlan && (
                               <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                                   <p className="text-xs text-blue-200 mb-2">
                                       You have selected a <strong>&lt;{selectedElement.tagName}&gt;</strong>. 
                                       Ask the AI to modify just this element and its children.
                                   </p>
                                   <div className="text-[10px] font-mono bg-black/40 p-2 rounded text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap mb-2">
                                       {selectedElement.html.substring(0, 100)}...
                                   </div>
                               </div>
                           )}

                           {/* Pending Plan Card */}
                           {pendingPlan && (
                               <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
                                   <h5 className="font-bold text-blue-400 text-sm flex items-center gap-2 mb-3">
                                       <CheckCircle2 size={16} /> Proposed Updates
                                   </h5>
                                   <p className="text-sm text-slate-300 leading-relaxed mb-4">{pendingPlan.summary}</p>
                                   <div className="flex gap-2">
                                       <button onClick={() => setPendingPlan(null)} className="flex-1 py-2 bg-white/10 text-slate-300 rounded-lg text-xs font-bold hover:bg-white/20">Discard</button>
                                       <button onClick={handleExecuteChanges} disabled={isProcessing} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 flex items-center justify-center gap-2">
                                           {isProcessing ? <RefreshCw className="animate-spin" size={14}/> : <Play size={14} fill="currentColor" />} Apply
                                       </button>
                                   </div>
                               </div>
                           )}

                           {/* Analysis Result */}
                           {analysisResult && (
                              <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 shadow-lg animate-in fade-in zoom-in-95">
                                  <h5 className="font-bold text-purple-400 text-sm flex items-center gap-2 mb-2">
                                     <Atom size={16} /> Design System Synced
                                  </h5>
                                  <div className="space-y-2">
                                      {analysisResult.newComponents.length > 0 && (
                                          <div>
                                              <span className="text-[10px] font-bold text-purple-300 uppercase block mb-1">New Components</span>
                                              <div className="flex flex-wrap gap-1">
                                                  {analysisResult.newComponents.map(c => (
                                                      <span key={c.id} className="text-[10px] bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded border border-purple-500/30">
                                                          {c.name}
                                                      </span>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>
                           )}
                           <div ref={messagesEndRef}></div>
                      </div>

                      <div className="p-4 border-t border-white/5 bg-[#18181b]">
                          {/* Reference Image Preview */}
                          {referenceImage && (
                              <div className="relative mb-3 group">
                                  <img 
                                    src={referenceImage} 
                                    alt="Ref" 
                                    className="h-20 w-auto rounded-lg border border-white/20 object-cover shadow-lg"
                                  />
                                  <button 
                                    onClick={() => setReferenceImage(null)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                  >
                                      <Trash size={12} />
                                  </button>
                                  <div className="text-[10px] text-blue-300 mt-1 flex items-center gap-1 font-bold">
                                      <ImageIcon size={10} /> Using Reference Image
                                  </div>
                              </div>
                          )}

                          <div className="relative">
                              <textarea 
                                  ref={chatInputRef}
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePlanChanges()}
                                  disabled={isProcessing || !!pendingPlan}
                                  className="w-full p-3 pr-20 pl-3 border border-white/10 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-black/40 text-slate-200 placeholder:text-slate-600"
                                  placeholder={selectedElement ? `Edit this <${selectedElement.tagName}>...` : "Describe visual changes..."}
                                  rows={2}
                              />
                              <div className="absolute right-2 top-2 flex gap-1">
                                  {/* Attach Image Button */}
                                  <label className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 hover:text-white cursor-pointer transition-colors" title="Attach Reference Image">
                                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                      <ImageIcon size={14} />
                                  </label>
                                  
                                  <button 
                                      onClick={() => handlePlanChanges()}
                                      disabled={(!chatInput.trim() && !referenceImage) || isProcessing || !!pendingPlan}
                                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:bg-white/5 transition-colors"
                                  >
                                      {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                                  </button>
                              </div>
                          </div>
                      </div>
                  </>
              )}

              {/* --- UX AUDIT TAB --- */}
              {rightPanelTab === 'ux' && (
                  <div className="flex-1 flex flex-col h-full bg-[#18181b]">
                      {!auditResult ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                  <UserCheck size={32} className="text-slate-500" />
                              </div>
                              <h4 className="font-bold text-slate-300 mb-2">Persona Simulation</h4>
                              <p className="text-xs text-slate-500 mb-6">
                                  Let the AI roleplay as your target user to test usability and accessibility.
                              </p>
                              
                              <div className="w-full mb-4 text-left">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Persona</label>
                                  <select 
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-slate-300 outline-none"
                                    value={selectedPersonaId}
                                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                                  >
                                      <option value="">Generic User</option>
                                      {userPersonas.map(p => (
                                          <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                                      ))}
                                  </select>
                              </div>

                              <button 
                                onClick={handleRunAudit}
                                disabled={isAuditing}
                                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-500 flex items-center justify-center gap-2"
                              >
                                  {isAuditing ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                                  Run Simulation
                              </button>
                          </div>
                      ) : (
                          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                              
                              {/* Score Card */}
                              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                  <div className="relative w-16 h-16 flex items-center justify-center">
                                      <svg className="w-full h-full transform -rotate-90">
                                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" />
                                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                            strokeDasharray={175.9} 
                                            strokeDashoffset={175.9 - (175.9 * auditResult.score) / 100}
                                            className={`${auditResult.score > 80 ? 'text-green-500' : auditResult.score > 60 ? 'text-yellow-500' : 'text-red-500'}`}
                                          />
                                      </svg>
                                      <span className="absolute text-lg font-bold text-white">{auditResult.score}</span>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-white text-sm">UX Score</h4>
                                      <p className="text-xs text-slate-400">Based on heuristics & persona fit.</p>
                                  </div>
                              </div>

                              {/* Persona Reaction (Roleplay) */}
                              <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 p-4 rounded-xl relative">
                                  <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                      <User size={10} /> {auditResult.personaReaction.personaName} says:
                                  </div>
                                  <div className="mt-2 text-sm text-indigo-100 italic leading-relaxed">
                                      "{auditResult.personaReaction.quote}"
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                      {auditResult.personaReaction.sentiment === 'positive' && <ThumbsUp size={16} className="text-green-400" />}
                                      {auditResult.personaReaction.sentiment === 'frustrated' && <ThumbsDown size={16} className="text-red-400" />}
                                  </div>
                              </div>

                              {/* Heuristics */}
                              <div>
                                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Heuristic Analysis</h5>
                                  <div className="space-y-2">
                                      {auditResult.heuristicAnalysis.map((item, idx) => (
                                          <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                              <div className="flex justify-between items-center mb-1">
                                                  <span className="text-xs font-bold text-slate-300">{item.category}</span>
                                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                      item.rating === 'Good' ? 'bg-green-500/20 text-green-300' : 
                                                      item.rating === 'Fair' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                                                  }`}>{item.rating}</span>
                                              </div>
                                              <p className="text-xs text-slate-400">{item.observation}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              {/* Suggestions */}
                              <div>
                                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Actionable Fixes</h5>
                                  <ul className="space-y-2">
                                      {auditResult.suggestions.map((s, idx) => (
                                          <li key={idx} className="flex gap-2 text-xs text-slate-300 bg-black/20 p-2 rounded">
                                              <div className="mt-0.5 text-blue-500 flex-shrink-0"><Wand2 size={12} /></div>
                                              {s}
                                          </li>
                                      ))}
                                  </ul>
                              </div>

                              <button onClick={() => setAuditResult(null)} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-400">
                                  Run Another Audit
                              </button>
                          </div>
                      )}
                  </div>
              )}

              {rightPanelTab === 'code' && (
                  <div className="absolute inset-0 flex flex-col bg-[#0f0f11]">
                      <div className="p-2 border-b border-white/5 bg-[#18181b] flex justify-between items-center">
                         <span className="text-[10px] font-mono text-slate-500 px-2">index.html (Live Edit)</span>
                         <button onClick={handleCopyCode} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10">
                             {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                         </button>
                      </div>
                      <textarea 
                         value={activeCode}
                         onChange={(e) => setActiveCode(e.target.value)}
                         className="flex-1 w-full bg-[#0f0f11] text-blue-200 font-mono text-xs p-4 outline-none resize-none leading-relaxed"
                         spellCheck={false}
                      />
                  </div>
              )}
          </div>
      </div>

       {/* Right Toggle */}
       {!rightPanelOpen && (
         <button onClick={() => setRightPanelOpen(true)} className="fixed top-24 right-4 z-40 p-2 bg-[#18181b] border border-white/10 rounded-lg text-slate-400 hover:text-white shadow-lg">
            <Code size={20} />
         </button>
      )}

    </div>
  );
};
