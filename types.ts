
export enum AppStep {
  INTAKE = 'INTAKE',
  ARCHITECTURE = 'ARCHITECTURE', // Combined Flow + Structure
  DATA_API = 'DATA_API', // NEW
  DESIGN_SYSTEM = 'DESIGN_SYSTEM',
  AI_SYSTEM = 'AI_SYSTEM', 
  PROMPT = 'PROMPT',
  DESIGN = 'DESIGN',
  CODE_GEN = 'CODE_GEN',
  ENGINEERING = 'ENGINEERING'
}

export enum AppWorkspace {
  DASHBOARD = 'DASHBOARD',
  STRATEGY = 'STRATEGY',
  AI_SYSTEM = 'AI_SYSTEM',
  ARCHITECTURE = 'ARCHITECTURE', // IA & Flows
  DATA_API = 'DATA_API', // NEW: Data & Schema
  DESIGN = 'DESIGN',
  IMPLEMENTATION = 'IMPLEMENTATION', 
  TESTING = 'TESTING', 
  DEPLOYMENT = 'DEPLOYMENT', 
  MAINTENANCE = 'MAINTENANCE' 
}

export type SourceType = 'transcript' | 'brief' | 'notes' | 'email';
export type ProjectMode = 'architect' | 'rapid' | 'module';

export interface RequirementSource {
  id: string;
  title: string;
  type: SourceType;
  content: string;
  analysis?: string; 
  isExpanded?: boolean;
}

export interface PRDSection {
  id: string;
  application?: string; // New: Links section to a specific app (e.g. "Driver App")
  title: string;
  emoji: string;
  content: string; 
}

export interface ProjectInsight {
  id: string;
  type: 'conflict' | 'gap' | 'risk' | 'opportunity';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  resolution?: string; // New: How the user decided to handle this
}

// --- NEW UCD TYPES ---
export interface UserPersona {
  id: string;
  role: string; // e.g. "Busy Manager"
  name: string; // e.g. "Sarah"
  description: string;
  goals: string[];
  frustrations: string[];
  techLiteracy: 'high' | 'medium' | 'low';
}

export interface UXAudit {
  score: number; // 0-100
  heuristicAnalysis: {
    category: 'Usability' | 'Accessibility' | 'Consistency';
    rating: 'Good' | 'Fair' | 'Poor';
    observation: string;
  }[];
  personaReaction: {
    personaName: string;
    sentiment: 'positive' | 'neutral' | 'frustrated';
    quote: string; // First person reaction "I can't find the button..."
  };
  suggestions: string[];
}
// ---------------------

// --- NEW SMART CHANGE TYPES ---
export interface ChangeProposal {
  id: string;
  title: string;
  description: string;
  impactAnalysis: {
    severity: 'high' | 'medium' | 'low';
    summary: string;
    brokenLinks: string[]; // List of specific items that might break
    sideEffects: string[]; // "Module X will be empty"
  };
  proposedActions: {
    type: 'delete' | 'update' | 'create' | 'move';
    targetId: string;
    targetName: string;
    description: string;
  }[];
}

export interface ExecutionResult {
  updatedModules?: ProjectModule[];
  updatedFlows?: FlowJourney[];
  summary: string;
}
// ------------------------------

export interface ScopedFeature {
  id: string;
  category: string; // New: Epic or Grouping
  name: string;
  description: string;
  isSelected: boolean;
}

export interface ScopeDraft {
  id: string;
  name: string;
  timestamp: number;
  features: ScopedFeature[];
  sourceCount: number; 
}

export interface FeatureProposal {
  reply: string; 
  proposedFeature: { name: string; description: string }; 
  sideEffects: { featureId: string; featureName: string; suggestedChange: string; reasoning: string; isSelected: boolean; }[]; 
}

// --- NEW ARCHITECTURE TYPES ---

export interface NodeMetadata {
  status?: 'draft' | 'review' | 'approved';
  assignedPersonaIds?: string[];
  complexity?: 'low' | 'medium' | 'high';
  aiAnalysis?: string;
  notes?: string;
}

export type IANodeType = 'root' | 'section' | 'page' | 'utility';

export interface SiteMapNode {
  id: string;
  parentId: string | null;
  name: string;
  type: IANodeType;
  description: string;
  children: SiteMapNode[];
  metadata?: NodeMetadata; // Added
}

export type FlowNodeType = 'start' | 'screen' | 'decision' | 'action' | 'end';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  description?: string;
  relatedScreenId?: string; // Links back to a screen definition
  metadata?: NodeMetadata; // Added
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string; // e.g. "If Success", "On Click"
  condition?: boolean; // simple boolean logic flag
}

export interface UserFlowGraph {
  id: string;
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  personaId?: string; // Links flow to a specific persona
}

// --- NEW DATA & API TYPES ---

export interface DataField {
  id: string;
  name: string;
  type: string; // String, Int, Boolean, DateTime, JSON
  isRequired: boolean;
  isUnique: boolean;
  description?: string;
}

export interface DataRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  label: string; // e.g. "has many", "belongs to"
}

export interface DataEntity {
  id: string;
  name: string;
  description: string;
  fields: DataField[];
}

