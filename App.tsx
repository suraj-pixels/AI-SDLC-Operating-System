
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { StepIntake } from './components/StepIntake';
import { StepArchitecture } from './components/StepArchitecture'; 
import { StepDataArchitecture } from './components/StepDataArchitecture'; // NEW
import { StepDesignSystem } from './components/StepDesignSystem'; 
import { StepPromptReview } from './components/StepPromptReview';
import { StepDesignView } from './components/StepDesignView'; 
import { StepDesignMap } from './components/StepDesignMap'; 
import { StepAISystem } from './components/StepAISystem'; 
import { StepImplementation } from './components/StepImplementation'; 
import { StepEngineeringOps } from './components/StepEngineeringOps'; 
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { DemoSelectorModal } from './components/DemoSelectorModal'; 
import { AppStep, AppWorkspace, ProjectState, SavedProjectState, RequirementSource, PRDSection, ProjectInsight, ProjectModule, ScreenItem, ProjectConfig, DesignSystemState, ProjectMode, ScopedFeature, ScopeDraft, DesignAnalysisResult, AISystemState, SiteMapNode, UserFlowGraph, FlowJourney, UserPersona, DataModel, APIEndpoint } from './types';
import { INITIAL_PRD_SECTIONS, DEFAULT_PROJECT_CONFIG } from './constants';
import * as geminiService from './services/geminiService';
import { DEMO_SCENARIOS } from './demoData';

const INITIAL_STATE: ProjectState = {
  config: DEFAULT_PROJECT_CONFIG,
  masterBrd: [],
  prdSections: INITIAL_PRD_SECTIONS,
  requirementSources: [],
  projectInsights: [],
  userPersonas: [], 
  flowData: [],
  modules: [],
  siteMap: [], 
  userFlows: [], 
  dataModel: { entities: [], relationships: [] }, // NEW
  apiSpecs: [], // NEW
  selectedScreenId: null,
  scopeDrafts: [], 
  designSystem: {
    colors: [],
    typography: [],
    components: [],
    guidelines: "Use a clean, modern aesthetic."
  },
  aiSystem: {
    guidelines: []
  },
  codeArtifacts: [],
  testSuites: []
};

