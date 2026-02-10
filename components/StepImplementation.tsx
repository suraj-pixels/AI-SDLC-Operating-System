
import React, { useState } from 'react';
import { ScreenItem, CodeArtifact } from '../types';
import { ModelSelector, GEMINI_PRO } from './ModelSelector';
import * as geminiService from '../services/geminiService';
import { Code, Play, Check, Download, Layers, FileCode } from 'lucide-react';

interface StepImplementationProps {
  screens: ScreenItem[];
  onUpdateScreen: (screen: ScreenItem) => void;
  isLoading: boolean;
}

export const StepImplementation: React.FC<StepImplementationProps> = ({ screens, onUpdateScreen, isLoading }) => {
  const [model, setModel] = useState(GEMINI_PRO);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const designedScreens = screens.filter(s => s.status === 'designed' && s.designCode);
  const activeScreen = designedScreens.find(s => s.id === selectedScreenId);

  const handleGenerateCode = async () => {
    if (!activeScreen || !activeScreen.designCode) return;
    
    setIsGenerating(true);
    try {
        const artifact = await geminiService.generateReactComponent(
            activeScreen.designCode, 
            activeScreen.name, 
            model
        );
        onUpdateScreen({ ...activeScreen, generatedComponent: artifact });
    } catch (e) {
        console.error(e);
        alert("Failed to generate code.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopyCode = (code: string) => {
      navigator.clipboard.writeText(code);
      // alert or toast
  };

  return (
    <div className="flex h-full gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Layers size={16} /> Components
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {designedScreens.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelectedScreenId(s.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 mb-1 ${selectedScreenId === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <FileCode size={14} className={s.generatedComponent ? "text-green-500" : "text-gray-400"} />
                        <span className="truncate">{s.name}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            {activeScreen ? (
                <>
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="font-bold text-lg text-gray-800">{activeScreen.name}.tsx</h2>
                            <p className="text-xs text-gray-500">React Component Implementation</p>
                        </div>
                        <div className="flex gap-2">
                            <ModelSelector value={model} onChange={setModel} disabled={isGenerating} />
                            <button 
                                onClick={handleGenerateCode}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <Play size={16} />}
                                {activeScreen.generatedComponent ? 'Regenerate Code' : 'Generate Code'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-[#1e1e1e] overflow-auto relative">
                        {activeScreen.generatedComponent ? (
                            <pre className="p-6 text-sm font-mono text-blue-300 leading-relaxed">
                                {activeScreen.generatedComponent.content}
                            </pre>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <Code size={48} className="mb-4 opacity-50" />
                                <p>No implementation code generated yet.</p>
                                <p className="text-xs">Click "Generate Code" to convert the visual design into React.</p>
                            </div>
                        )}
                        
                        {activeScreen.generatedComponent && (
                            <button 
                                onClick={() => handleCopyCode(activeScreen.generatedComponent!.content)}
                                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                title="Copy to Clipboard"
                            >
                                <Download size={16} />
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                    <p>Select a screen to view implementation.</p>
                </div>
            )}
        </div>
    </div>
  );
};
