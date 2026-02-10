
import { PRDSection, ProjectConfig } from "./types";

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  projectName: "New Project",
  designStyle: 'Modern',
  designLibrary: 'Custom',
  primaryColor: 'blue',
  borderRadius: 'xl',
  customInstructions: ""
};

export const STYLE_GUIDES: Record<string, string> = {
  Modern: "Use a clean, airy aesthetic with soft shadows (shadow-lg), ample whitespace, and subtle gradients.",
  Minimalist: "Use a strict flat design, high whitespace, delicate borders, and a restricted monochrome palette with one accent.",
  Professional: "Use a dense, information-rich layout, muted blues/grays, standard borders, and tabular data presentations.",
  Playful: "Use vibrant colors, large bold typography, very rounded corners (rounded-2xl or 3xl), and generous bubbly spacing.",
  Brutalist: "Use high contrast, thick black borders (border-2 border-black), sharp corners (rounded-none), and bold monospaced fonts."
};

// New Library Presets for AI Context
export const LIBRARY_PRESETS: Record<string, string> = {
  'Custom': "Follow the user's specific atomic design system components strictly.",
  'shadcn/ui': "Mimic the 'shadcn/ui' aesthetic. Use HSL variable-like utility usage (bg-background, text-foreground), subtle 1px borders (border-border), small radius (rounded-md), and highly focused states (ring-2 ring-ring). Use zinc/slate color palette by default.",
  'Material Design 3': "Mimic Material Design 3. Use variable width rounded corners (rounded-3xl for buttons, rounded-xl for cards), tonal surface colors (bg-surface-container), and elevation shadows. Use filled icons and Fab-like buttons.",
  'Fluent UI': "Mimic Microsoft Fluent 2. Use 'Segoe UI' look-alike fonts, 4px/8px rounded corners (rounded-md), acrylic/mica effects (bg-white/80 backdrop-blur), and subtle depth shadows.",
  'Apple Human Interface': "Mimic iOS/macOS design. Use San Francisco look-alike fonts, large rounded corners (rounded-2xl or 3xl), heavy backdrop blurs (backdrop-blur-xl), transparent toolbars, and hairline borders."
};

export const PRD_TEMPLATES: Record<string, string> = {
  'SaaS Platform': "Include: Executive Summary, User Personas, Feature Requirements, Data Models, API Strategy, Security & Compliance (SOC2), Subscription/Billing Logic.",
  'Internal Tool': "Include: Operational Efficiency Goals, User Roles & RBAC Matrix, Integration Requirements (Legacy Systems), Reporting & Analytics, Training & Onboarding.",
  'Mobile Consumer App': "Include: App Store Requirements, Offline Capabilities, Push Notification Strategy, Onboarding Flow, Monetization, Social Integrations.",
  'E-commerce': "Include: Product Catalog Structure, Cart & Checkout Flow, Payment Gateway Integration, Inventory Management, Customer Support Features."
};

export const INITIAL_PRD_SECTIONS: PRDSection[] = [];

export const SYSTEM_INSTRUCTION_CORE = `You are an expert Senior Product Designer and Product Manager agent. 
Your goal is to assist the user in breaking down requirements into actionable UI designs.
Maintain a professional, systematic, and creative tone.
Prioritize clean, modern, accessibility-friendly UI patterns (using Tailwind CSS).`;