const App: React.FC = () => {
  const [currentWorkspace, setCurrentWorkspace] = useState<AppWorkspace>(AppWorkspace.DASHBOARD);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.INTAKE);
  const [designTab, setDesignTab] = useState<'system' | 'studio'>('system');
  const [state, setState] = useState<ProjectState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from local storage on startup
  useEffect(() => {
    const saved = localStorage.getItem('p6_project_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.projectState) {
          handleResumeState(parsed);
        }
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save state to local storage on changes
  useEffect(() => {
    if (!isInitialized) return;
    
    const timeoutId = setTimeout(() => {
      const savedState: SavedProjectState = {
        version: 10, 
        workspace: currentWorkspace,
        step: currentStep,
        projectState: state,
        timestamp: Date.now()
      };
      localStorage.setItem('p6_project_state', JSON.stringify(savedState));
    }, 1000); // Debounce save

    return () => clearTimeout(timeoutId);
  }, [state, currentWorkspace, currentStep, isInitialized]);

  const findScreenById = (screenId: string): ScreenItem | undefined => {
    for (const mod of state.modules) {
      const screen = mod.screens.find(s => s.id === screenId);
      if (screen) return screen;
    }
    return undefined;
  };

  const findModuleByScreenId = (screenId: string): ProjectModule | undefined => {
    return state.modules.find(mod => mod.screens.some(s => s.id === screenId));
  };

  const handleWorkspaceChange = (workspace: AppWorkspace) => {
    setCurrentWorkspace(workspace);
  };

  const handleUpdateConfig = (newConfig: ProjectConfig) => {
    setState(prev => ({ ...prev, config: newConfig }));
  };

  const handleUpdateSources = (sources: RequirementSource[]) => {
    setState(prev => ({ ...prev, requirementSources: sources }));
  };

  const handleUpdateInsights = (insights: ProjectInsight[]) => {
    setState(prev => ({ ...prev, projectInsights: insights }));
  };

  const handleUpdatePersonas = (personas: UserPersona[]) => {
    setState(prev => ({ ...prev, userPersonas: personas }));
  };

  const handleUpdatePRD = (sections: PRDSection[]) => {
    setState(prev => ({ ...prev, prdSections: sections }));
  };

  const handleUpdateMasterBrd = (sections: PRDSection[]) => {
    setState(prev => ({ ...prev, masterBrd: sections }));
  };

  const handleCreateDraft = (draft: ScopeDraft) => {
    setState(prev => ({
      ...prev,
      scopeDrafts: [draft, ...prev.scopeDrafts] 
    }));
  };

  const handleUpdateDraft = (updatedDraft: ScopeDraft) => {
    setState(prev => ({
      ...prev,
      scopeDrafts: prev.scopeDrafts.map(d => d.id === updatedDraft.id ? updatedDraft : d)
    }));
  };

  const handleDraftMode = (mode: ProjectMode) => {
    setState(prev => ({ ...prev, mode }));
  };

  const handleTransitionToArchitecture = (model: string, mode: ProjectMode, scope?: ScopedFeature[]) => {
      setState(prev => ({ ...prev, mode, scope }));
      setCurrentWorkspace(AppWorkspace.ARCHITECTURE);
  };

  // --- NEW ARCHITECTURE HANDLERS ---

  const handleUpdateSiteMap = (siteMap: SiteMapNode[]) => {
      // Deep Flattening Logic for Enterprise Apps
      const derivedModules: ProjectModule[] = [];

      const flattenScreens = (node: SiteMapNode, path: string[], modId: string): ScreenItem[] => {
          let screens: ScreenItem[] = [];
          
          if (node.type === 'page') {
              // Try to find existing screen to preserve state
              let existingScreen: ScreenItem | undefined;
              for(const m of state.modules) {
                  const found = m.screens.find(s => s.id === node.id || s.name === node.name);
                  if(found) { existingScreen = found; break; }
              }

              if (existingScreen) {
                  screens.push({
                      ...existingScreen,
                      moduleId: modId,
                      // Append path context if deep (e.g. "Users > Roles > Edit Role")
                      name: path.length > 0 ? `${path[path.length-1]} › ${node.name}` : node.name,
                      description: node.description
                  });
              } else {
                  screens.push({
                      id: node.id,
                      moduleId: modId,
                      name: path.length > 0 ? `${path[path.length-1]} › ${node.name}` : node.name,
                      description: node.description,
                      status: 'pending'
                  });
              }
          }

          if (node.children) {
              node.children.forEach(child => {
                  const newPath = node.type === 'section' ? [...path, node.name] : path;
                  screens = [...screens, ...flattenScreens(child, newPath, modId)];
              });
          }
          return screens;
      };

      // Top level processing
      siteMap.forEach(node => {
          if (node.type === 'root') return; 
          const existingMod = state.modules.find(m => m.id === node.id || m.title === node.name);
          const modId = existingMod ? existingMod.id : node.id;
          let moduleScreens: ScreenItem[] = [];
          
          if (node.children) {
              node.children.forEach(child => {
                  moduleScreens = [...moduleScreens, ...flattenScreens(child, [], modId)];
              });
          } else if (node.type === 'page') {
              moduleScreens = flattenScreens(node, [], modId);
          }

          if (moduleScreens.length > 0 || node.type === 'section') {
              derivedModules.push({
                  id: modId,
                  title: node.name,
                  description: node.description,
                  screens: moduleScreens,
                  isExpanded: true,
                  guidelines: existingMod?.guidelines
              });
          }
      });

      setState(prev => ({ ...prev, siteMap, modules: derivedModules }));
  };

  const handleUpdateUserFlows = (userFlows: UserFlowGraph[]) => {
      const derivedFlows: FlowJourney[] = userFlows.map(f => ({
          title: f.title,
          steps: f.nodes.map(n => ({ description: `${n.label} (${n.type})` }))
      }));

      setState(prev => ({ ...prev, userFlows, flowData: derivedFlows }));
  };

  const handleCompleteArchitecture = () => {
      setCurrentWorkspace(AppWorkspace.DATA_API); // Go to Data & API first now
  };

  const handleNavigateToModule = (nodeId: string, type: 'section' | 'page') => {
      setCurrentWorkspace(AppWorkspace.DESIGN);
      setDesignTab('studio');
      if (type === 'page') {
          let targetId = nodeId;
          const screenExists = findScreenById(targetId);
          if (screenExists) {
             handleSelectScreen(targetId, 'gemini-3-flash-preview');
          } else {
             setState(prev => ({ ...prev, selectedScreenId: null }));
          }
      } else {
          setState(prev => ({ ...prev, selectedScreenId: null }));
      }
  };

  // --- DATA & API HANDLERS ---
  const handleUpdateDataModel = (dataModel: DataModel) => {
      setState(prev => ({ ...prev, dataModel }));
  };

  const handleUpdateAPISpecs = (apiSpecs: APIEndpoint[]) => {
      setState(prev => ({ ...prev, apiSpecs }));
  };

  // ---------------------------------

  const handleUpdateModule = (updatedModule: ProjectModule) => {
    setState(prev => ({
      ...prev,
      modules: prev.modules.map(m => m.id === updatedModule.id ? updatedModule : m)
    }));
  };

  const handleUpdateScreen = (updatedScreen: ScreenItem) => {
    setState(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id === updatedScreen.moduleId) {
          return {
            ...m,
            screens: m.screens.map(s => s.id === updatedScreen.id ? updatedScreen : s)
          };
        }
        return m;
      })
    }));
  };

  const handleGenerateBaselineDS = async (model: string) => {
     setLoading(true);
     try {
       const baseline = await geminiService.generateBaselineDesignSystem(state.config, model);
       setState(prev => ({
         ...prev,
         designSystem: baseline
       }));
     } catch (e) {
       console.error(e);
       alert("Failed to generate Design System baseline.");
     } finally {
       setLoading(false);
     }
  };

  const handleUpdateDesignSystem = (ds: DesignSystemState) => {
    setState(prev => ({ ...prev, designSystem: ds }));
  };

  const handleUpdateAISystem = (aiSystem: AISystemState) => {
    setState(prev => ({ ...prev, aiSystem }));
  };

  const handleDesignAdaptation = (analysis: DesignAnalysisResult) => {
      if (analysis.newComponents && analysis.newComponents.length > 0) {
          setState(prev => ({
              ...prev,
              designSystem: {
                  ...prev.designSystem,
                  components: [...prev.designSystem.components, ...analysis.newComponents]
              }
          }));
      }

      if (analysis.newColors && analysis.newColors.length > 0) {
          setState(prev => {
              const currentColors = new Set(prev.designSystem.colors.map(c => c.name.toLowerCase()));
              const uniqueNewColors = analysis.newColors.filter(c => !currentColors.has(c.name.toLowerCase()));
              
              if (uniqueNewColors.length === 0) return prev;

              return {
                  ...prev,
                  designSystem: {
                      ...prev.designSystem,
                      colors: [...prev.designSystem.colors, ...uniqueNewColors]
                  }
              };
          });
      }
  };

  const handleSelectScreen = async (screenId: string, model: string) => {
    const screen = findScreenById(screenId);
    if (!screen) return;

    setState(prev => ({ ...prev, selectedScreenId: screenId }));
    setCurrentWorkspace(AppWorkspace.DESIGN);
    setDesignTab('studio');
    setCurrentStep(screen.designCode ? AppStep.DESIGN : AppStep.PROMPT);
  };
  
  const handleSelectScreenFromMap = (screenId: string) => {
      handleSelectScreen(screenId, 'gemini-3-flash-preview');
  };

  const handleGenerateDesign = async (model: string) => {
    if (!state.selectedScreenId) return;
    setLoading(true);
    try {
      const selectedScreen = findScreenById(state.selectedScreenId);
      if (!selectedScreen || !selectedScreen.designPrompt) {
          console.error("No prompt available");
          alert("Please generate the prompt blueprint first.");
          setLoading(false);
          return;
      }
      const dsContext = geminiService.formatDesignSystemToContext(state.designSystem);
      const code = await geminiService.generateDesignCode(selectedScreen.designPrompt, dsContext, state.config, model);
      setState(prev => {
          const modIndex = prev.modules.findIndex(m => m.screens.some(s => s.id === prev.selectedScreenId));
          if (modIndex === -1) return prev;
          const newModules = [...prev.modules];
          const screenIndex = newModules[modIndex].screens.findIndex(s => s.id === prev.selectedScreenId);
          const oldScreen = newModules[modIndex].screens[screenIndex];
          const newVersion = {
             id: crypto.randomUUID(),
             timestamp: Date.now(),
             code: code,
             prompt: "Initial Generation",
             aiComment: "Generated from Prompt Blueprint."
          };
          newModules[modIndex].screens[screenIndex] = {
             ...oldScreen,
             designCode: code,
             status: 'designed',
             history: [newVersion] 
          };
          return { ...prev, modules: newModules };
      });
      setCurrentStep(AppStep.DESIGN);
      const analysis = await geminiService.analyzeDesignAdaptation(code, state.designSystem);
      handleDesignAdaptation(analysis);
    } catch (e) {
      console.error(e);
      alert("Design generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDemoModal = () => {
     setIsDemoModalOpen(true);
  };

  const handleLoadScenario = (key: string) => {
      const scenario = DEMO_SCENARIOS[key];
      if (!scenario) return;

      setState(prev => ({
          ...prev,
          config: scenario.config,
          requirementSources: scenario.sources,
          projectInsights: scenario.insights,
          masterBrd: scenario.masterBrd || [], // Load Master BRD
          prdSections: scenario.prd,
          flowData: scenario.flow,
          modules: scenario.modules,
          designSystem: scenario.designSystem,
          aiSystem: scenario.aiSystem,
          selectedScreenId: null,
          scopeDrafts: scenario.scopeDrafts || [],
          userPersonas: scenario.userPersonas || [],
          siteMap: scenario.siteMap || [],
          userFlows: scenario.userFlows || [],
          dataModel: scenario.dataModel || { entities: [], relationships: [] }, // Load Data Model
          apiSpecs: scenario.apiSpecs || [] // Load API Specs
      }));
      setCurrentWorkspace(AppWorkspace.STRATEGY);
      setIsDemoModalOpen(false);
  };

  const handleCopyState = () => {
    const savedState: SavedProjectState = {
      version: 10, 
      workspace: currentWorkspace,
      step: currentStep,
      projectState: state,
      timestamp: Date.now()
    };
    const jsonString = JSON.stringify(savedState, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      console.log('State copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy state', err);
    });
  };

  const handleResumeState = (savedState: SavedProjectState) => {
    let cleanState: any = savedState.projectState;
    // Backwards compatibility checks
    if (!cleanState.siteMap) cleanState.siteMap = [];
    if (!cleanState.userFlows) cleanState.userFlows = [];
    if (!cleanState.userPersonas) cleanState.userPersonas = [];
    if (!cleanState.dataModel) cleanState.dataModel = { entities: [], relationships: [] };
    if (!cleanState.apiSpecs) cleanState.apiSpecs = [];
    if (!cleanState.masterBrd) cleanState.masterBrd = [];

    setState(cleanState as ProjectState);
    if (savedState.workspace) {
        setCurrentWorkspace(savedState.workspace);
    } else {
        setCurrentWorkspace(AppWorkspace.STRATEGY);
    }
    setCurrentStep(savedState.step || AppStep.INTAKE);
  };

  const handleGlobalImport = (jsonString: string) => {
    try {
        const parsed = JSON.parse(jsonString);
        if (parsed.projectState) {
            handleResumeState(parsed);
        } else {
            alert('Invalid state file format.');
        }
    } catch (e) {
        alert('Invalid JSON.');
    }
  };

  const renderWorkspaceContent = () => {
    switch (currentWorkspace) {
        case AppWorkspace.DASHBOARD:
            return (
                <Dashboard projectState={state} onNavigate={setCurrentWorkspace} />
            );

        case AppWorkspace.STRATEGY:
            return (
                <StepIntake 
                    masterBrd={state.masterBrd}
                    prdSections={state.prdSections}
                    sources={state.requirementSources}
                    insights={state.projectInsights}
                    scopeDrafts={state.scopeDrafts} 
                    userPersonas={state.userPersonas}
                    savedMode={state.mode}
                    onMasterBrdChange={handleUpdateMasterBrd}
                    onPRDSectionsChange={handleUpdatePRD}
                    onSourcesChange={handleUpdateSources}
                    onInsightsChange={handleUpdateInsights}
                    onPersonasChange={handleUpdatePersonas}
                    onCreateDraft={handleCreateDraft}
                    onUpdateDraft={handleUpdateDraft}
                    onDraftModeChange={handleDraftMode}
                    onNext={handleTransitionToArchitecture}
                    onResume={handleResumeState}
                    isLoading={loading}
                />
            );

        case AppWorkspace.AI_SYSTEM:
            return (
                <StepAISystem 
                    aiSystem={state.aiSystem}
                    prdSections={state.prdSections}
                    onUpdateSystem={handleUpdateAISystem}
                    isLoading={loading}
                />
            );

        case AppWorkspace.ARCHITECTURE:
            return (
                <StepArchitecture 
                    siteMap={state.siteMap}
                    userFlows={state.userFlows}
                    userPersonas={state.userPersonas}
                    requirements={geminiService.formatPRDToString(state.prdSections)}
                    onUpdateSiteMap={handleUpdateSiteMap}
                    onUpdateUserFlows={handleUpdateUserFlows}
                    onComplete={handleCompleteArchitecture}
                    onNavigateToModule={handleNavigateToModule}
                    isLoading={loading}
                />
            );

        case AppWorkspace.DATA_API:
            return (
                <StepDataArchitecture 
                    prdSections={state.prdSections}
                    userFlows={state.userFlows}
                    dataModel={state.dataModel}
                    apiSpecs={state.apiSpecs}
                    onUpdateDataModel={handleUpdateDataModel}
                    onUpdateAPISpecs={handleUpdateAPISpecs}
                    isLoading={loading}
                />
            );

        case AppWorkspace.DESIGN:
            return (
                <div className="flex flex-col h-full space-y-4">
                    <div className="flex bg-white rounded-lg p-1 border border-gray-200 self-start">
                        <button 
                            onClick={() => setDesignTab('system')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${designTab === 'system' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <div className="w-4 h-4" /> Design System
                        </button>
                        <button 
                            onClick={() => setDesignTab('studio')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${designTab === 'studio' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <div className="w-4 h-4" /> Design Studio
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {designTab === 'system' ? (
                             <StepDesignSystem
                                designSystem={state.designSystem}
                                config={state.config}
                                onUpdateSystem={handleUpdateDesignSystem}
                                onGenerateBaseline={handleGenerateBaselineDS}
                                onNext={() => setDesignTab('studio')}
                                isLoading={loading}
                            />
                        ) : (
                            state.selectedScreenId ? (
                                currentStep === AppStep.DESIGN ? (
                                    <StepDesignView 
                                        screen={findScreenById(state.selectedScreenId)!}
                                        allModules={state.modules} 
                                        flowData={state.flowData} 
                                        config={state.config}
                                        designSystem={state.designSystem}
                                        aiSystem={state.aiSystem} 
                                        userPersonas={state.userPersonas}
                                        onBack={() => {
                                            setState(prev => ({ ...prev, selectedScreenId: null }));
                                        }}
                                        onUpdateScreen={handleUpdateScreen}
                                        onSwitchScreen={(id) => handleSelectScreenFromMap(id)} 
                                        onDesignAction={handleDesignAdaptation} 
                                    />
                                ) : (
                                    <StepPromptReview 
                                        screen={findScreenById(state.selectedScreenId)!}
                                        module={findModuleByScreenId(state.selectedScreenId)}
                                        allModules={state.modules} 
                                        flowData={state.flowData} 
                                        projectContext={geminiService.formatPRDToString(state.prdSections)}
                                        designSystem={state.designSystem}
                                        aiSystem={state.aiSystem} 
                                        config={state.config}
                                        onUpdateScreen={handleUpdateScreen}
                                        onGenerate={handleGenerateDesign}
                                        isLoading={loading}
                                        onBack={() => {
                                            setState(prev => ({ ...prev, selectedScreenId: null }));
                                        }}
                                    />
                                )
                            ) : (
                                <StepDesignMap 
                                    modules={state.modules}
                                    onSelectScreen={handleSelectScreenFromMap}
                                    onGoToArchitecture={() => setCurrentWorkspace(AppWorkspace.ARCHITECTURE)}
                                />
                            )
                        )}
                    </div>
                </div>
            );

        case AppWorkspace.IMPLEMENTATION:
            return (
                <StepImplementation 
                    screens={state.modules.flatMap(m => m.screens)}
                    onUpdateScreen={handleUpdateScreen}
                    isLoading={loading}
                />
            );

        case AppWorkspace.TESTING:
            return (
                <StepEngineeringOps 
                    type="testing" 
                    flowData={state.flowData} 
                    config={state.config} 
                    isLoading={loading} 
                />
            );

        case AppWorkspace.DEPLOYMENT:
            return (
                <StepEngineeringOps 
                    type="deployment" 
                    flowData={state.flowData} 
                    config={state.config} 
                    isLoading={loading} 
                />
            );

        case AppWorkspace.MAINTENANCE:
            return (
                <StepEngineeringOps 
                    type="maintenance" 
                    flowData={state.flowData} 
                    config={state.config} 
                    isLoading={loading} 
                />
            );
            
        default:
            return <div>Workspace Locked</div>;
    }
  };

  return (
    <>
        <Layout 
          currentWorkspace={currentWorkspace}
          currentStep={currentStep}
          projectState={state}
          onWorkspaceChange={handleWorkspaceChange} 
          onCopyState={handleCopyState}
          onImportState={handleGlobalImport}
          onLoadDemo={handleOpenDemoModal} 
          onOpenSettings={() => setIsSettingsOpen(true)}
        >
          {renderWorkspaceContent()}
        </Layout>
        
        <ProjectSettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            config={state.config}
            onSave={handleUpdateConfig}
        />

        <DemoSelectorModal 
            isOpen={isDemoModalOpen}
            onClose={() => setIsDemoModalOpen(false)}
            scenarios={DEMO_SCENARIOS}
            onSelect={handleLoadScenario}
        />
    </>
  );
};

export default App;
