
import React, { useState } from 'react';
import { CodeArtifact, FlowJourney, ProjectConfig } from '../types';
import { ModelSelector, GEMINI_PRO } from './ModelSelector';
import * as geminiService from '../services/geminiService';
import { TestTube2, Rocket, Wrench, RefreshCw, Terminal, Check, Server } from 'lucide-react';

interface StepEngineeringOpsProps {
  type: 'testing' | 'deployment' | 'maintenance';
  flowData: FlowJourney[];
  config: ProjectConfig;
  isLoading: boolean;
}

export const StepEngineeringOps: React.FC<StepEngineeringOpsProps> = ({ type, flowData, config, isLoading }) => {
  const [model, setModel] = useState(GEMINI_PRO);
  const [artifacts, setArtifacts] = useState<CodeArtifact[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        if (type === 'testing') {
            const tests = await geminiService.generateTestScripts(flowData, model);
            setArtifacts(tests);
        } else if (type === 'deployment') {
            const configs = await geminiService.generateDevOpsConfig(config, model);
            setArtifacts(configs);
        } else {
            // Placeholder for maintenance for now
            setArtifacts([
                { id: '1', name: 'alert-rules.yml', type: 'config', language: 'yaml', content: '# Prometheus Alert Rules\n...', description: 'Alerting rules' }
            ]);
        }
    } catch (e) {
        console.error(e);
        alert("Generation failed.");
    } finally {
        setIsGenerating(false);
    }
  };

  const getHeaderInfo = () => {
      switch(type) {
          case 'testing': return { title: 'QA Automation Suite', icon: TestTube2, desc: 'Generate E2E test scripts based on User Flows.' };
          case 'deployment': return { title: 'DevOps Configuration', icon: Rocket, desc: 'Generate Dockerfiles, CI/CD workflows, and IaC.' };
          case 'maintenance': return { title: 'Site Reliability Engineering', icon: Wrench, desc: 'Configure observability, logging, and alert rules.' };
      }
  };

  const header = getHeaderInfo();

  return (
    <div className="flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <header.icon className="text-blue-600" size={24} /> {header.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{header.desc}</p>
            </div>
            <div className="flex items-center gap-3">
                <ModelSelector value={model} onChange={setModel} disabled={isLoading || isGenerating} />
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                    {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Terminal size={16} />}
                    Generate Artifacts
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4">
            {artifacts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-gray-400">
                    <Server size={48} className="mb-4 opacity-50" />
                    <p>No artifacts generated yet.</p>
                    <p className="text-xs">Click "Generate" to create engineering assets.</p>
                </div>
            ) : (
                artifacts.map(artifact => (
                    <div key={artifact.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-96">
                        <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-mono text-xs font-bold text-gray-700">{artifact.name}</span>
                            <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{artifact.language}</span>
                        </div>
                        <div className="flex-1 bg-[#1e1e1e] overflow-auto p-4">
                            <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">{artifact.content}</pre>
                        </div>
                        <div className="p-3 border-t border-gray-100 text-xs text-gray-500 bg-white">
                            {artifact.description}
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};
