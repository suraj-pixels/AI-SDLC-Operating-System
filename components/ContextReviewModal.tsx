
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Edit2, Layers, Target, Database, BrainCircuit, Sparkles, Bot, ChevronDown, ChevronRight, GitGraph, AlertCircle } from 'lucide-react';

export interface ContextItem {
  id: string;
  layer: 'focus' | 'flow' | 'architecture' | 'foundation' | 'guideline';
  title: string;
  content: string;
  isSelected: boolean;
  isEditable?: boolean;
  relevance?: 'high' | 'medium' | 'low'; // Visual cue for "distance"
  meta?: string; // e.g., "Direct Parent", "Global Rule"
}

interface ContextReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalContext: string) => void;
  title: string;
  description: string;
  items: ContextItem[];
  modelName: string;
}

export const ContextReviewModal: React.FC<ContextReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  items: initialItems,
  modelName
}) => {
  const [items, setItems] = useState<ContextItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Track collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Reset items when modal opens with new props
  useEffect(() => {
    setItems(initialItems);
  }, [isOpen, initialItems]);

  if (!isOpen) return null;

  const toggleSelection = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isSelected: !item.isSelected } : item
    ));
  };

  const handleContentChange = (id: string, newContent: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, content: newContent } : item
    ));
  };

  const handleConfirm = () => {
    // Stitch together the selected context in a structured format for the AI
    const finalContext = items
      .filter(i => i.isSelected)
      .map(i => `
<!-- ${i.layer.toUpperCase()}: ${i.title} -->
${i.content}
`)
      .join('\n');
    
    onConfirm(finalContext);
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getLayerIcon = (layer: string) => {
    switch(layer) {
      case 'focus': return <Target size={16} className="text-red-500" />;
      case 'flow': return <GitGraph size={16} className="text-orange-500" />;
      case 'architecture': return <Layers size={16} className="text-blue-500" />;
      case 'foundation': return <Database size={16} className="text-purple-500" />;
      case 'guideline': return <Bot size={16} className="text-indigo-500" />;
      default: return <BrainCircuit size={16} />;
    }
  };

  const getLayerLabel = (layer: string) => {
    switch(layer) {
      case 'focus': return 'Immediate Task Focus';
      case 'flow': return 'User Journey Context';
      case 'architecture': return 'Structural Relationship';
      case 'foundation': return 'Global Knowledge Base';
      case 'guideline': return 'Active AI Directives';
      default: return 'Context';
    }
  };

  const getRelevanceColor = (relevance?: string) => {
      switch(relevance) {
          case 'high': return 'bg-red-100 text-red-700 border-red-200';
          case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'low': return 'bg-gray-100 text-gray-600 border-gray-200';
          default: return 'bg-gray-50 text-gray-500 border-gray-100';
      }
  };

  // Grouping logic
  const standardItems = items.filter(i => i.layer !== 'guideline');
  const guidelineItems = items.filter(i => i.layer === 'guideline');

  // Sort standard items by layer priority: Focus -> Flow -> Architecture -> Foundation
  const layerPriority = { focus: 0, flow: 1, architecture: 2, foundation: 3, guideline: 4 };
  standardItems.sort((a, b) => layerPriority[a.layer] - layerPriority[b.layer]);

  // Group guidelines by Category prefix
  const groupedGuidelines = guidelineItems.reduce((acc, item) => {
      const match = item.title.match(/^([A-Z]+):/);
      const category = match ? match[1] : 'GENERAL';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
  }, {} as Record<string, ContextItem[]>);

  const renderItem = (item: ContextItem) => {
      const displayTitle = item.layer === 'guideline' && item.title.includes(':') 
        ? item.title.split(':').slice(1).join(':').trim() 
        : item.title;

      const isFocus = item.layer === 'focus';

      return (
        <div 
            key={item.id} 
            className={`border rounded-lg bg-white transition-all duration-200 mb-3 relative overflow-hidden ${
            item.isSelected 
                ? isFocus
                    ? 'border-red-300 shadow-md ring-1 ring-red-100'
                    : 'border-blue-200 shadow-sm'
                : 'border-gray-200 opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
            }`}
        >
            {/* Relevance/Meta Badge Overlay */}
            {item.meta && item.isSelected && (
                <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase rounded-bl-lg border-b border-l ${getRelevanceColor(item.relevance)}`}>
                    {item.meta}
                </div>
            )}

            <div 
                className="flex items-center justify-between p-3 border-b border-transparent cursor-pointer select-none"
                onClick={() => toggleSelection(item.id)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-2 rounded-md border flex-shrink-0 bg-white shadow-sm`}>
                        {getLayerIcon(item.layer)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className={`font-bold text-sm truncate flex items-center gap-2 ${
                            item.isSelected ? 'text-gray-800' : 'text-gray-500'
                        }`}>
                            {displayTitle}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                {getLayerLabel(item.layer)}
                            </span>
                            {item.relevance === 'high' && item.isSelected && (
                                <span className="text-[9px] text-red-600 font-bold flex items-center gap-0.5">
                                    <AlertCircle size={8} /> Primary Context
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0 pl-4">
                    {item.isEditable && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEditingId(editingId === item.id ? null : item.id); }}
                            className={`p-1.5 rounded transition-colors ${editingId === item.id ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200' : 'text-gray-400 hover:text-blue-600 hover:bg-gray-50'}`}
                            title="Edit Context for this prompt only"
                        >
                            <Edit2 size={14} />
                        </button>
                    )}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        item.isSelected 
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 bg-white'
                    }`}>
                        {item.isSelected && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                </div>
            </div>

            {/* Content Preview / Editor */}
            {item.isSelected && (
                <div className={`px-3 pb-3 pt-1 transition-all ${editingId === item.id ? 'bg-blue-50/30' : ''}`}>
                    {editingId === item.id ? (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                            <label className="text-[10px] font-bold text-blue-600 mb-1 block">Editing Context Payload (Temporary)</label>
                            <textarea 
                                value={item.content}
                                onChange={(e) => handleContentChange(item.id, e.target.value)}
                                className="w-full p-3 text-xs font-mono text-gray-700 bg-white rounded-md outline-none resize-y min-h-[120px] border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-inner"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div 
                            className="group relative p-2 rounded hover:bg-gray-50 transition-colors cursor-text"
                            onClick={() => item.isEditable && setEditingId(item.id)}
                        >
                            <div className="max-h-32 overflow-y-auto custom-scrollbar">
                                <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap leading-relaxed">
                                    {item.content}
                                </pre>
                            </div>
                            {item.isEditable && (
                                <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 bg-white px-1 rounded shadow-sm border border-blue-100">
                                    Click to edit
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-start flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="text-blue-600 fill-blue-100" size={24} />
              Context Interceptor
            </h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-hidden flex bg-gray-50/50">
           
           {/* Left Column: Data Context (Focus, Flow, Architecture) */}
           <div className="flex-1 overflow-y-auto p-5 border-r border-gray-200">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 sticky top-0 bg-gray-50/95 py-2 z-10 backdrop-blur-sm">
                    <span>Structural Memory</span>
                    <span className="bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full shadow-sm">
                        {standardItems.filter(i => i.isSelected).length} Active
                    </span>
                </div>
                
                {standardItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm italic">No structural context found.</div>
                ) : (
                    standardItems.map(renderItem)
                )}
           </div>

           {/* Right Column: Guidelines (Foundation, Rules) */}
           <div className="w-80 lg:w-96 overflow-y-auto p-5 bg-white">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 sticky top-0 bg-white py-2 z-10">
                    <div className="flex items-center gap-2">
                        <Bot size={14} />
                        <span>System Guidelines</span>
                    </div>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        {guidelineItems.filter(i => i.isSelected).length}
                    </span>
                </div>
                
                <div className="space-y-4">
                    {Object.entries(groupedGuidelines).map(([category, groupItems]: [string, ContextItem[]]) => {
                        const isCollapsed = collapsedCategories[category];
                        const activeCount = groupItems.filter(i => i.isSelected).length;
                        
                        return (
                            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div 
                                    onClick={() => toggleCategory(category)}
                                    className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {isCollapsed ? <ChevronRight size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
                                        <span className="text-xs font-bold text-gray-700 uppercase">{category}</span>
                                    </div>
                                    {activeCount > 0 && (
                                        <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">
                                            {activeCount}
                                        </span>
                                    )}
                                </div>
                                
                                {!isCollapsed && (
                                    <div className="p-2 bg-gray-50/30">
                                        {groupItems.map(renderItem)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {guidelineItems.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-xs italic border-2 border-dashed border-gray-100 rounded-xl">
                            No AI Guidelines set.
                        </div>
                    )}
                </div>
           </div>
           
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center flex-shrink-0">
           <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Model: <span className="font-mono font-bold text-gray-700">{modelName}</span>
              </div>
              <div className="hidden md:flex items-center gap-1">
                  <BrainCircuit size={14} className="text-gray-400" />
                  <span>Prompt Structure Optimized</span>
              </div>
           </div>
           
           <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-50 rounded-lg transition-colors">
                  Cancel
              </button>
              <button 
                onClick={handleConfirm}
                className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all flex items-center gap-2"
              >
                <Sparkles size={16} className="text-blue-200" /> Confirm & Execute
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
