
import React, { useState, useEffect, useRef } from 'react';
import { ModelSelector, GEMINI_FLASH } from './ModelSelector';
import { SavedProjectState, RequirementSource, SourceType, PRDSection, ProjectInsight, ScopedFeature, ProjectMode, FeatureProposal, ScopeDraft, UserPersona } from '../types';
import { 
  UploadCloud, 
  Mic, 
  FileText, 
  StickyNote, 
  Mail, 
  Plus, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  Edit2,
  CheckCircle2,
  X,
  Target,
  BrainCircuit,
  RefreshCw,
  Users,
  ListTodo,
  AlertTriangle,
  Loader2,
  Paperclip,
  Save,
  ArrowRight,
  BookOpen,
  AppWindow,
  Layers,
  Smile
} from 'lucide-react';
import * as geminiService from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { PRD_TEMPLATES } from '../constants';

interface StepIntakeProps {
  masterBrd: PRDSection[];
  prdSections: PRDSection[];
  sources: RequirementSource[];
  insights: ProjectInsight[];
  scopeDrafts: ScopeDraft[];
  userPersonas?: UserPersona[];
  savedMode?: ProjectMode;
  onMasterBrdChange: (sections: PRDSection[]) => void;
  onPRDSectionsChange: (sections: PRDSection[]) => void;
  onSourcesChange: (sources: RequirementSource[]) => void;
  onInsightsChange: (insights: ProjectInsight[]) => void;
  onPersonasChange?: (personas: UserPersona[]) => void;
  onCreateDraft: (draft: ScopeDraft) => void;
  onUpdateDraft: (draft: ScopeDraft) => void;
  onDraftModeChange?: (mode: ProjectMode) => void;
  onNext: (model: string, mode: ProjectMode, scope?: ScopedFeature[]) => void;
  onResume: (savedState: SavedProjectState) => void;
  isLoading: boolean;
}

const SourceIcon = ({ type }: { type: SourceType }) => {
  switch (type) {
    case 'transcript': return <Mic size={16} className="text-orange-500" />;
    case 'brief': return <FileText size={16} className="text-blue-500" />;
    case 'notes': return <StickyNote size={16} className="text-yellow-500" />;
    case 'email': return <Mail size={16} className="text-purple-500" />;
    default: return <FileText size={16} />;
  }
};

type StrategyStep = 'inputs' | 'strategy' | 'personas' | 'brd' | 'apps' | 'prd' | 'scope';

