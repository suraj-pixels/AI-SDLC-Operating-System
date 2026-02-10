
import React, { useState, useEffect, useRef } from 'react';
import { DataModel, APIEndpoint, DataEntity, PRDSection, UserFlowGraph } from '../types';
import { ModelSelector, GEMINI_PRO } from './ModelSelector';
import * as geminiService from '../services/geminiService';
import { 
  Database, 
  Server, 
  RefreshCw, 
  Wand2, 
  Code, 
  FileJson, 
  Table, 
  Link, 
  ArrowRight,
  Terminal,
  Download,
  Search,
  Key
} from 'lucide-react';

declare global {
  interface Window {
    mermaid: any;
  }
}

interface StepDataArchitectureProps {
  prdSections: PRDSection[];
  userFlows: UserFlowGraph[];
  dataModel: DataModel | undefined;
  apiSpecs: APIEndpoint[] | undefined;
  onUpdateDataModel: (model: DataModel) => void;
  onUpdateAPISpecs: (specs: APIEndpoint[]) => void;
  isLoading: boolean;
}

export const StepDataArchitecture: React.FC<StepDataArchitectureProps> = ({
  prdSections,
  userFlows,
  dataModel,
  apiSpecs,
  onUpdateDataModel,
  onUpdateAPISpecs,
  isLoading
}) => {
  const [model, setModel] = useState(GEMINI_PRO);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diagram' | 'schema'>('diagram');
  const [schemaFormat, setSchemaFormat] = useState<'prisma' | 'sql' | 'typescript'>('prisma');
  const [generatedSchema, setGeneratedSchema] = useState('');
  
  const mermaidRef = useRef<HTMLDivElement>(null);

  const hasData = dataModel && dataModel.entities.length > 0;

  // Initialize mermaid
  useEffect(() => {
    if (window.mermaid) {
      window.mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
    }
  }, []);

  // Generate Architecture
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        const result = await geminiService.generateDataArchitecture(prdSections, userFlows, model);
        onUpdateDataModel(result.dataModel);
        onUpdateAPISpecs(result.apiSpecs);
    } catch (e) {
        console.error(e);
        alert("Failed to generate data architecture.");
    } finally {
        setIsGenerating(false);
    }
  };

  // Generate Code (Prisma/SQL)
  const handleGenerateCode = async () => {
      if (!dataModel) return;
      setIsGenerating(true);
      try {
          const code = await geminiService.generateSchemaCode(dataModel, schemaFormat, model);
          setGeneratedSchema(code);
      } catch(e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  // Render Mermaid ERD
  useEffect(() => {
      if (hasData && activeTab === 'diagram' && mermaidRef.current) {
          const renderChart = async () => {
              let graph = 'erDiagram\n';
              
              // Entities
              dataModel?.entities.forEach(entity => {
                  const safeName = entity.name.replace(/\s+/g, '_');
                  graph += `  ${safeName} {\n`;
                  entity.fields.forEach(f => {
                      graph += `    ${f.type} ${f.name} ${f.isUnique ? 'UK' : ''}\n`;
                  });
                  graph += `  }\n`;
              });

              // Relationships
              dataModel?.relationships.forEach(rel => {
                  const source = dataModel.entities.find(e => e.id === rel.sourceEntityId)?.name.replace(/\s+/g, '_');
                  const target = dataModel.entities.find(e => e.id === rel.targetEntityId)?.name.replace(/\s+/g, '_');
                  
                  if (source && target) {
                      let connector = '||--||';
                      if (rel.type === 'one-to-many') connector = '||--o{';
                      if (rel.type === 'many-to-many') connector = '}o--o{';
                      
                      graph += `  ${source} ${connector} ${target} : "${rel.label}"\n`;
                  }
              });

              if (mermaidRef.current) {
                  mermaidRef.current.innerHTML = '';
                  try {
                      const { svg } = await window.mermaid.render('erd-chart', graph);
                      mermaidRef.current.innerHTML = svg;
                  } catch (e) {
                      console.error("Mermaid error:", e);
                      mermaidRef.current.innerHTML = '<div class="text-red-500 p-4">Error rendering diagram. Check console.</div>';
                  }
              }
          };
          renderChart();
      }
  }, [dataModel, activeTab, hasData]);

  // Derived Data
  const selectedEntity = dataModel?.entities.find(e => e.id === selectedEntityId);
  const entityEndpoints = apiSpecs?.filter(ep => ep.entityId === selectedEntityId) || [];

  if (!hasData && !isLoading) {
      return (
          <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Database size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Data & API Architecture</h3>
              <p className="text-gray-500 text-sm max-w-md text-center mb-6">
                  Design the "Brain" of your application. AI will analyze your PRD and User Flows to generate the Database Schema (ERD) and API Endpoints automatically.
              </p>
              <div className="flex gap-4 items-center">
                  <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
                  <button 
                    onClick={handleGenerate}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md flex items-center gap-2"
                  >
                      <Wand2 size={18} /> Generate Data Model
                  </button>
              </div>
          </div>
      );
  }

  if (isLoading && !hasData) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <RefreshCw size={32} className="animate-spin text-blue-600 mb-4" />
              <p className="font-medium">Architecting Data Model & API Specs...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg"><Server size={20} /></div>
                <div>
                    <h3 className="font-bold text-gray-800">Data & Schema</h3>
                    <p className="text-xs text-gray-500">{dataModel?.entities.length} Entities • {apiSpecs?.length} Endpoints</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('diagram')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${activeTab === 'diagram' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}><Link size={14}/> ER Diagram</button>
                    <button onClick={() => setActiveTab('schema')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${activeTab === 'schema' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}><Code size={14}/> Schema Code</button>
                </div>
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                <button onClick={handleGenerate} disabled={isGenerating} className="text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-2 rounded-lg font-bold flex items-center gap-2">
                    <RefreshCw size={14} className={isGenerating ? "animate-spin" : ""} /> Regenerate
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 overflow-hidden">
            
            {/* Left: Entities List */}
            <div className="w-64 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-100 font-bold text-xs text-gray-500 uppercase flex items-center gap-2">
                    <Table size={14} /> Data Entities
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {dataModel?.entities.map(entity => (
                        <button
                            key={entity.id}
                            onClick={() => setSelectedEntityId(entity.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-colors ${selectedEntityId === entity.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <span>{entity.name}</span>
                            {selectedEntityId === entity.id && <ArrowRight size={14} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Center: Visualizer or Code */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col relative">
                {activeTab === 'diagram' ? (
                    <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-4">
                        <div ref={mermaidRef} className="w-full h-full flex justify-center"></div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e]">
                        <div className="p-2 border-b border-white/10 flex items-center justify-between">
                            <div className="flex gap-2">
                                <button onClick={() => setSchemaFormat('prisma')} className={`px-3 py-1 rounded text-xs font-mono ${schemaFormat === 'prisma' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>schema.prisma</button>
                                <button onClick={() => setSchemaFormat('sql')} className={`px-3 py-1 rounded text-xs font-mono ${schemaFormat === 'sql' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>init.sql</button>
                                <button onClick={() => setSchemaFormat('typescript')} className={`px-3 py-1 rounded text-xs font-mono ${schemaFormat === 'typescript' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>types.ts</button>
                            </div>
                            <button onClick={handleGenerateCode} disabled={isGenerating} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded flex items-center gap-1">
                                <Terminal size={12} /> {generatedSchema ? 'Regenerate' : 'Generate Code'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {generatedSchema ? (
                                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">{generatedSchema}</pre>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                                    Click "Generate Code" to convert your data model into {schemaFormat}.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Inspector */}
            <div className="w-80 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
                {selectedEntity ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-gray-100 bg-indigo-50/30">
                            <h4 className="font-bold text-gray-800 text-lg">{selectedEntity.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{selectedEntity.description}</p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto">
                            {/* Fields */}
                            <div className="p-4 border-b border-gray-100">
                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Schema Fields</h5>
                                <div className="space-y-2">
                                    {selectedEntity.fields.map((field, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                {field.isUnique && <Key size={12} className="text-amber-500" />}
                                                <span className="font-mono text-gray-700">{field.name}</span>
                                                {field.isRequired && <span className="text-red-500">*</span>}
                                            </div>
                                            <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">{field.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Endpoints */}
                            <div className="p-4">
                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">API Endpoints</h5>
                                {entityEndpoints.length > 0 ? (
                                    <div className="space-y-2">
                                        {entityEndpoints.map(ep => (
                                            <div key={ep.id} className="border border-gray-200 rounded-lg p-2 hover:border-indigo-200 transition-colors cursor-help group relative">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                        ep.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                                        ep.method === 'POST' ? 'bg-green-100 text-green-700' :
                                                        ep.method === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                    }`}>{ep.method}</span>
                                                    <span className="font-mono text-xs text-gray-600 truncate">{ep.path}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 truncate">{ep.summary}</p>
                                                
                                                {/* Tooltip for body */}
                                                <div className="hidden group-hover:block absolute right-full top-0 mr-2 w-64 bg-slate-900 text-white p-3 rounded-lg shadow-xl z-50 text-xs">
                                                    <div className="font-bold mb-1 border-b border-white/20 pb-1">Spec Preview</div>
                                                    <div className="mb-2 opacity-80">{ep.summary}</div>
                                                    {ep.requestBody && (
                                                        <div className="mb-2">
                                                            <div className="font-mono text-[10px] text-green-400 mb-0.5">REQ BODY</div>
                                                            <pre className="text-[9px] bg-black/30 p-1 rounded font-mono overflow-hidden">{ep.requestBody}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No specific endpoints.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                        <Search size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">Select an entity to view its fields and API endpoints.</p>
                    </div>
                )}
            </div>

        </div>
    </div>
  );
};