export interface APIEndpoint {
  id: string;
  entityId?: string; // Linked to a data entity
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string; // e.g. /users/:id
  summary: string;
  requestBody?: string; // JSON description
  responseBody?: string; // JSON description
}

export interface DataModel {
  entities: DataEntity[];
  relationships: DataRelationship[];
}

// ------------------------------

export interface WireframeItem {
  id: string;
  sectionName: string; 
  description: string; 
  essentialElements: string[]; 
}

export interface PromptBlueprint {
  layoutInstructions: string;
  visualStyle: string;
  componentUsage: string;
  interactivity: string;
}

export interface DesignVersion {
  id: string;
  timestamp: number;
  code: string;
  prompt: string; 
  previewImg?: string; 
  aiComment?: string; 
  dsSyncReport?: {
    addedComponents: string[];
    addedColors: string[];
  };
  uxAudit?: UXAudit; // NEW: Attach audit to version
}

export interface CodeArtifact {
  id: string;
  name: string;
  type: 'component' | 'hook' | 'schema' | 'api' | 'test' | 'config';
  language: string;
  content: string;
  description: string;
  relatedScreenId?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  type: 'e2e' | 'unit' | 'integration';
  scenarios: string[];
  code: string;
}

export interface DevOpsConfig {
  platform: 'aws' | 'vercel' | 'kubernetes';
  files: CodeArtifact[];
}

export interface ScreenItem {
  id: string;
  moduleId: string; // Keeps reference to IA Section
  name: string;
  description: string;
  status: 'pending' | 'prompt-ready' | 'designed';
  wireframe?: WireframeItem[]; 
  promptBlueprint?: PromptBlueprint;
  guidelines?: string; 
  designPrompt?: string; 
  designCode?: string; 
  history?: DesignVersion[]; 
  generatedComponent?: CodeArtifact;
}

export interface ProjectModule {
  id: string;
  title: string;
  description: string;
  screens: ScreenItem[];
  isExpanded?: boolean;
  guidelines?: string; 
}

export interface FlowStep {
  description: string;
}

export interface FlowJourney {
  title: string;
  steps: FlowStep[];
}

export type DesignStyle = 'Modern' | 'Minimalist' | 'Professional' | 'Playful' | 'Brutalist';
export type DesignLibrary = 'Custom' | 'shadcn/ui' | 'Material Design 3' | 'Fluent UI' | 'Apple Human Interface';

export interface ProjectConfig {
  projectName: string;
  designStyle: DesignStyle;
  designLibrary: DesignLibrary; 
  primaryColor: string; 
  borderRadius: string; 
  customInstructions: string; 
}

export type ComponentType = 'atom' | 'molecule' | 'organism';

export interface DesignComponent {
  id: string;
  name: string;
  type: ComponentType;
  description: string;
  code: string; 
}

export interface DesignSystemState {
  colors: { name: string; value: string }[]; 
  typography: { name: string; value: string }[];
  components: DesignComponent[];
  guidelines: string;
}

export type GuidelineCategory = 'persona' | 'technical' | 'business' | 'style' | 'other';

export interface AIGuideline {
  id: string;
  title: string;
  category: GuidelineCategory;
  content: string;
  isActive: boolean; 
}

export interface AISystemState {
  guidelines: AIGuideline[];
}

export interface DesignAnalysisResult {
  usedComponents: string[]; 
  newComponents: DesignComponent[]; 
  newColors: { name: string; value: string }[]; 
}

export interface ProjectState {
  config: ProjectConfig;
  mode?: ProjectMode; 
  scope?: ScopedFeature[]; 
  scopeDrafts: ScopeDraft[]; 
  
  // Strategy Layer
  requirementSources: RequirementSource[]; 
  projectInsights: ProjectInsight[];
  masterBrd: PRDSection[]; // NEW: Business Requirements Document (High Level)
  prdSections: PRDSection[]; // Detailed Requirements (can be per-app)
  userPersonas: UserPersona[]; 
  
  // Architecture
  siteMap: SiteMapNode[]; 
  userFlows: UserFlowGraph[]; 
  
  // Data & API (New)
  dataModel?: DataModel;
  apiSpecs?: APIEndpoint[];

  // Legacy/Compatibility (Mapped from IA)
  flowData: FlowJourney[]; 
  modules: ProjectModule[];
  
  selectedScreenId: string | null;
  designSystem: DesignSystemState;
  aiSystem: AISystemState;
  
  codeArtifacts: CodeArtifact[];
  testSuites: TestSuite[];
  devOpsConfig?: DevOpsConfig;
}

export interface SavedProjectState {
  version: number;
  workspace?: AppWorkspace; 
  step: AppStep; 
  projectState: ProjectState;
  timestamp: number;
}

export interface ChangeImpact {
  impactSummary: string; 
  affectedFlows: string[]; 
  adjacentScreens: string[]; 
  severity: 'low' | 'medium' | 'high';
}

export interface HealedProjectData {
  updatedFlows: FlowJourney[];
  updatedScreens: ScreenItem[]; 
}

export interface DesignChangePlan {
  summary: string; 
  addedElements: string[];
  removedElements: string[];
  modifiedStyles: string[];
  riskAssessment: string; 
}
