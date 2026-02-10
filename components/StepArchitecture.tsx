
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SiteMapNode, UserFlowGraph, UserPersona, FlowNodeType, FlowNode, FlowEdge, NodeMetadata } from '../types';
import { ModelSelector, GEMINI_FLASH, GEMINI_PRO } from './ModelSelector';
import * as geminiService from '../services/geminiService';
import { 
  Network, 
  GitGraph, 
  Layout, 
  Check, 
  RefreshCw, 
  Plus, 
  Wand2, 
  Trash2, 
  X,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Diamond,
  Square,
  PlayCircle,
  StopCircle,
  Zap,
  User,
  MousePointer2,
  Settings2,
  ChevronLeft,
  Smartphone,
  CreditCard,
  MousePointerClick,
  FolderTree,
  File,
  Layers,
  Move,
  Map as MapIcon,
  Workflow,
  Palette,
  Type,
  Grid,
  MoreHorizontal,
  FileText,
  ArrowRightCircle,
  Save,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  Hash,
  BrainCircuit,
  Eye,
  Activity,
  Users,
  MessageSquare,
  AlertTriangle,
  Play,
  Sparkles,
  ScanSearch,
  CheckCircle2,
  AlignStartHorizontal,
  AlignStartVertical,
  LayoutGrid,
  ChevronDown,
  ChevronRight as ChevronRightSmall,
  Target
} from 'lucide-react';

// --- TYPES & INTERFACES ---

interface StepArchitectureProps {
  siteMap: SiteMapNode[];
  userFlows: UserFlowGraph[];
  userPersonas: UserPersona[];
  requirements: string;
  onUpdateSiteMap: (nodes: SiteMapNode[]) => void;
  onUpdateUserFlows: (flows: UserFlowGraph[]) => void;
  onComplete: () => void;
  onNavigateToModule: (nodeId: string, type: 'section' | 'page') => void;
  isLoading: boolean;
}

interface VisualNode {
  id: string;
  type: string;
  label: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: any;
  customColor?: string;
  customIcon?: string;
  metadata?: NodeMetadata; 
  hasChildren?: boolean;
  collapsed?: boolean;
}

interface VisualEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// --- CONSTANTS ---

const NODE_SIZES = {
  root: { w: 180, h: 80 },
  section: { w: 240, h: 90 }, // Wider for sections
  page: { w: 200, h: 80 },
  utility: { w: 140, h: 60 },
  start: { w: 60, h: 60 },
  end: { w: 60, h: 60 },
  screen: { w: 200, h: 110 },
  action: { w: 160, h: 70 },
  decision: { w: 120, h: 120 }
};

const GAP_X = 120; // Increased Gap for Horizontal
const GAP_Y = 80;