export const StepIntake: React.FC<StepIntakeProps> = ({ 
  masterBrd,
  prdSections, 
  sources, 
  insights,
  scopeDrafts,
  userPersonas = [],
  savedMode,
  onMasterBrdChange,
  onPRDSectionsChange, 
  onSourcesChange, 
  onInsightsChange,
  onPersonasChange,
  onCreateDraft,
  onUpdateDraft,
  onDraftModeChange,
  onNext, 
  onResume, 
  isLoading 
}) => {
  const [model, setModel] = useState(GEMINI_FLASH);
  const [activeStep, setActiveStep] = useState<StrategyStep>('inputs');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- LOCAL STATES ---
  
  // 1. Inputs
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceType, setNewSourceType] = useState<SourceType>('brief');
  const [newSourceContent, setNewSourceContent] = useState('');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzingSourceId, setAnalyzingSourceId] = useState<string | null>(null);

  // 2. Strategy
  const [resolvingInsightId, setResolvingInsightId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  // 3. Master BRD
  const [editingBrdId, setEditingBrdId] = useState<string | null>(null);
  const [brdEditContent, setBrdEditContent] = useState('');

  // 4. Apps
  const [identifiedApps, setIdentifiedApps] = useState<string[]>([]);
  const [newAppName, setNewAppName] = useState('');

  // 5. PRD
  const [selectedAppTab, setSelectedAppTab] = useState<string>('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // 6. Scope
  const [activeDraftId, setActiveDraftId] = useState<string | null>(scopeDrafts.length > 0 ? scopeDrafts[0].id : null);
  const activeFeatures = activeDraftId ? scopeDrafts.find(d => d.id === activeDraftId)?.features || [] : [];
  const [selectedMode, setSelectedMode] = useState<ProjectMode | null>(savedMode || null);

  // Deletion
  const [deleteTarget, setDeleteTarget] = useState<{ type: string, id: string, name: string } | null>(null);

  // --- EFFECTS ---
  useEffect(() => {
    // Auto-select first draft if none selected but available (e.g. after generation)
    if (!activeDraftId && scopeDrafts.length > 0) {
        setActiveDraftId(scopeDrafts[0].id);
    }
  }, [scopeDrafts, activeDraftId]);

  // --- ACTIONS ---

  const resetSourceForm = () => {
    setNewSourceTitle('');
    setNewSourceContent('');
    setNewSourceType('brief');
    setEditingSourceId(null);
    setIsAddingSource(false);
  };

  const handleSaveSource = () => {
    if (!newSourceTitle || !newSourceContent) return;
    
    if (editingSourceId) {
        // Update existing
        const updatedSources = sources.map(s => s.id === editingSourceId ? {
            ...s,
            title: newSourceTitle,
            type: newSourceType,
            content: newSourceContent
        } : s);
        onSourcesChange(updatedSources);
    } else {
        // Create new
        const newSource: RequirementSource = {
            id: crypto.randomUUID(),
            title: newSourceTitle,
            type: newSourceType,
            content: newSourceContent,
            isExpanded: true
        };
        onSourcesChange([...sources, newSource]);
    }
    resetSourceForm();
  };

  const handleEditSource = (source: RequirementSource) => {
      setNewSourceTitle(source.title);
      setNewSourceContent(source.content);
      setNewSourceType(source.type);
      setEditingSourceId(source.id);
      setIsAddingSource(true);
  };

  const handleAnalyzeSource = async (source: RequirementSource) => {
      setAnalyzingSourceId(source.id);
      try {
          const analysis = await geminiService.analyzeRequirementSource(source, model);
          const updated = sources.map(s => s.id === source.id ? { ...s, analysis, isExpanded: true } : s);
          onSourcesChange(updated);
      } catch (e) {
          alert("Failed to analyze source.");
      } finally {
          setAnalyzingSourceId(null);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          // Determine type based on file
          if (file.type.startsWith('audio/')) {
              setNewSourceType('transcript');
              // Transcribe
              const text = await geminiService.transcribeAudio(file);
              setNewSourceContent(text);
              setNewSourceTitle(file.name);
          } else {
              // Assume Text/JSON
              const text = await file.text();
              setNewSourceContent(text);
              setNewSourceTitle(file.name);
              setNewSourceType('brief');
          }
      } catch (err) {
          console.error(err);
          alert("Failed to process file. Please ensure it is a valid format.");
      } finally {
          setIsUploading(false);
          // Clear input so same file can be selected again if needed
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleGenerateStrategy = async () => {
    setIsProcessing(true);
    try {
      const newInsights = await geminiService.analyzeProjectStrategy(sources);
      onInsightsChange(newInsights);
      
      // Also generate personas here if none exist
      if ((!userPersonas || userPersonas.length === 0) && onPersonasChange) {
          const newPersonas = await geminiService.generatePersonas(sources, model);
          onPersonasChange(newPersonas);
      }
      
      setActiveStep('strategy');
    } catch (e) { alert("Failed to analyze strategy"); } 
    finally { setIsProcessing(false); }
  };

  const handleResolveInsight = (id: string) => {
      const updated = insights.map(i => i.id === id ? { ...i, resolution: resolutionText } : i);
      onInsightsChange(updated);
      setResolvingInsightId(null);
      setResolutionText('');
  };

  // --- BRD ACTIONS ---
  const handleGenerateBRD = async () => {
      setIsProcessing(true);
      try {
          const brd = await geminiService.generateMasterBRD(sources, insights, model);
          onMasterBrdChange(brd);
          setActiveStep('brd');
      } catch (e) { alert("Failed to generate BRD."); }
      finally { setIsProcessing(false); }
  };

  // --- APP ACTIONS ---
  const handleSuggestApps = async () => {
      if (masterBrd.length === 0) {
          alert("Please generate Master BRD first.");
          return;
      }
      setIsProcessing(true);
      try {
          const apps = await geminiService.suggestApplications(masterBrd, model);
          setIdentifiedApps(apps);
          setActiveStep('apps');
      } catch (e) { alert("Failed to suggest apps."); }
      finally { setIsProcessing(false); }
  };

  const handleAddApp = () => {
      if (newAppName && !identifiedApps.includes(newAppName)) {
          setIdentifiedApps([...identifiedApps, newAppName]);
          setNewAppName('');
      }
  };

  const handleRemoveApp = (app: string) => {
      setIdentifiedApps(identifiedApps.filter(a => a !== app));
  };

  // --- PRD ACTIONS ---
  const handleGenerateAppPRDs = async () => {
      if (identifiedApps.length === 0) {
          alert("Please define at least one application.");
          return;
      }
      setIsProcessing(true);
      try {
          let allSections: PRDSection[] = [];
          
          for (const app of identifiedApps) {
              const appSections = await geminiService.generateApplicationPRD(
                  app, 
                  masterBrd, 
                  sources, 
                  userPersonas || [], 
                  model
              );
              allSections = [...allSections, ...appSections];
          }
          
          onPRDSectionsChange(allSections);
          setSelectedAppTab(identifiedApps[0]);
          setActiveStep('prd');
      } catch (e) { alert("Failed to generate PRDs."); }
      finally { setIsProcessing(false); }
  };

  const handleAnalyzeScope = async () => {
    if (sources.length === 0) return;
    setIsProcessing(true);
    try {
      const features = await geminiService.analyzeScope(sources, prdSections);
      const newDraft: ScopeDraft = { id: crypto.randomUUID(), name: `Scope v${scopeDrafts.length + 1}`, timestamp: Date.now(), features: features, sourceCount: sources.length };
      onCreateDraft(newDraft);
      setActiveDraftId(newDraft.id);
      setActiveStep('scope');
    } catch (e) { alert("Failed to analyze scope."); } 
    finally { setIsProcessing(false); }
  };

  const handleToggleCategory = (category: string) => {
      const categoryFeatures = activeFeatures.filter(f => f.category === category);
      const allSelected = categoryFeatures.every(f => f.isSelected);
      
      const newFeatures = activeFeatures.map(f => {
          if (f.category === category) return { ...f, isSelected: !allSelected };
          return f;
      });
      
      if (activeDraftId) {
          const draft = scopeDrafts.find(d => d.id === activeDraftId);
          if (draft) onUpdateDraft({ ...draft, features: newFeatures });
      }
  };

  const handleToggleFeature = (id: string) => {
      const newFeatures = activeFeatures.map(f => f.id === id ? { ...f, isSelected: !f.isSelected } : f);
      if (activeDraftId) {
          const draft = scopeDrafts.find(d => d.id === activeDraftId);
          if (draft) onUpdateDraft({ ...draft, features: newFeatures });
      }
  };

  const confirmDelete = () => {
      if(!deleteTarget) return;
      if (deleteTarget.type === 'source') onSourcesChange(sources.filter(s => s.id !== deleteTarget.id));
      if (deleteTarget.type === 'insight') onInsightsChange(insights.filter(i => i.id !== deleteTarget.id));
      if (deleteTarget.type === 'section') onPRDSectionsChange(prdSections.filter(s => s.id !== deleteTarget.id));
      if (deleteTarget.type === 'brd') onMasterBrdChange(masterBrd.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
  };

  const toggleSourceExpand = (id: string) => {
      const updated = sources.map(s => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s);
      onSourcesChange(updated);
  };

  // --- RENDERERS ---

  const renderInputs = () => (
      <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-gray-800">Knowledge Sources</h3>
              {!isAddingSource && (
                  <button onClick={() => { resetSourceForm(); setIsAddingSource(true); }} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1 font-bold shadow-sm"><Plus size={14}/> Add Source</button>
              )}
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 pb-4">
              {isAddingSource && (
                  <div className="bg-white p-5 rounded-xl border-2 border-blue-100 shadow-md mb-6 animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-blue-900 text-sm">{editingSourceId ? 'Edit Source' : 'Add New Source'}</h4>
                          <button onClick={resetSourceForm} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                      </div>

                      <div className="space-y-4">
                          <div className="flex gap-4">
                              <div className="flex-1">
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source Title</label>
                                  <input 
                                      value={newSourceTitle} 
                                      onChange={e => setNewSourceTitle(e.target.value)} 
                                      placeholder="e.g. Stakeholder Interview or Project Brief" 
                                      className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" 
                                      autoFocus 
                                  />
                              </div>
                              <div className="w-1/3">
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                  <div className="relative">
                                      <select 
                                          value={newSourceType}
                                          onChange={(e) => setNewSourceType(e.target.value as SourceType)}
                                          className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white appearance-none outline-none focus:border-blue-500"
                                      >
                                          <option value="brief">Brief / Doc</option>
                                          <option value="transcript">Audio Transcript</option>
                                          <option value="email">Email Thread</option>
                                          <option value="notes">Raw Notes</option>
                                      </select>
                                      <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={14} />
                                  </div>
                              </div>
                          </div>

                          <div>
                              <label className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase mb-1">
                                  <span>Content</span>
                                  {!editingSourceId && (
                                      <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:underline flex items-center gap-1 font-normal normal-case">
                                          <Paperclip size={12} /> Upload File / Audio
                                      </button>
                                  )}
                              </label>
                              <input 
                                  type="file" 
                                  ref={fileInputRef}
                                  className="hidden"
                                  accept=".txt,.md,.json,.csv,.mp3,.wav,.m4a"
                                  onChange={handleFileUpload}
                              />
                              
                              <div className="relative">
                                  <textarea 
                                      value={newSourceContent} 
                                      onChange={e => setNewSourceContent(e.target.value)} 
                                      className="w-full h-40 text-sm p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none resize-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-mono" 
                                      placeholder={isUploading ? "Processing file..." : "Paste text content here or upload a file..."}
                                      disabled={isUploading}
                                  />
                                  {isUploading && (
                                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                          <div className="flex flex-col items-center gap-2">
                                              <Loader2 className="animate-spin text-blue-600" size={24} />
                                              <span className="text-xs font-bold text-blue-600">Processing File...</span>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-2">
                              <button onClick={resetSourceForm} className="text-sm text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                              <button onClick={handleSaveSource} disabled={!newSourceTitle || isUploading} className="text-sm bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                                  <Save size={16} /> {editingSourceId ? 'Update Source' : 'Save Source'}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              <div className="space-y-4">
                  {sources.length === 0 && !isAddingSource && (
                      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                          <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                              <UploadCloud className="text-gray-400" size={32} />
                          </div>
                          <h4 className="text-gray-600 font-bold">No Sources Yet</h4>
                          <p className="text-sm text-gray-400 mb-4">Upload briefs, transcripts, or notes to get started.</p>
                          <button onClick={() => setIsAddingSource(true)} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">Add First Source</button>
                      </div>
                  )}
                  
                  {sources.map(source => (
                      <div key={source.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-all">
                          <div className="p-4 flex items-start justify-between cursor-pointer hover:bg-gray-50/50" onClick={() => toggleSourceExpand(source.id)}>
                              <div className="flex gap-4 items-center">
                                  <div className={`p-3 rounded-xl ${source.type === 'transcript' ? 'bg-orange-50' : source.type === 'email' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                                      <SourceIcon type={source.type} />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                          {source.title}
                                          <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wide">{source.type}</span>
                                      </h4>
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{source.content.substring(0, 100)}...</p>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleAnalyzeSource(source)} 
                                    disabled={analyzingSourceId === source.id}
                                    className={`p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors ${analyzingSourceId === source.id ? 'bg-purple-50 text-purple-600' : ''}`}
                                    title="AI Analysis"
                                  >
                                      {analyzingSourceId === source.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                  </button>
                                  <div className="h-4 w-px bg-gray-200"></div>
                                  <button onClick={() => handleEditSource(source)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                                      <Edit2 size={16} />
                                  </button>
                                  <button onClick={() => setDeleteTarget({type:'source', id: source.id, name: source.title})} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                                      <Trash2 size={16} />
                                  </button>
                                  <div className="ml-2 text-gray-300">
                                      {source.isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                  </div>
                              </div>
                          </div>
                          
                          {source.isExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50/30 p-4 animate-in slide-in-from-top-1">
                                  {source.analysis && (
                                      <div className="mb-4 bg-purple-50 border border-purple-100 rounded-lg p-3">
                                          <h5 className="text-xs font-bold text-purple-800 uppercase mb-2 flex items-center gap-1">
                                              <Sparkles size={12} /> AI Insight
                                          </h5>
                                          <div className="text-xs text-purple-900 leading-relaxed prose prose-sm max-w-none">
                                              <ReactMarkdown>{source.analysis}</ReactMarkdown>
                                          </div>
                                      </div>
                                  )}
                                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Raw Content</div>
                                      <p className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">{source.content}</p>
                                  </div>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
              
              {sources.length > 0 && (
                  <div className="pt-6 border-t border-gray-100 flex justify-end mt-4">
                      <button onClick={handleGenerateStrategy} disabled={isProcessing} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all flex items-center gap-2 disabled:opacity-50 disabled:transform-none disabled:shadow-none">
                          {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Target size={18} />}
                          Analyze Strategy & Risks
                      </button>
                  </div>
              )}
          </div>
      </div>
  );

  const renderStrategy = () => (
      <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-gray-800">Strategic Alignment</h3>
              <button onClick={handleGenerateStrategy} disabled={isProcessing} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"><RefreshCw size={12}/> Re-Analyze</button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <div className="grid grid-cols-1 gap-4">
                  {insights.map(insight => (
                      <div key={insight.id} className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${insight.type === 'risk' ? 'border-l-red-500' : insight.type === 'conflict' ? 'border-l-orange-500' : 'border-l-green-500'}`}>
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                  {insight.type === 'risk' && <AlertTriangle size={16} className="text-red-500"/>}
                                  <span className="text-xs font-bold uppercase text-gray-500">{insight.type}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${insight.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>{insight.severity}</span>
                              </div>
                              {insight.resolution ? (
                                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Resolved</span>
                              ) : (
                                  <button onClick={() => setResolvingInsightId(insight.id)} className="text-xs text-blue-600 font-bold hover:underline">Resolve</button>
                              )}
                          </div>
                          <h4 className="font-bold text-gray-800 text-sm mb-1">{insight.title}</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">{insight.description}</p>
                          
                          {/* Resolution Area */}
                          {insight.resolution && (
                              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                  <span className="font-bold text-gray-800">Decision:</span> {insight.resolution}
                              </div>
                          )}
                          
                          {resolvingInsightId === insight.id && (
                              <div className="mt-3 animate-in slide-in-from-top-2">
                                  <textarea value={resolutionText} onChange={e => setResolutionText(e.target.value)} className="w-full p-2 border border-blue-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none mb-2" placeholder="How should we handle this? (e.g. 'Accept Risk', 'Add MFA')" autoFocus />
                                  <div className="flex justify-end gap-2">
                                      <button onClick={() => setResolvingInsightId(null)} className="text-xs text-gray-500">Cancel</button>
                                      <button onClick={() => handleResolveInsight(insight.id)} disabled={!resolutionText} className="text-xs bg-blue-600 text-white px-3 py-1 rounded font-bold">Save Resolution</button>
                                  </div>
                              </div>
                          )}
                      </div>
                  ))}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end mt-4">
                  <button onClick={() => setActiveStep('personas')} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 flex items-center gap-2">
                      Next: Review Personas <ArrowRight size={16} />
                  </button>
              </div>
          </div>
      </div>
  );

  const renderPersonas = () => (
      <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Users size={18} className="text-pink-600" /> Target User Personas
              </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userPersonas?.map(persona => (
                      <div key={persona.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                              <div>
                                  <h4 className="font-bold text-gray-800 text-lg">{persona.name}</h4>
                                  <div className="text-xs font-bold text-pink-600 uppercase tracking-wide">{persona.role}</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                  persona.techLiteracy === 'high' ? 'bg-green-100 text-green-700' :
                                  persona.techLiteracy === 'medium' ? 'bg-blue-100 text-blue-700' :
                                  'bg-orange-100 text-orange-700'
                              }`}>
                                  Tech: {persona.techLiteracy}
                              </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-4 italic leading-relaxed">
                              "{persona.description}"
                          </p>
                          
                          <div className="space-y-3">
                              <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                      <Target size={10} /> Key Goals
                                  </div>
                                  <ul className="text-xs text-gray-700 space-y-1 list-disc pl-4">
                                      {persona.goals.map((g, i) => <li key={i}>{g}</li>)}
                                  </ul>
                              </div>
                              <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                      <AlertTriangle size={10} /> Frustrations
                                  </div>
                                  <ul className="text-xs text-gray-700 space-y-1 list-disc pl-4">
                                      {persona.frustrations.map((f, i) => <li key={i}>{f}</li>)}
                                  </ul>
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  {(!userPersonas || userPersonas.length === 0) && (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                          <Users size={48} className="mb-4 opacity-50" />
                          <p>No personas generated yet.</p>
                          <p className="text-xs mt-1">Run "Analyze Strategy" in the Inputs step to generate them.</p>
                      </div>
                  )}
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex justify-end mt-4">
                  <button onClick={() => setActiveStep('brd')} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 flex items-center gap-2">
                      Next: Master BRD <ArrowRight size={16} />
                  </button>
              </div>
          </div>
      </div>
  );

  const renderMasterBRD = () => (
      <div className="h-full flex flex-col">
          {masterBrd.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <BookOpen size={48} className="text-gray-300 mb-4" />
                  <h4 className="text-gray-500 font-bold mb-2">Master BRD Required</h4>
                  <p className="text-sm text-gray-400 max-w-sm mb-6">
                      Before defining applications, we need a high-level Business Requirements Document covering goals and scope.
                  </p>
                  <button onClick={handleGenerateBRD} disabled={isProcessing} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50">
                      {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      Generate Master BRD
                  </button>
              </div>
          ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-4 flex-shrink-0">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><BookOpen size={18} className="text-purple-600" /> Master Business Requirements</h3>
                      <button onClick={handleSuggestApps} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2">Next: Identify Apps <ArrowRight size={12} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {masterBrd.map(section => (
                          <div key={section.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                                  <span className="text-xl">{section.emoji}</span>
                                  <h4 className="font-bold text-gray-800">{section.title}</h4>
                                  <div className="ml-auto flex gap-1">
                                      <button onClick={() => { setEditingBrdId(section.id); setBrdEditContent(section.content); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 size={14}/></button>
                                      <button onClick={() => setDeleteTarget({type:'brd', id:section.id, name:section.title})} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                              {editingBrdId === section.id ? (
                                  <div>
                                      <textarea value={brdEditContent} onChange={e => setBrdEditContent(e.target.value)} className="w-full min-h-[200px] p-3 border border-blue-200 rounded text-sm outline-none resize-y" />
                                      <div className="flex justify-end gap-2 mt-2">
                                          <button onClick={() => setEditingBrdId(null)} className="text-xs text-gray-500">Cancel</button>
                                          <button onClick={() => { onMasterBrdChange(masterBrd.map(s => s.id === section.id ? {...s, content: brdEditContent} : s)); setEditingBrdId(null); }} className="text-xs bg-blue-600 text-white px-3 py-1 rounded font-bold">Save</button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="prose prose-sm max-w-none text-slate-600"><ReactMarkdown>{section.content}</ReactMarkdown></div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>
  );

  const renderAppSelection = () => (
      <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-gray-800">Identify Applications</h3>
              <div className="flex gap-2">
                  <button onClick={handleSuggestApps} disabled={isProcessing} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-100 flex items-center gap-1"><Sparkles size={12}/> AI Suggest</button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-500 mb-4">What separate applications make up this ecosystem? (e.g. "Customer App", "Admin Panel")</p>
                  
                  <div className="space-y-3 mb-6">
                      {identifiedApps.map(app => (
                          <div key={app} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-3">
                                  <AppWindow size={18} className="text-blue-500" />
                                  <span className="font-bold text-gray-800 text-sm">{app}</span>
                              </div>
                              <button onClick={() => handleRemoveApp(app)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                      ))}
                      {identifiedApps.length === 0 && (
                          <div className="text-center text-gray-400 text-sm italic py-4">No applications defined yet.</div>
                      )}
                  </div>

                  <div className="flex gap-2">
                      <input 
                          value={newAppName} 
                          onChange={e => setNewAppName(e.target.value)} 
                          placeholder="Enter App Name..." 
                          className="flex-1 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
                          onKeyDown={e => e.key === 'Enter' && handleAddApp()}
                      />
                      <button onClick={handleAddApp} disabled={!newAppName} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold disabled:opacity-50">Add</button>
                  </div>
              </div>

              <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
                  <button onClick={handleGenerateAppPRDs} disabled={identifiedApps.length === 0 || isProcessing} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                      {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <FileText size={16} />}
                      Generate App Specs
                  </button>
              </div>
          </div>
      </div>
  );

  const renderAppPRDs = () => {
      const currentAppSections = prdSections.filter(s => s.application === selectedAppTab);
      
      return (
          <div className="h-full flex flex-col">
              {/* App Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 flex-shrink-0">
                  {identifiedApps.map(app => (
                      <button
                          key={app}
                          onClick={() => setSelectedAppTab(app)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedAppTab === app ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                          {app}
                      </button>
                  ))}
              </div>

              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Layers size={18} className="text-purple-600" /> App Specifications</h3>
                  <button onClick={handleAnalyzeScope} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2">Next: Scope <ArrowRight size={12} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {currentAppSections.length === 0 ? (
                      <div className="text-center text-gray-400 py-10">Select an application tab to view specs.</div>
                  ) : (
                      currentAppSections.map(section => (
                          <div key={section.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                                  <span className="text-xl">{section.emoji}</span>
                                  <h4 className="font-bold text-gray-800">{section.title}</h4>
                                  <div className="ml-auto flex gap-1">
                                      <button onClick={() => { setEditingSectionId(section.id); setEditContent(section.content); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 size={14}/></button>
                                      <button onClick={() => setDeleteTarget({type:'section', id:section.id, name:section.title})} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                              {editingSectionId === section.id ? (
                                  <div>
                                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full h-40 p-3 border border-blue-200 rounded text-sm outline-none resize-y" />
                                      <div className="flex justify-end gap-2 mt-2">
                                          <button onClick={() => setEditingSectionId(null)} className="text-xs text-gray-500">Cancel</button>
                                          <button onClick={() => { onPRDSectionsChange(prdSections.map(s => s.id === section.id ? {...s, content: editContent} : s)); setEditingSectionId(null); }} className="text-xs bg-blue-600 text-white px-3 py-1 rounded font-bold">Save</button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="prose prose-sm max-w-none text-slate-600"><ReactMarkdown>{section.content}</ReactMarkdown></div>
                              )}
                          </div>
                      ))
                  )}
              </div>
          </div>
      );
  };

  const renderScope = () => {
      // Group features by category
      const groups: Record<string, ScopedFeature[]> = {};
      activeFeatures.forEach(f => {
          const cat = f.category || 'Uncategorized';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(f);
      });

      return (
          <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h3 className="font-bold text-gray-800">Feature Scope Matrix</h3>
                  <div className="flex items-center gap-2">
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button onClick={() => setSelectedMode('architect')} className={`px-3 py-1.5 rounded text-xs font-bold ${selectedMode === 'architect' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Architect</button>
                          <button onClick={() => setSelectedMode('rapid')} className={`px-3 py-1.5 rounded text-xs font-bold ${selectedMode === 'rapid' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>Rapid</button>
                      </div>
                      <button onClick={() => onNext(model, selectedMode || 'architect', activeFeatures)} disabled={!selectedMode} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                          Confirm Scope <ArrowRight size={14}/>
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  {Object.entries(groups).map(([category, feats]) => (
                      <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                              <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wide">{category}</h4>
                              <button onClick={() => handleToggleCategory(category)} className="text-xs text-blue-600 font-bold hover:underline">Toggle All</button>
                          </div>
                          <div className="divide-y divide-gray-100">
                              {feats.map(f => (
                                  <div key={f.id} className={`p-3 flex items-start gap-3 transition-colors ${f.isSelected ? 'bg-white' : 'bg-gray-50/50 opacity-60'}`}>
                                      <button onClick={() => handleToggleFeature(f.id)} className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${f.isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'}`}>
                                          {f.isSelected && <CheckCircle2 size={12} />}
                                      </button>
                                      <div>
                                          <div className="font-bold text-sm text-gray-800">{f.name}</div>
                                          <div className="text-xs text-gray-500">{f.description}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="flex h-full gap-6">
      <DeleteConfirmationModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        description="Are you sure you want to delete this item? This may affect downstream artifacts."
      />

      {/* Left Stepper */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm h-full">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Target size={16} className="text-blue-600" /> Strategy Hub
              </h2>
          </div>
          <div className="flex-1 py-4 space-y-1 overflow-y-auto">
              {[
                  { id: 'inputs', label: '1. Inputs', icon: UploadCloud, count: sources.length },
                  { id: 'strategy', label: '2. Strategy & Risk', icon: BrainCircuit, count: insights.length },
                  { id: 'personas', label: '3. User Personas', icon: Users, count: userPersonas.length },
                  { id: 'brd', label: '4. Master BRD', icon: BookOpen, count: masterBrd.length },
                  { id: 'apps', label: '5. App Definitions', icon: AppWindow, count: identifiedApps.length },
                  { id: 'prd', label: '6. App Specs', icon: Layers, count: prdSections.length },
                  { id: 'scope', label: '7. Scope Matrix', icon: ListTodo, count: activeFeatures.length }
              ].map((step) => {
                  const isActive = activeStep === step.id;
                  const Icon = step.icon;
                  return (
                      <button 
                        key={step.id} 
                        onClick={() => setActiveStep(step.id as StrategyStep)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between border-l-4 transition-all ${isActive ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                      >
                          <div className="flex items-center gap-3">
                              <Icon size={16} />
                              <span className="text-sm font-medium">{step.label}</span>
                          </div>
                          {step.count > 0 && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{step.count}</span>}
                      </button>
                  );
              })}
          </div>
          <div className="p-4 border-t border-gray-100 flex-shrink-0">
              <div className="text-xs text-gray-400 mb-2">Model Config</div>
              <ModelSelector value={model} onChange={setModel} disabled={isLoading || isProcessing} />
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
              <div>
                  <h2 className="text-xl font-bold text-gray-800 capitalize">{activeStep.replace('-', ' ')}</h2>
                  <p className="text-sm text-gray-500">
                      {activeStep === 'inputs' && "Gather raw requirements from briefs, transcripts, and notes."}
                      {activeStep === 'strategy' && "Identify strategic conflicts and define resolutions."}
                      {activeStep === 'personas' && "Define key user roles, goals, and frustrations."}
                      {activeStep === 'brd' && "Define the high-level business goals and constraints."}
                      {activeStep === 'apps' && "Identify the distinct applications in this ecosystem."}
                      {activeStep === 'prd' && "Generate specific requirements for each application."}
                      {activeStep === 'scope' && "Finalize features and group them into Epics."}
                  </p>
              </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden p-6 relative">
              {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                      <RefreshCw className="animate-spin text-blue-600 mb-4" size={32} />
                      <p className="text-gray-600 font-bold">AI Processing...</p>
                  </div>
              )}
              
              {activeStep === 'inputs' && renderInputs()}
              {activeStep === 'strategy' && renderStrategy()}
              {activeStep === 'personas' && renderPersonas()}
              {activeStep === 'brd' && renderMasterBRD()}
              {activeStep === 'apps' && renderAppSelection()}
              {activeStep === 'prd' && renderAppPRDs()}
              {activeStep === 'scope' && renderScope()}
          </div>
      </div>
    </div>
  );
};