const COLOR_PRESETS = [
  { id: 'default', bg: 'bg-white', border: 'border-gray-200', text: 'text-slate-800' },
  { id: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
  { id: 'green', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
  { id: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
  { id: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900' },
  { id: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
  { id: 'dark', bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-white' },
];

// --- LAYOUT ALGORITHMS ---

// Enterprise Forest Layout (Horizontal, Left-to-Right)
const calculateTreeLayout = (nodes: SiteMapNode[], collapsedIds: Set<string>): { vNodes: VisualNode[], vEdges: VisualEdge[] } => {
  if (!nodes || nodes.length === 0) return { vNodes: [], vEdges: [] };

  const vNodes: VisualNode[] = [];
  const vEdges: VisualEdge[] = [];
  
  // Layout a SINGLE tree root horizontally
  const layoutSingleTree = (root: SiteMapNode, startY: number): { height: number, nodes: VisualNode[], edges: VisualEdge[] } => {
      const tNodes: VisualNode[] = [];
      const tEdges: VisualEdge[] = [];
      let totalHeight = 0;

      const traverse = (node: SiteMapNode, depth: number, currentY: number): number => {
          const size = NODE_SIZES[node.type as keyof typeof NODE_SIZES] || NODE_SIZES.page;
          const isCollapsed = collapsedIds.has(node.id);
          let height = 0;
          
          const hasChildren = node.children && node.children.length > 0;

          if (hasChildren && !isCollapsed) {
              let childY = currentY;
              node.children.forEach(child => {
                  const h = traverse(child, depth + 1, childY);
                  height += h;
                  childY += h;
              });
          } else {
              height = size.h + 40; // Vertical gap between leaves
          }

          // Position: X based on depth, Y centered relative to children
          const x = depth * (300); // Fixed column width
          const y = currentY + (height / 2) - (size.h / 2);
          
          tNodes.push({
              id: node.id,
              type: node.type,
              label: node.name,
              description: node.description,
              x, y,
              width: size.w,
              height: size.h,
              data: node,
              metadata: node.metadata,
              hasChildren,
              collapsed: isCollapsed
          });

          if (!isCollapsed) {
              node.children?.forEach(child => {
                  tEdges.push({ id: `e-${node.id}-${child.id}`, source: node.id, target: child.id });
              });
          }

          return height;
      };

      const h = traverse(root, 0, startY);
      return { height: h, nodes: tNodes, edges: tEdges };
  };

  let currentY = 50;

  nodes.forEach(root => {
      const tree = layoutSingleTree(root, currentY);
      vNodes.push(...tree.nodes);
      vEdges.push(...tree.edges);
      currentY += tree.height + 100; // Gap between separate trees
  });

  return { vNodes, vEdges };
};

// Layered Graph Layout (Standard)
const calculateGraphLayout = (nodes: FlowNode[], edges: FlowEdge[]): { vNodes: VisualNode[], vEdges: VisualEdge[] } => {
  if (nodes.length === 0) return { vNodes: [], vEdges: [] };

  const vNodes: VisualNode[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // 1. Assign Ranks
  const ranks: Record<string, number> = {};
  const queue = nodes.filter(n => n.type === 'start').map(n => ({ id: n.id, r: 0 }));
  
  if (queue.length === 0 && nodes.length > 0) queue.push({ id: nodes[0].id, r: 0 });

  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, r } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    
    ranks[id] = Math.max(ranks[id] || 0, r);
    
    const outgoing = edges.filter(e => e.source === id);
    outgoing.forEach(e => queue.push({ id: e.target, r: r + 1 }));
  }

  nodes.forEach(n => { if (ranks[n.id] === undefined) ranks[n.id] = 0; });

  // 2. Group by Rank
  const rankGroups: Record<number, string[]> = {};
  let maxRank = 0;
  Object.entries(ranks).forEach(([id, r]) => {
    if (!rankGroups[r]) rankGroups[r] = [];
    rankGroups[r].push(id);
    maxRank = Math.max(maxRank, r);
  });

  // 3. Position
  const calculatedPositions: Record<string, {x: number, y: number}> = {};
  let currentX = 50;
  
  for (let r = 0; r <= maxRank; r++) {
    let group = rankGroups[r] || [];
    
    if (r > 0) {
        group = group.sort((aId, bId) => {
            const getAvgY = (id: string) => {
                const parents = edges.filter(e => e.target === id).map(e => e.source);
                if (parents.length === 0) return 0;
                const parentYs = parents.map(pid => calculatedPositions[pid]?.y || 0);
                return parentYs.reduce((a, b) => a + b, 0) / parentYs.length;
            };
            return getAvgY(aId) - getAvgY(bId);
        });
    }

    let currentY = 50;
    let maxW = 0;

    group.forEach(nid => {
      const node = nodeMap.get(nid)!;
      const size = NODE_SIZES[node.type as keyof typeof NODE_SIZES] || NODE_SIZES.action;
      
      calculatedPositions[nid] = { x: currentX, y: currentY };

      vNodes.push({
        id: node.id,
        type: node.type,
        label: node.label,
        description: node.description,
        x: currentX,
        y: currentY,
        width: size.w,
        height: size.h,
        data: node,
        metadata: node.metadata
      });
      
      currentY += size.h + GAP_Y;
      maxW = Math.max(maxW, size.w);
    });
    
    currentX += maxW + GAP_X + 50; 
  }

  const vEdges = edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label
  }));

  return { vNodes, vEdges };
};

// --- SUB-COMPONENTS ---

const CanvasBackground = ({ scale, offset }: { scale: number, offset: { x: number, y: number } }) => (
  <div 
    className="absolute inset-0 pointer-events-none opacity-10"
    style={{
      backgroundImage: 'radial-gradient(#64748b 1.5px, transparent 1.5px)',
      backgroundSize: `${24 * scale}px ${24 * scale}px`,
      backgroundPosition: `${offset.x}px ${offset.y}px`
    }}
  />
);

const EdgeRenderer = ({ edges, nodes, isHorizontalTree }: { edges: VisualEdge[], nodes: VisualNode[], isHorizontalTree: boolean }) => {
  return (
    <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" width="1" height="1">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>
      {edges.map(edge => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (!source || !target) return null;

        let path = '';
        let labelX = 0, labelY = 0;

        if (isHorizontalTree) {
           // Horizontal Curvature for Sitemap
           const startX = source.x + source.width;
           const startY = source.y + source.height / 2;
           const endX = target.x;
           const endY = target.y + target.height / 2;
           
           const dist = Math.abs(endX - startX);
           const cp1x = startX + dist * 0.5;
           const cp2x = endX - dist * 0.5;
           
           path = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
        } else {
           // Standard Flow Curvature
           const startX = source.x + source.width;
           const startY = source.y + source.height / 2;
           const endX = target.x;
           const endY = target.y + target.height / 2;
           const c1x = startX + (endX - startX) / 2;
           const c1y = startY;
           const c2x = endX - (endX - startX) / 2;
           const c2y = endY;
           path = `M ${startX} ${startY} C ${c1x} ${c1y} ${c2x} ${c2y} ${endX} ${endY}`;
           labelX = (startX + endX) / 2;
           labelY = (startY + endY) / 2;
        }

        return (
          <g key={edge.id}>
            <path d={path} fill="none" stroke="#cbd5e1" strokeWidth="2" markerEnd={!isHorizontalTree ? "url(#arrowhead)" : undefined} />
            {edge.label && !isHorizontalTree && (
              <foreignObject x={labelX - 40} y={labelY - 10} width="80" height="20">
                <div className="text-[10px] bg-white border border-slate-200 rounded text-center text-slate-500 shadow-sm truncate px-1">
                  {edge.label}
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const NodeRenderer = ({ 
  node, 
  isSelected, 
  isEditing,
  onMouseDown,
  onDoubleClick,
  onEditChange,
  onEditSubmit,
  onToggleCollapse,
  customStyle 
}: { 
  node: VisualNode, 
  isSelected: boolean, 
  isEditing: boolean,
  onMouseDown: (e: React.MouseEvent) => void,
  onDoubleClick: () => void,
  onEditChange: (val: string) => void,
  onEditSubmit: () => void,
  onToggleCollapse?: () => void,
  customStyle?: { bg: string, border: string, text: string; id?: string }
}) => {
  
  const getDefaultStyle = () => {
    switch(node.type) {
      case 'root': return 'bg-slate-900 text-white border-slate-800';
      case 'section': return 'bg-white text-indigo-900 border-indigo-200 border-l-4 border-l-indigo-500';
      case 'page': return 'bg-white text-slate-800 border-slate-200';
      case 'start': return 'bg-green-50 text-green-700 border-green-200 rounded-full';
      case 'end': return 'bg-slate-100 text-slate-500 border-slate-300 rounded-full';
      case 'decision': return 'bg-orange-50 text-orange-700 border-orange-200 rotate-45';
      case 'action': return 'bg-purple-50 text-purple-700 border-purple-200 rounded-full';
      default: return 'bg-white text-slate-800 border-gray-200';
    }
  };

  const styleClass = customStyle 
    ? `${customStyle.bg} ${customStyle.text} ${customStyle.border}` 
    : getDefaultStyle();

  const isDecision = node.type === 'decision';
  
  const getIcon = () => {
    switch(node.type) {
      case 'root': return <Layers size={18} />;
      case 'section': return <FolderTree size={18} className="text-indigo-500" />;
      case 'page': return <File size={18} className="text-slate-400" />;
      case 'screen': return <Smartphone size={18} />;
      case 'decision': return <Diamond size={24} />;
      case 'action': return <MousePointerClick size={18} />;
      case 'start': return <PlayCircle size={20} />;
      case 'end': return <StopCircle size={20} />;
      default: return null;
    }
  };

  return (
    <div
      className={`absolute flex flex-col items-center justify-center transition-shadow cursor-grab active:cursor-grabbing group
        ${styleClass}
        ${isSelected ? 'ring-4 ring-blue-400/50 shadow-2xl z-30' : 'shadow-sm hover:shadow-md z-10'}
        ${!isDecision && 'rounded-xl border-2'}
        ${isDecision && 'border-2'}
      `}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
    >
      {node.metadata?.status && !isDecision && (
          <div className={`absolute -top-2 -right-2 w-3 h-3 rounded-full border border-white ${node.metadata.status === 'approved' ? 'bg-green-500' : node.metadata.status === 'review' ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
      )}

      {/* Expand/Collapse Button */}
      {node.hasChildren && onToggleCollapse && (
          <button 
            onMouseDown={(e) => { e.stopPropagation(); onToggleCollapse(); }}
            className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:border-blue-400 hover:text-blue-600 shadow-sm z-40 transition-colors`}
          >
              {node.collapsed ? <ChevronRightSmall size={14} /> : <ChevronDown size={14} />}
          </button>
      )}

      <div className={`flex flex-col items-center justify-center text-center p-2 w-full h-full ${isDecision ? '-rotate-45' : ''}`}>
        
        {/* Header Indicator for Screen types */}
        {(node.type === 'screen' || node.type === 'page') && !customStyle && (
           <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 rounded-t-lg"></div>
        )}

        <div className={`mb-1 ${isDecision ? 'mb-0' : ''} opacity-80 pointer-events-none`}>
           {getIcon()}
        </div>
        
        {isEditing ? (
            <input 
                autoFocus
                className="w-full bg-white/50 text-center text-xs font-bold border-b border-blue-500 outline-none p-0 m-0"
                value={node.label}
                onChange={(e) => onEditChange(e.target.value)}
                onBlur={onEditSubmit}
                onKeyDown={(e) => e.key === 'Enter' && onEditSubmit()}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            />
        ) : (
            <div className={`text-xs font-bold leading-tight px-1 select-none ${isDecision ? 'w-24' : ''}`}>
                {node.label}
            </div>
        )}
        
        {['root', 'section', 'page'].includes(node.type) && node.description && !isDecision && !isEditing && (
           <div className="text-[9px] opacity-60 mt-1 line-clamp-2 px-2 leading-tight pointer-events-none select-none">
              {node.description}
           </div>
        )}
      </div>
    </div>
  );
};

const getNodeTypeIcon = (type: string) => {
    switch(type) {
      case 'root': return <Layers size={20} />;
      case 'section': return <FolderTree size={20} />;
      case 'page': return <File size={20} />;
      case 'screen': return <Smartphone size={20} />;
      case 'decision': return <Diamond size={20} />;
      case 'action': return <MousePointerClick size={20} />;
      case 'start': return <PlayCircle size={20} />;
      case 'end': return <StopCircle size={20} />;
      default: return <Settings2 size={20} />;
    }
};

const NodeInspector = ({
  node,
  neighbors,
  availablePersonas,
  requirements,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onJumpToDesign,
  fullGraphContextString,
  onApplyArchitecturalChanges,
}: {
  node: VisualNode,
  neighbors: { incoming: VisualNode[], outgoing: VisualNode[] },
  availablePersonas: UserPersona[],
  requirements: string,
  isOpen: boolean,
  onClose: () => void,
  onSave: (id: string, updates: { label?: string, description?: string, metadata?: NodeMetadata }) => void,
  onDelete: (id: string) => void,
  onJumpToDesign?: (id: string, type: 'section' | 'page') => void,
  fullGraphContextString: string;
  onApplyArchitecturalChanges: (instruction: string, plan: any) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'definition' | 'architect' | 'data'>('definition');
  const [label, setLabel] = useState(node.label);
  const [desc, setDesc] = useState(node.description || '');
  const [metadata, setMetadata] = useState<NodeMetadata>(node.metadata || {});
  
  // Architect State
  const [architectPhase, setArchitectPhase] = useState<'input' | 'analyzing' | 'review' | 'executing'>('input');
  const [architectInput, setArchitectInput] = useState('');
  const [includeParents, setIncludeParents] = useState(true);
  const [includeChildren, setIncludeChildren] = useState(true);
  const [architectPlan, setArchitectPlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setLabel(node.label);
    setDesc(node.description || '');
    setMetadata(node.metadata || {});
    setArchitectPhase('input');
    setArchitectInput('');
    setArchitectPlan(null);
  }, [node]);

  if (!isOpen) return null;

  const handleAutoDescription = async () => {
      setIsGenerating(true);
      try {
          const neighborLabels = {
              incoming: neighbors.incoming.map(n => n.label),
              outgoing: neighbors.outgoing.map(n => n.label)
          };
          const result = await geminiService.analyzeArchitectureNode(
              node.label, 
              node.type, 
              neighborLabels, 
              requirements, 
              GEMINI_FLASH
          );
          
          setDesc(result.description);
          setMetadata(prev => ({
              ...prev,
              complexity: result.complexity as any,
              notes: result.suggestion
          }));
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleAnalyzeArchitecture = async () => {
      if (!architectInput.trim()) return;
      setArchitectPhase('analyzing');
      try {
          const context = {
              parents: includeParents ? neighbors.incoming : [],
              children: includeChildren ? neighbors.outgoing : []
          };
          
          const plan = await geminiService.proposeArchitectureModifications(
              node,
              architectInput,
              context,
              fullGraphContextString,
              GEMINI_PRO
          );
          
          setArchitectPlan(plan);
          setArchitectPhase('review');
      } catch (e) {
          console.error(e);
          alert("Analysis failed.");
          setArchitectPhase('input');
      }
  };

  const handleExecuteArchitecture = () => {
      setArchitectPhase('executing');
      onApplyArchitecturalChanges(architectInput, architectPlan);
      setTimeout(() => onClose(), 1500);
  };

  const handleTogglePersona = (pId: string) => {
      const current = metadata.assignedPersonaIds || [];
      const updated = current.includes(pId) ? current.filter(id => id !== pId) : [...current, pId];
      setMetadata({ ...metadata, assignedPersonaIds: updated });
  };

  const saveChanges = () => {
      onSave(node.id, { label, description: desc, metadata });
  };

  return (
    <div className="absolute top-20 right-4 w-[450px] bg-white/95 backdrop-blur shadow-2xl rounded-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200 ring-1 ring-black/5 max-h-[85vh]">
        <div className={`h-1.5 w-full ${
            node.type === 'decision' ? 'bg-orange-500' : 
            node.type === 'start' ? 'bg-green-500' : 
            node.type === 'page' || node.type === 'screen' ? 'bg-blue-500' : 'bg-slate-500'
        }`}></div>

        <div className="p-5 pb-0">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-100 rounded-xl text-gray-700 shadow-sm border border-gray-200">
                        {getNodeTypeIcon(node.type)}
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-0.5">{node.type} Node</div>
                        <input 
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            onBlur={saveChanges}
                            className="font-bold text-lg text-gray-900 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full transition-colors"
                        />
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={18} /></button>
            </div>

            <div className="flex border-b border-gray-100">
                <button onClick={() => setActiveTab('definition')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'definition' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Properties</button>
                <button onClick={() => setActiveTab('architect')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'architect' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}><span className="flex items-center justify-center gap-1"><Sparkles size={12} /> Smart Edit</span></button>
                <button onClick={() => setActiveTab('data')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'data' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Connections</button>
            </div>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
            {activeTab === 'definition' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2"><FileText size={12} /> Purpose & Context</label>
                            <button onClick={handleAutoDescription} disabled={isGenerating} className="text-[10px] text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 transition-colors">{isGenerating ? <RefreshCw size={10} className="animate-spin" /> : <Wand2 size={10} />} Auto-Write</button>
                        </div>
                        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={saveChanges} className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-28 resize-none bg-white text-gray-700 leading-relaxed shadow-sm" placeholder="Describe what this node does..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2"><Users size={12} /> Target Personas</label>
                        <div className="flex flex-wrap gap-2">
                            {availablePersonas.map(p => {
                                const isSelected = (metadata.assignedPersonaIds || []).includes(p.id);
                                return (<button key={p.id} onClick={() => { handleTogglePersona(p.id); saveChanges(); }} className={`px-2 py-1 rounded-lg text-xs border transition-all ${isSelected ? 'bg-indigo-100 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>{p.name}</button>);
                            })}
                            {availablePersonas.length === 0 && <span className="text-xs text-gray-400 italic">No personas defined.</span>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2"><Activity size={12} /> Lifecycle Status</label>
                        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                            {(['draft', 'review', 'approved'] as const).map(s => (<button key={s} onClick={() => { setMetadata({...metadata, status: s}); saveChanges(); }} className={`flex-1 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${metadata.status === s ? s === 'approved' ? 'bg-green-100 text-green-700' : s === 'review' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>{s}</button>))}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'architect' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 h-full flex flex-col">
                    {architectPhase === 'input' && (
                        <div className="flex-1 flex flex-col space-y-4">
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <h4 className="font-bold text-purple-900 text-sm mb-2 flex items-center gap-2"><BrainCircuit size={16} /> Architectural Reasoning</h4>
                                <p className="text-xs text-purple-700 leading-relaxed">Describe how you want to modify this node or the flow around it. The AI will analyze dependencies before making changes.</p>
                            </div>
                            <textarea value={architectInput} onChange={(e) => setArchitectInput(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none bg-white text-gray-800 shadow-sm" placeholder="e.g. 'Add a Forgot Password flow starting from here', 'Split this into two steps', 'Connect this to the Dashboard'..." autoFocus />
                            <button onClick={handleAnalyzeArchitecture} disabled={!architectInput.trim()} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-md flex items-center justify-center gap-2 mt-auto disabled:opacity-50"><ScanSearch size={16} /> Analyze Impact</button>
                        </div>
                    )}
                    {architectPhase === 'analyzing' && (<div className="flex-1 flex flex-col items-center justify-center text-center"><div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div><h4 className="font-bold text-gray-800">Analyzing Structure...</h4><p className="text-xs text-gray-500 mt-2">Checking flow continuity and dependencies.</p></div>)}
                    {architectPhase === 'review' && architectPlan && (
                        <div className="flex-1 flex flex-col space-y-4">
                            <div className={`p-4 rounded-xl border-l-4 shadow-sm ${architectPlan.risk === 'high' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}><div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className={architectPlan.risk === 'high' ? 'text-red-600' : 'text-blue-600'} /><h4 className="font-bold text-gray-800 text-sm uppercase">Analysis: {architectPlan.risk} Risk</h4></div><p className="text-sm text-gray-700 leading-relaxed">{architectPlan.impactSummary}</p></div>
                            <div className="flex gap-2 mt-auto pt-4"><button onClick={() => setArchitectPhase('input')} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200">Refine</button><button onClick={handleExecuteArchitecture} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-md flex items-center justify-center gap-2"><Play size={16} fill="currentColor" /> Execute</button></div>
                        </div>
                    )}
                    {architectPhase === 'executing' && (<div className="flex-1 flex flex-col items-center justify-center text-center"><CheckCircle2 size={48} className="text-green-500 mb-4 animate-bounce" /><h4 className="font-bold text-gray-800">Applying Changes...</h4><p className="text-xs text-gray-500 mt-2">Restructuring the graph.</p></div>)}
                </div>
            )}
            {activeTab === 'data' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-3 mb-2"><div className="bg-white p-3 rounded-xl border border-gray-200"><div className="text-[9px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Hash size={10} /> System ID</div><div className="text-xs text-gray-500 font-mono truncate select-all cursor-pointer hover:text-blue-600" title={node.id}>{node.id.substring(0, 8)}...</div></div><div className="bg-white p-3 rounded-xl border border-gray-200"><div className="text-[9px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Info size={10} /> Role</div><div className="text-xs text-gray-700 capitalize">{node.type}</div></div></div>
                    {(neighbors.incoming.length > 0 || neighbors.outgoing.length > 0) ? (<>{neighbors.incoming.length > 0 && (<div><div className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><ArrowUpCircle size={12} /> Incoming (Parents)</div><div className="space-y-2">{neighbors.incoming.map(n => (<div key={n.id} className="text-xs bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2"><div className="p-1 bg-gray-100 rounded text-gray-500">{getNodeTypeIcon(n.type)}</div><span className="font-medium text-gray-700">{n.label}</span></div>))}</div></div>)}{neighbors.outgoing.length > 0 && (<div><div className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><ArrowDownCircle size={12} /> Outgoing (Children)</div><div className="space-y-2">{neighbors.outgoing.map(n => (<div key={n.id} className="text-xs bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2"><div className="p-1 bg-gray-100 rounded text-gray-500">{getNodeTypeIcon(n.type)}</div><span className="font-medium text-gray-700">{n.label}</span></div>))}</div></div>)}</>) : (<div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400 italic">No connections detected.</div>)}
                </div>
            )}
        </div>
        
        {activeTab !== 'architect' && (
            <div className="p-4 border-t border-gray-100 flex flex-col gap-2 bg-white">
                <button onClick={() => { saveChanges(); onClose(); }} className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"><Save size={16} /> Save Changes</button>
                {(node.type === 'page' || node.type === 'section') && onJumpToDesign && (<button onClick={() => onJumpToDesign(node.id, node.type as any)} className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"><ArrowRightCircle size={16} /> Jump to Design Studio</button>)}
                <button onClick={() => { onDelete(node.id); onClose(); }} className="w-full py-2.5 bg-white border border-red-100 text-red-500 rounded-xl font-bold text-sm hover:bg-red-50 hover:border-red-200 flex items-center justify-center gap-2 mt-1"><Trash2 size={16} /> Delete Node</button>
            </div>
        )}
    </div>
  );
};

const ContextHUD = ({ 
  node, 
  position, 
  onColorChange, 
  onProperties,
  onClose,
  activeColor
}: { 
  node: VisualNode, 
  position: { x: number, y: number },
  onColorChange: (colorId: string) => void,
  onProperties: () => void,
  onClose: () => void,
  activeColor?: string
}) => {
  return (
    <div className="absolute z-50 flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-150" style={{ left: position.x + node.width / 2, top: position.y - 60, transform: 'translateX(-50%)' }}>
        <div className="flex items-center gap-1 bg-white rounded-full shadow-xl border border-gray-200 p-1.5 px-2">
            <div className="flex gap-1 pr-2 border-r border-gray-200">
                {COLOR_PRESETS.map(c => (<button key={c.id} onClick={() => onColorChange(c.id)} className={`w-4 h-4 rounded-full border hover:scale-125 transition-transform ${c.bg} ${c.border} ${activeColor === c.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`} title={c.id} />))}
            </div>
            <div className="flex gap-1 pl-1">
                <button onClick={onProperties} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full flex items-center gap-1" title="Properties"><FileText size={14} /></button>
                <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X size={14} /></button>
            </div>
        </div>
        <div className="w-2 h-2 bg-white border-b border-r border-gray-200 transform rotate-45 -mt-3 shadow-sm"></div>
    </div>
  );
};

// --- NEW ARCHITECTURAL INTENT MODAL ---
const ArchitecturalIntentModal = ({
    isOpen,
    onClose,
    onConfirm,
    mode,
    persona,
    requirements
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: (instruction: string) => void,
    mode: 'flow' | 'map',
    persona: UserPersona | undefined,
    requirements: string
}) => {
    const [instruction, setInstruction] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 text-purple-700 rounded-xl shadow-sm">
                            <BrainCircuit size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">
                                {mode === 'flow' ? 'Generate User Journeys' : 'Architect Information Hierarchy'}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">AI Architect</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Context Summary */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                        <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold text-blue-800 uppercase mb-1">Active Context</h4>
                            <p className="text-xs text-blue-600 leading-relaxed">
                                {mode === 'flow' 
                                    ? `Generating flows based on PRD and Persona: ${persona ? persona.name : 'General User'}.` 
                                    : `Structuring sitemap based on ${requirements.length > 0 ? 'Project Requirements' : 'General Best Practices'}.`
                                }
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Target size={16} className="text-purple-500" />
                            Specific Instructions (Optional)
                        </label>
                        <textarea 
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none bg-gray-50 focus:bg-white transition-colors text-gray-800 shadow-inner"
                            placeholder={mode === 'flow' 
                                ? "e.g. 'Focus on the onboarding experience', 'Include error states for login', 'Ensure the checkout process has 3 steps'..." 
                                : "e.g. 'Create a deep hierarchy for the settings module', 'Group admin features separately', 'Ensure utilities are in the footer'..."
                            }
                            autoFocus
                        />
                        <p className="text-xs text-gray-400 mt-2 text-right">
                            Leave empty to let the AI decide based on best practices.
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-200 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(instruction)}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transform transition-all hover:scale-[1.02] flex items-center gap-2"
                    >
                        <Sparkles size={16} className="text-purple-200" />
                        Generate {mode === 'flow' ? 'Flows' : 'Map'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const StepArchitecture: React.FC<StepArchitectureProps> = ({
  siteMap,
  userFlows,
  userPersonas,
  requirements,
  onUpdateSiteMap,
  onUpdateUserFlows,
  onComplete,
  onNavigateToModule,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'map'>('flow'); 
  const [model, setModel] = useState(GEMINI_FLASH);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  
  // Visual State
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set()); 
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  
  // Customization State
  const [manualPositions, setManualPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [nodeStyles, setNodeStyles] = useState<Record<string, string>>({}); 

  // Interaction State
  const [dragTarget, setDragTarget] = useState<{ type: 'canvas' | 'node', id?: string, startX: number, startY: number } | null>(null);
  
  // Data State
  const [activeFlowId, setActiveFlowId] = useState<string | null>(userFlows[0]?.id || null);
  
  // Intent Modal State
  const [intentModalOpen, setIntentModalOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const { vNodes, vEdges } = useMemo(() => {
    let rawLayout;
    if (activeTab === 'map') {
       // Use new Horizontal Enterprise Layout
       rawLayout = calculateTreeLayout(siteMap, collapsedNodeIds);
    } else {
       const flow = userFlows.find(f => f.id === activeFlowId);
       rawLayout = flow ? calculateGraphLayout(flow.nodes, flow.edges) : { vNodes: [], vEdges: [] };
    }

    const processedNodes = rawLayout.vNodes.map(n => ({
        ...n,
        x: manualPositions[n.id]?.x ?? n.x,
        y: manualPositions[n.id]?.y ?? n.y,
        customColor: nodeStyles[n.id]
    }));

    return { vNodes: processedNodes, vEdges: rawLayout.vEdges };
  }, [activeTab, siteMap, userFlows, activeFlowId, manualPositions, nodeStyles, collapsedNodeIds]);

  const lastSelectedNodeId = Array.from(selectedNodeIds).pop();
  const lastSelectedNode = vNodes.find(n => n.id === lastSelectedNodeId) || null;

  const selectedNodeNeighbors = useMemo(() => {
    if (!lastSelectedNode) return { incoming: [], outgoing: [] };
    const incomingIds = vEdges.filter(e => e.target === lastSelectedNode.id).map(e => e.source);
    const outgoingIds = vEdges.filter(e => e.source === lastSelectedNode.id).map(e => e.target);
    return {
        incoming: vNodes.filter(n => incomingIds.includes(n.id)),
        outgoing: vNodes.filter(n => outgoingIds.includes(n.id))
    };
  }, [lastSelectedNode, vEdges, vNodes]);

  const fullGraphContextString = useMemo(() => {
      const nodesStr = vNodes.map(n => `${n.id}: ${n.label} (${n.type})`).join('\n');
      const edgesStr = vEdges.map(e => `${e.source} -> ${e.target} [${e.label || ''}]`).join('\n');
      return `Nodes:\n${nodesStr}\n\nEdges:\n${edgesStr}`;
  }, [vNodes, vEdges]);

  // --- INTERACTION HANDLERS ---

  const handleAutoLayout = () => {
    setManualPositions({});
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const s = 0.001 * -e.deltaY;
      setScale(prev => Math.min(Math.max(0.2, prev + s), 3));
    } else {
      setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).getAttribute('data-canvas')) {
       setDragTarget({ type: 'canvas', startX: e.clientX, startY: e.clientY });
       if (!e.shiftKey) {
           setSelectedNodeIds(new Set());
           setEditingNodeId(null);
           setIsPropertiesOpen(false);
       }
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const newSelection = new Set(selectedNodeIds);
      if (e.shiftKey) {
          if (newSelection.has(nodeId)) newSelection.delete(nodeId);
          else newSelection.add(nodeId);
      } else {
          if (!newSelection.has(nodeId)) {
              newSelection.clear();
              newSelection.add(nodeId);
          }
      }
      setSelectedNodeIds(newSelection);
      setDragTarget({ type: 'node', id: nodeId, startX: e.clientX, startY: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragTarget) return;
    const dx = (e.clientX - dragTarget.startX) / scale;
    const dy = (e.clientY - dragTarget.startY) / scale;

    if (dragTarget.type === 'canvas') {
        setOffset(prev => ({ x: prev.x + dx * scale, y: prev.y + dy * scale })); 
        setDragTarget(prev => prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null);
    } else if (dragTarget.type === 'node' && dragTarget.id) {
        if (selectedNodeIds.has(dragTarget.id)) {
            setManualPositions(prev => {
                const nextPos = { ...prev };
                selectedNodeIds.forEach(id => {
                    const currentPos = nextPos[id] || { 
                        x: vNodes.find(n => n.id === id)?.x || 0, 
                        y: vNodes.find(n => n.id === id)?.y || 0 
                    };
                    nextPos[id] = { x: currentPos.x + dx, y: currentPos.y + dy };
                });
                return nextPos;
            });
        }
        setDragTarget(prev => prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null);
    }
  };

  const handleMouseUp = () => setDragTarget(null);

  const handleSmartArrangeSelection = () => {
      if (selectedNodeIds.size < 2) return;
      const selectedNodes = vNodes.filter(n => selectedNodeIds.has(n.id));
      if (selectedNodes.length === 0) return;
      const minX = Math.min(...selectedNodes.map(n => n.x));
      const minY = Math.min(...selectedNodes.map(n => n.y));
      const internalEdges = vEdges.filter(e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));
      const subsetNodes: FlowNode[] = selectedNodes.map(n => ({
          id: n.id,
          type: n.type as FlowNodeType,
          label: n.label,
          description: n.description
      }));
      const subsetEdges: FlowEdge[] = internalEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label
      }));
      const { vNodes: arrangedNodes } = calculateGraphLayout(subsetNodes, subsetEdges);
      setManualPositions(prev => {
          const nextPos = { ...prev };
          arrangedNodes.forEach(node => {
              nextPos[node.id] = {
                  x: node.x - 50 + minX,
                  y: node.y - 50 + minY
              };
          });
          return nextPos;
      });
  };

  const handleAlign = (axis: 'x' | 'y') => {
      const selectedNodes = vNodes.filter(n => selectedNodeIds.has(n.id));
      if (selectedNodes.length < 2) return;
      const avg = selectedNodes.reduce((sum, n) => sum + (axis === 'x' ? n.x : n.y), 0) / selectedNodes.length;
      setManualPositions(prev => {
          const nextPos = { ...prev };
          selectedNodes.forEach(n => {
              nextPos[n.id] = {
                  x: axis === 'x' ? avg : (prev[n.id]?.x ?? n.x),
                  y: axis === 'y' ? avg : (prev[n.id]?.y ?? n.y)
              };
          });
          return nextPos;
      });
  };

  const handleNodeUpdate = (id: string, updates: { label?: string, description?: string, metadata?: NodeMetadata }) => {
     if (activeTab === 'map') {
        const updateTree = (nodes: SiteMapNode[]): SiteMapNode[] => {
           return nodes.map(n => {
              if (n.id === id) {
                  return { ...n, name: updates.label ?? n.name, description: updates.description ?? n.description, metadata: updates.metadata ?? n.metadata };
              }
              if (n.children) return { ...n, children: updateTree(n.children) };
              return n;
           });
        };
        onUpdateSiteMap(updateTree(siteMap));
     } else {
        const flow = userFlows.find(f => f.id === activeFlowId);
        if (!flow) return;
        const newNodes = flow.nodes.map(n => n.id === id ? { ...n, ...updates } : n);
        onUpdateUserFlows(userFlows.map(f => f.id === flow.id ? { ...f, nodes: newNodes } : f));
     }
  };

  const handleDeleteNode = (id: string) => {
      if (activeTab === 'map') {
          const deleteFromTree = (nodes: SiteMapNode[]): SiteMapNode[] => {
              return nodes.filter(n => n.id !== id).map(n => ({
                  ...n, children: n.children ? deleteFromTree(n.children) : []
              }));
          };
          onUpdateSiteMap(deleteFromTree(siteMap));
      } else {
          const flow = userFlows.find(f => f.id === activeFlowId);
          if (!flow) return;
          const newNodes = flow.nodes.filter(n => n.id !== id);
          const newEdges = flow.edges.filter(e => e.source !== id && e.target !== id);
          onUpdateUserFlows(userFlows.map(f => f.id === flow.id ? { ...f, nodes: newNodes, edges: newEdges } : f));
      }
      setSelectedNodeIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      setIsPropertiesOpen(false);
  };

  const handleApplyArchitecturalChanges = async (instruction: string, plan: any) => {
      if (activeTab !== 'flow' || !activeFlowId) {
          alert("Smart Architect currently supports User Flow graphs only.");
          return;
      }
      const flow = userFlows.find(f => f.id === activeFlowId);
      if (!flow) return;
      try {
          const { nodes, edges } = await geminiService.applyArchitectureModifications(flow.nodes, flow.edges, instruction, plan, GEMINI_PRO);
          onUpdateUserFlows(userFlows.map(f => f.id === flow.id ? { ...f, nodes, edges } : f));
          setManualPositions({});
      } catch (e) {
          console.error(e);
          alert("Failed to apply architectural changes.");
      }
  };

  // --- NEW GENERATION LOGIC ---

  const handleGenerateClick = () => {
      // Open the intent modal instead of executing immediately
      setIntentModalOpen(true);
  };

  const handleConfirmGeneration = async (instruction: string) => {
     setIntentModalOpen(false);
     setIsGenerating(true);
     try {
       if (activeTab === 'map') {
          const flowContext = userFlows.map(f => `Flow: ${f.title}\nSteps: ${f.nodes.map(n => `- ${n.label} (${n.type})`).join('\n')}`).join('\n\n');
          // Pass instruction
          const nodes = await geminiService.generateInformationArchitecture(flowContext, requirements, model, instruction);
          onUpdateSiteMap(nodes);
          setManualPositions({});
          setCollapsedNodeIds(new Set()); // Reset collapses
       } else {
          const targetPersona = userPersonas.find(p => p.id === selectedPersonaId);
          // Pass instruction
          const flows = await geminiService.generateBranchingUserFlows(requirements, model, targetPersona, instruction);
          onUpdateUserFlows(flows);
          if (flows.length > 0) setActiveFlowId(flows[0].id);
          setManualPositions({});
       }
     } catch (e) {
        console.error(e);
        alert("Generation failed.");
     } finally {
        setIsGenerating(false);
        setOffset({ x: 0, y: 0 });
        setScale(1);
     }
  };

  const handleToggleCollapse = (nodeId: string) => {
      setCollapsedNodeIds(prev => {
          const next = new Set(prev);
          if (next.has(nodeId)) next.delete(nodeId);
          else next.add(nodeId);
          return next;
      });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans">
      
      {/* Intent Modal */}
      <ArchitecturalIntentModal 
          isOpen={intentModalOpen}
          onClose={() => setIntentModalOpen(false)}
          onConfirm={handleConfirmGeneration}
          mode={activeTab}
          persona={userPersonas.find(p => p.id === selectedPersonaId)}
          requirements={requirements}
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center bg-white/90 backdrop-blur border border-gray-200 p-1 rounded-xl shadow-sm">
         <button onClick={() => { setActiveTab('flow'); setSelectedNodeIds(new Set()); setIsPropertiesOpen(false); }} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all ${activeTab === 'flow' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] border border-white/20">1</span><Workflow size={14} /> User Journeys</button>
         <div className="w-8 flex justify-center text-slate-300"><ArrowRight size={14} /></div>
         <button onClick={() => { setActiveTab('map'); setSelectedNodeIds(new Set()); setIsPropertiesOpen(false); }} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all ${activeTab === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] border border-white/20">2</span><MapIcon size={14} /> Product Map</button>
      </div>

      <div ref={canvasRef} className={`flex-1 relative overflow-hidden cursor-default select-none ${dragTarget?.type === 'canvas' ? 'cursor-grabbing' : ''}`} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} data-canvas="true">
         <CanvasBackground scale={scale} offset={offset} />
         <div className="absolute top-0 left-0 transition-transform duration-75 ease-linear origin-top-left" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
            <div className="absolute top-[100px] left-[100px]">
               <EdgeRenderer edges={vEdges} nodes={vNodes} isHorizontalTree={activeTab === 'map'} />
               {vNodes.map(node => {
                  const preset = node.customColor ? COLOR_PRESETS.find(c => c.id === node.customColor) : undefined;
                  const customStyle = preset ? { bg: preset.bg, border: preset.border, text: preset.text } : undefined;
                  return (
                    <NodeRenderer 
                        key={node.id} 
                        node={node} 
                        isSelected={selectedNodeIds.has(node.id)}
                        isEditing={editingNodeId === node.id}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                        onDoubleClick={() => setIsPropertiesOpen(true)}
                        onEditChange={(val) => handleNodeUpdate(node.id, { label: val })}
                        onEditSubmit={() => setEditingNodeId(null)}
                        onToggleCollapse={() => handleToggleCollapse(node.id)}
                        customStyle={customStyle}
                    />
                  );
               })}
            </div>
         </div>

         {selectedNodeIds.size > 1 && (
             <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                 <div className="text-xs font-bold text-gray-500 px-2 border-r border-gray-100">{selectedNodeIds.size} Selected</div>
                 <button onClick={handleSmartArrangeSelection} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg flex items-center gap-1 text-xs font-bold" title="Auto-arrange selected nodes"><LayoutGrid size={16} /> Smart Arrange</button>
                 <div className="w-px h-6 bg-gray-100 mx-1"></div>
                 <button onClick={() => handleAlign('x')} className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg" title="Align Vertical Center"><AlignStartVertical size={16} /></button>
                 <button onClick={() => handleAlign('y')} className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg" title="Align Horizontal Center"><AlignStartHorizontal size={16} /></button>
             </div>
         )}

         {selectedNodeIds.size === 1 && lastSelectedNode && !editingNodeId && !dragTarget && !isPropertiesOpen && (
             <ContextHUD 
                node={lastSelectedNode}
                position={{ x: (lastSelectedNode.x + 100) * scale + offset.x, y: (lastSelectedNode.y + 100) * scale + offset.y }}
                onColorChange={(colorId) => setNodeStyles(prev => ({ ...prev, [lastSelectedNode.id]: colorId }))}
                onProperties={() => setIsPropertiesOpen(true)}
                onClose={() => setSelectedNodeIds(new Set())}
                activeColor={nodeStyles[lastSelectedNode.id] || 'default'}
             />
         )}

         {selectedNodeIds.size === 1 && lastSelectedNode && (
             <NodeInspector 
                node={lastSelectedNode}
                neighbors={selectedNodeNeighbors}
                availablePersonas={userPersonas}
                requirements={requirements}
                isOpen={isPropertiesOpen}
                onClose={() => setIsPropertiesOpen(false)}
                onSave={handleNodeUpdate}
                onDelete={handleDeleteNode}
                onJumpToDesign={(id, type) => onNavigateToModule(id, type)}
                fullGraphContextString={fullGraphContextString}
                onApplyArchitecturalChanges={handleApplyArchitecturalChanges}
             />
         )}

         {vNodes.length === 0 && !isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="bg-white/80 backdrop-blur p-8 rounded-2xl border border-dashed border-gray-300 text-center max-w-sm pointer-events-auto shadow-xl">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">{activeTab === 'map' ? <Layout size={32} /> : <GitGraph size={32} />}</div>
                  <h3 className="font-bold text-gray-800 text-lg mb-2">{activeTab === 'map' ? 'Enterprise Map' : 'User Journeys'}</h3>
                  <p className="text-gray-500 text-sm mb-6">{activeTab === 'map' ? "Visualize deep, nested structures for complex applications." : "Define the logic and steps users take to complete tasks."}</p>
                  <button onClick={handleGenerateClick} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md flex items-center justify-center gap-2"><Wand2 size={16} /> Generate {activeTab === 'map' ? 'Sitemap' : 'Flows'}</button>
               </div>
            </div>
         )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-end gap-4 pointer-events-none">
         {activeTab === 'flow' && userFlows.length > 0 && (
             <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 pointer-events-auto flex flex-col gap-1 max-h-48 overflow-y-auto w-64">
                 <div className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1">Active Journey</div>
                 {userFlows.map(flow => (<button key={flow.id} onClick={() => { setActiveFlowId(flow.id); setSelectedNodeIds(new Set()); setManualPositions({}); }} className={`text-left px-3 py-2 rounded-lg text-xs font-bold truncate transition-colors ${activeFlowId === flow.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>{flow.title}</button>))}
                 <button className="mt-1 text-xs text-blue-600 font-bold px-3 py-2 hover:bg-blue-50 rounded-lg flex items-center gap-2"><Plus size={12} /> New Journey</button>
             </div>
         )}

         <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-2 pointer-events-auto flex items-center gap-2">
             <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setScale(s => Math.max(0.2, s - 0.2))} className="p-2 hover:bg-white rounded-md text-slate-500"><ZoomOut size={18}/></button>
                <button onClick={() => { setScale(1); setOffset({x:0, y:0}); }} className="p-2 hover:bg-white rounded-md text-slate-500"><Maximize size={18}/></button>
                <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-2 hover:bg-white rounded-md text-slate-500"><ZoomIn size={18}/></button>
             </div>
             
             <div className="h-8 w-px bg-gray-200 mx-1"></div>

             {activeTab === 'flow' && (
               <div className="flex items-center gap-2 mr-2">
                  <select className="bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-2 outline-none w-32" value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)}><option value="">All Personas</option>{userPersonas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
               </div>
             )}

             <button onClick={handleAutoLayout} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors" title="Auto Layout Grid"><LayoutGrid size={18} /></button>
             {/* Updated Click Handler here */}
             <button onClick={handleGenerateClick} disabled={isGenerating} className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50 transition-transform hover:scale-105">{isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}{activeTab === 'map' ? 'Auto-Structure' : 'Generate Flow'}</button>
             <ModelSelector value={model} onChange={setModel} disabled={isGenerating} />
         </div>

         <div className="pointer-events-auto">
            <button onClick={onComplete} disabled={vNodes.length === 0} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3 rounded-2xl shadow-lg shadow-blue-500/30 transition-transform hover:scale-110 disabled:opacity-50 disabled:shadow-none disabled:transform-none" title="Confirm & Proceed to Design"><Check size={24} /></button>
         </div>
      </div>
    </div>
  );
};
