
import { GoogleGenAI, Type, Schema } from "@google/genai";
import {
  RequirementSource,
  ProjectInsight,
  PRDSection,
  ScopedFeature,
  FeatureProposal,
  FlowJourney,
  ProjectModule,
  ScreenItem,
  DesignSystemState,
  ProjectConfig,
  DesignChangePlan,
  DesignAnalysisResult,
  WireframeItem,
  PromptBlueprint,
  DesignComponent,
  ComponentType,
  AIGuideline,
  DesignVersion,
  CodeArtifact,
  ChangeImpact,
  SiteMapNode,
  UserFlowGraph,
  FlowEdge,
  FlowNode,
  UserPersona,
  UXAudit,
  ChangeProposal,
  ExecutionResult,
  ScopeDraft,
  DataModel,
  APIEndpoint,
  DataEntity
} from "../types";
import { LIBRARY_PRESETS, STYLE_GUIDES, SYSTEM_INSTRUCTION_CORE } from "../constants";

// Initialize AI Client
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// --- Helpers ---

export const formatFlowToString = (flows: FlowJourney[]): string => {
  if (!flows || flows.length === 0) return "No flows defined.";
  return flows.map(f => `Journey: ${f.title}\nSteps:\n${f.steps.map((s, i) => `${i+1}. ${s.description}`).join('\n')}`).join('\n\n');
};

export const formatPRDToString = (sections: PRDSection[]): string => {
  if (!sections || sections.length === 0) return "No PRD defined.";
  return sections.map(s => `### ${s.title} (${s.emoji}) [App: ${s.application || 'General'}]\n${s.content}`).join('\n\n');
};

export const formatDesignSystemToContext = (ds: DesignSystemState): string => {
  const colors = ds.colors.map(c => `${c.name}: ${c.value}`).join(', ');
  const typography = ds.typography.map(t => `${t.name}: ${t.value}`).join(', ');
  const components = ds.components.map(c => `Component <${c.name}> (${c.type}): ${c.description}`).join('\n');
  return `
  Design System Guidelines: ${ds.guidelines}
  Colors: ${colors}
  Typography: ${typography}
  Reusable Components:
  ${components}
  `;
};

export const buildFlowContext = (screenId: string, modules: ProjectModule[], flows: FlowJourney[]): string => {
    // Ideally find the specific flow relevant to the screen, for now return all
    return formatFlowToString(flows);
};

// --- NEW MASTER BRD & APP SPLITTING ---

export const generateMasterBRD = async (
    sources: RequirementSource[],
    insights: ProjectInsight[],
    model: string
): Promise<PRDSection[]> => {
    const ai = getAI();
    const combinedInput = sources.map(s => `Source (${s.type}): ${s.title}\n${s.content}`).join('\n\n');
    const insightContext = insights.map(i => `[${i.type}] ${i.title}: ${i.description}`).join('\n');

    const response = await ai.models.generateContent({
        model,
        contents: `
        Act as a Principal Business Analyst. 
        Create a High-Level Master Business Requirements Document (BRD) for this project.
        This document should govern the entire ecosystem, independent of specific applications.
        
        Strategic Insights:
        ${insightContext}
        
        Raw Requirements:
        ${combinedInput.slice(0, 15000)}
        
        Required Sections:
        1. Executive Summary & Business Goals
        2. Target Audience & Market Analysis
        3. Success Metrics (KPIs)
        4. High-Level Scope & Boundaries
        5. Key Stakeholders
        
        Return a JSON array of sections.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    required: ['title', 'emoji', 'content']
                }
            }
        }
    });
    
    const raw = JSON.parse(response.text || "[]");
    return raw.map((s: any) => ({ ...s, id: crypto.randomUUID(), application: 'Master' }));
};

export const suggestApplications = async (
    brd: PRDSection[],
    model: string
): Promise<string[]> => {
    const ai = getAI();
    const brdContext = formatPRDToString(brd);
    
    const response = await ai.models.generateContent({
        model,
        contents: `
        Analyze this Master BRD and identify the distinct software applications required to build this ecosystem.
        Example: "Driver Mobile App", "Admin Web Portal", "Customer Website".
        
        BRD:
        ${brdContext}
        
        Return a simple JSON array of strings naming the applications.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    
    return JSON.parse(response.text || "[]");
};

export const generateApplicationPRD = async (
    appName: string,
    brd: PRDSection[],
    sources: RequirementSource[],
    personas: UserPersona[],
    model: string
): Promise<PRDSection[]> => {
    const ai = getAI();
    const brdContext = formatPRDToString(brd);
    const personaContext = personas.map(p => `${p.name} (${p.role}): ${p.description}`).join('\n');
    // We limit source context to avoid token limits, assuming BRD captures high level essence
    const sourceContext = sources.map(s => s.content.slice(0, 1000)).join('\n\n'); 

    const response = await ai.models.generateContent({
        model,
        contents: `
        Act as a Product Manager.
        Generate a detailed Product Requirements Document (PRD) specifically for the "${appName}".
        
        Context:
        - Master BRD: ${brdContext}
        - User Personas: ${personaContext}
        
        Raw Notes:
        ${sourceContext}
        
        Focus ONLY on functionality for ${appName}.
        Include: Core Features, User Stories, Functional Requirements, Non-Functional Requirements.
        
        Return JSON array of sections.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    required: ['title', 'emoji', 'content']
                }
            }
        }
    });
    
    const raw = JSON.parse(response.text || "[]");
    return raw.map((s: any) => ({ ...s, id: crypto.randomUUID(), application: appName }));
};

// ... (Existing Functions below, unchanged mostly, just ensuring imports match)

// --- Data & API Architecture ---

export const generateDataArchitecture = async (
    prdSections: PRDSection[],
    userFlows: UserFlowGraph[],
    model: string
): Promise<{ dataModel: DataModel, apiSpecs: APIEndpoint[] }> => {
    const ai = getAI();
    const prdContext = formatPRDToString(prdSections);
    const flowContext = userFlows.map(f => `Flow: ${f.title}\nNodes: ${f.nodes.map(n => n.label).join(' -> ')}`).join('\n\n');

    const response = await ai.models.generateContent({
        model: model,
        contents: `
        Act as a Principal Database Architect and API Designer.
        Analyze the PRD and User Flows to design the backend data structure and API surface.
        
        1. Identify key Data Entities (tables) and their Fields.
        2. Define Relationships between entities (e.g. User hasMany Orders).
        3. Define REST API Endpoints required to support the User Flows (e.g. Action nodes in flows often equate to POST/PUT endpoints).
        
        PRD:
        ${prdContext.slice(0, 10000)}
        
        User Flows:
        ${flowContext.slice(0, 10000)}
        
        Return a robust JSON structure.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    entities: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                fields: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            type: { type: Type.STRING },
                                            isRequired: { type: Type.BOOLEAN },
                                            isUnique: { type: Type.BOOLEAN },
                                            description: { type: Type.STRING }
                                        },
                                        required: ['name', 'type', 'isRequired', 'isUnique']
                                    }
                                }
                            },
                            required: ['name', 'description', 'fields']
                        }
                    },
                    relationships: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                sourceEntityName: { type: Type.STRING },
                                targetEntityName: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['one-to-one', 'one-to-many', 'many-to-many'] },
                                label: { type: Type.STRING }
                            },
                            required: ['sourceEntityName', 'targetEntityName', 'type', 'label']
                        }
                    },
                    endpoints: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                method: { type: Type.STRING, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
                                path: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                requestBody: { type: Type.STRING },
                                responseBody: { type: Type.STRING },
                                relatedEntityName: { type: Type.STRING }
                            },
                            required: ['method', 'path', 'summary']
                        }
                    }
                },
                required: ['entities', 'relationships', 'endpoints']
            }
        }
    });

    const raw = JSON.parse(response.text || "{}");
    
    // Post-process to add IDs and link relationships by ID
    const entities: DataEntity[] = (raw.entities || []).map((e: any) => ({ ...e, id: crypto.randomUUID(), fields: e.fields.map((f:any) => ({...f, id: crypto.randomUUID()})) }));
    
    const relationships = (raw.relationships || []).map((r: any) => {
        const source = entities.find(e => e.name === r.sourceEntityName);
        const target = entities.find(e => e.name === r.targetEntityName);
        return {
            id: crypto.randomUUID(),
            sourceEntityId: source ? source.id : 'unknown',
            targetEntityId: target ? target.id : 'unknown',
            type: r.type,
            label: r.label
        };
    }).filter((r: any) => r.sourceEntityId !== 'unknown' && r.targetEntityId !== 'unknown');

    const apiSpecs: APIEndpoint[] = (raw.endpoints || []).map((ep: any) => {
        const related = entities.find(e => e.name === ep.relatedEntityName);
        return {
            id: crypto.randomUUID(),
            method: ep.method,
            path: ep.path,
            summary: ep.summary,
            requestBody: ep.requestBody,
            responseBody: ep.responseBody,
            entityId: related ? related.id : undefined
        };
    });

    return {
        dataModel: { entities, relationships },
        apiSpecs
    };
};

export const generateSchemaCode = async (
    dataModel: DataModel,
    format: 'prisma' | 'sql' | 'typescript',
    model: string
): Promise<string> => {
    const ai = getAI();
    
    const response = await ai.models.generateContent({
        model: model,
        contents: `
        Convert this Data Model into production-ready ${format.toUpperCase()} code.
        
        Entities:
        ${JSON.stringify(dataModel.entities)}
        
        Relationships:
        ${JSON.stringify(dataModel.relationships)}
        
        Rules:
        - Include comments.
        - Follow standard naming conventions for ${format}.
        - If Prisma, include the generator and datasource blocks (provider: postgresql).
        - If SQL, use PostgreSQL dialect.
        
        Return ONLY the code.
        `
    });

    let code = response.text || "";
    // Clean markdown
    code = code.replace(/```(prisma|sql|typescript|ts)/g, '').replace(/```/g, '');
    return code;
};

// ... (Existing Engineering & Ops Services)
// Assuming generateReactComponent, generateTestScripts, generateDevOpsConfig exist below.

export const generateReactComponent = async (
    designHtml: string,
    componentName: string,
    model: string
): Promise<CodeArtifact> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: model,
        contents: `
        Act as a Senior React Developer.
        Convert the following HTML/Tailwind preview into a production-ready React Functional Component (TypeScript).
        
        - Use 'lucide-react' for icons.
        - Ensure all props are typed.
        - Use functional state (useState) for any interactivity implied in the HTML (e.g. toggles, inputs).
        
        HTML Source:
        ${designHtml.slice(0, 15000)} 
        `,
        config: {
            systemInstruction: "Return only the raw code string. No markdown blocks.",
        }
    });

    let code = response.text || "";
    code = code.replace(/```typescript/g, '').replace(/```tsx/g, '').replace(/```/g, '');

    return {
        id: crypto.randomUUID(),
        name: `${componentName.replace(/\s+/g, '')}.tsx`,
        type: 'component',
        language: 'typescript',
        content: code,
        description: `React component for ${componentName}`
    };
};

export const generateTestScripts = async (
    flows: FlowJourney[],
    model: string
): Promise<CodeArtifact[]> => {
    const ai = getAI();
    const flowContext = formatFlowToString(flows);

    const response = await ai.models.generateContent({
        model: model,
        contents: `
        Act as a QA Automation Engineer.
        Generate Playwright (TypeScript) test scripts for the following User Flows.
        
        User Flows:
        ${flowContext}
        
        Return a JSON array of test files.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        filename: { type: Type.STRING },
                        code: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ['filename', 'code', 'description']
                }
            }
        }
    });

    const raw = JSON.parse(response.text || "[]");
    return raw.map((item: any) => ({
        id: crypto.randomUUID(),
        name: item.filename,
        type: 'test',
        language: 'typescript',
        content: item.code,
        description: item.description
    }));
};

export const generateDevOpsConfig = async (
    config: ProjectConfig,
    model: string
): Promise<CodeArtifact[]> => {
    const ai = getAI();
    
    const response = await ai.models.generateContent({
        model: model,
        contents: `
        Generate DevOps configuration files for a React/Vite application.
        Project Name: ${config.projectName}
        
        1. Dockerfile (optimized for production)
        2. GitHub Actions workflow (CI/CD)
        3. README.md (Setup instructions)
        
        Return JSON array.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        filename: { type: Type.STRING },
                        code: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ['filename', 'code', 'description']
                }
            }
        }
    });

    const raw = JSON.parse(response.text || "[]");
    return raw.map((item: any) => ({
        id: crypto.randomUUID(),
        name: item.filename,
        type: 'config',
        language: 'yaml', 
        content: item.code,
        description: item.description
    }));
};

// ... existing intake functions ...
export const transcribeAudio = async (file: File): Promise<string> => {
    const ai = getAI();
    const base64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025', 
        contents: {
            parts: [
                { inlineData: { mimeType: file.type || 'audio/mp3', data: base64 } },
                { text: "Transcribe this audio meeting recording clearly." }
            ]
        }
    });
    return response.text || "";
};

export const analyzeRequirementSource = async (source: RequirementSource, model: string): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Analyze this requirement source. Extract key features, constraints, and user goals.\n\n${source.content}`
    });
    return response.text || "";
};

export const analyzeProjectStrategy = async (sources: RequirementSource[]): Promise<ProjectInsight[]> => {
    const ai = getAI();
    const combinedInput = sources.map(s => `Source (${s.type}): ${s.title}\n${s.content}`).join('\n\n');
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze these inputs for strategic conflicts, gaps, risks, and opportunities.
        Focus on Enterprise concerns:
        - Security & Compliance (GDPR, SOC2, HIPAA)
        - Scalability & Performance
        - Legacy Integration risks
        - Workflow dead-ends
        
        Input Data:
        ${combinedInput}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['conflict', 'gap', 'risk', 'opportunity'] },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
                    },
                    required: ['type', 'title', 'description', 'severity']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    return raw.map((i: any) => ({ ...i, id: crypto.randomUUID() }));
};

export const generatePersonas = async (sources: RequirementSource[], model: string): Promise<UserPersona[]> => {
    const ai = getAI();
    const combinedInput = sources.map(s => `Source (${s.type}): ${s.title}\n${s.content}`).join('\n\n');
    const response = await ai.models.generateContent({
        model,
        contents: `Identify key user personas based on these requirements. 
        Focus on professional roles if this is a B2B/Enterprise tool.
        
        Input:
        ${combinedInput}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        role: { type: Type.STRING },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        goals: { type: Type.ARRAY, items: { type: Type.STRING } },
                        frustrations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        techLiteracy: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
                    },
                    required: ['role', 'name', 'description', 'goals', 'frustrations', 'techLiteracy']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    return raw.map((p: any) => ({ ...p, id: crypto.randomUUID() }));
};

// REPLACED BY NEW FUNCTIONS ABOVE, BUT KEPT FOR COMPATIBILITY IF NEEDED (Renamed or removed if full replacement)
export const synthesizeMasterPRD = async (
    sources: RequirementSource[], 
    insights: ProjectInsight[], 
    templateInstructions: string,
    model: string
): Promise<PRDSection[]> => {
    // This function can remain as a fallback or "Single App" mode generator
    const ai = getAI();
    const combinedInput = sources.map(s => `Source (${s.type}): ${s.title}\n${s.content}`).join('\n\n');
    const insightContext = insights.map(i => 
        `[${i.type.toUpperCase()}] ${i.title}: ${i.description}\n${i.resolution ? `RESOLUTION: ${i.resolution}` : ''}`
    ).join('\n\n');
    const response = await ai.models.generateContent({
        model,
        contents: `Synthesize a Product Requirement Document.
        
        TEMPLATE INSTRUCTIONS:
        ${templateInstructions}
        
        STRATEGIC INSIGHTS & RESOLUTIONS:
        ${insightContext}
        
        RAW REQUIREMENTS:
        ${combinedInput}
        
        Return a JSON array of sections. Use professional emojis.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    required: ['title', 'emoji', 'content']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    return raw.map((s: any) => ({ ...s, id: crypto.randomUUID() }));
};

export const refinePRDSection = async (section: PRDSection, instruction: string, fullContext: string, model: string): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Refine this PRD section based on the instruction.\n\nContext:\n${fullContext}\n\nSection to Edit:\n${section.content}\n\nInstruction: ${instruction}`
    });
    return response.text || section.content;
};

export const analyzeScope = async (sources: RequirementSource[], prd: PRDSection[]): Promise<ScopedFeature[]> => {
    const ai = getAI();
    const sourceContext = sources.map(s => `Source (${s.type}): ${s.title}\n${s.content}`).join('\n\n');
    const prdContext = formatPRDToString(prd);
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Break down the project into detailed features/stories.
        Group them by 'category' (e.g., Epic or Module).
        
        PRD Context:
        ${prdContext}
        
        Original Requirements:
        ${sourceContext}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, description: 'Epic or Module Name' },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        isSelected: { type: Type.BOOLEAN }
                    },
                    required: ['category', 'name', 'description', 'isSelected']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    return raw.map((f: any) => ({ ...f, id: crypto.randomUUID() }));
};

export const negotiateFeatureUpdate = async (
    feature: ScopedFeature,
    input: string,
    allFeatures: ScopedFeature[],
    model: string,
    depth: number
): Promise<FeatureProposal> => {
    const ai = getAI();
    const context = allFeatures.map(f => `- ${f.name}: ${f.description}`).join('\n');
    const response = await ai.models.generateContent({
        model,
        contents: `The user wants to change feature "${feature.name}".\nUser Input: ${input}\n\nExisting Features:\n${context}\n\nPropose an update and identify side effects.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    reply: { type: Type.STRING },
                    proposedFeature: {
                        type: Type.OBJECT,
                        properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
                        required: ['name', 'description']
                    },
                    sideEffects: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                featureId: { type: Type.STRING },
                                featureName: { type: Type.STRING },
                                suggestedChange: { type: Type.STRING },
                                reasoning: { type: Type.STRING },
                                isSelected: { type: Type.BOOLEAN }
                            },
                            required: ['featureName', 'suggestedChange', 'reasoning', 'isSelected']
                        }
                    }
                },
                required: ['reply', 'proposedFeature', 'sideEffects']
            }
        }
    });
    const result = JSON.parse(response.text || "{}");
    result.sideEffects = result.sideEffects.map((se: any) => {
        const match = allFeatures.find(f => f.name === se.featureName);
        return { ...se, featureId: match ? match.id : '' };
    });
    return result;
};

export const refineFeatureScope = async (
    features: ScopedFeature[],
    instruction: string,
    sources: RequirementSource[],
    model: string
): Promise<{ features: ScopedFeature[], aiComment: string }> => {
    const ai = getAI();
    const sourceContext = sources.map(s => s.content).join('\n\n').slice(0, 10000); 
    const response = await ai.models.generateContent({
        model,
        contents: `Refine this feature list based on the global instruction.
        Maintain categories.
        
        Instruction: ${instruction}
        
        Source Context:
        ${sourceContext}
        
        Current Features:
        ${JSON.stringify(features)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    features: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                category: { type: Type.STRING },
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                isSelected: { type: Type.BOOLEAN }
                            },
                            required: ['id', 'category', 'name', 'description', 'isSelected']
                        }
                    },
                    aiComment: { type: Type.STRING }
                },
                required: ['features', 'aiComment']
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const generateBranchingUserFlows = async (
    requirements: string, 
    model: string, 
    persona?: UserPersona,
    customInstruction?: string
): Promise<UserFlowGraph[]> => {
    const ai = getAI();
    const personaContext = persona ? `Target Persona: ${persona.name} (${persona.role}) - ${persona.description}` : "Target User: General";
    
    let instructions = `
        Generate a COMPLEX, MULTIDIRECTIONAL user flow based on the requirements below.
        ${personaContext}
        
        Requirements:
        ${requirements}
        
        CRITICAL RULES:
        1. Do NOT create a single straight line. Real apps have branches.
        2. Use 'decision' nodes (diamonds) for success/failure checks (e.g. "Login Success?").
        3. Create LOOPS for failure states (e.g. "Retry Login" -> Back to "Login Screen").
        4. Use 'action' nodes for backend processes (e.g. "API Call").
        5. Use 'screen' nodes for UI views.
        6. Ensure the graph is logically connected (Edges must reference valid Node IDs).
        
        Create a rich, branching graph structure.
    `;

    if (customInstruction) {
        instructions += `\n\nUSER OVERRIDE INSTRUCTION: ${customInstruction}\nPay special attention to this instruction when generating the flow.`;
    }

    const response = await ai.models.generateContent({
        model,
        contents: instructions,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        nodes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['start', 'screen', 'decision', 'action', 'end'] },
                                    label: { type: Type.STRING }
                                },
                                required: ['id', 'type', 'label']
                            }
                        },
                        edges: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    source: { type: Type.STRING },
                                    target: { type: Type.STRING },
                                    label: { type: Type.STRING }
                                },
                                required: ['source', 'target']
                            }
                        }
                    },
                    required: ['title', 'nodes', 'edges']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    return raw.map((g: any) => ({ ...g, id: crypto.randomUUID(), personaId: persona?.id }));
};

export const generateInformationArchitecture = async (
    flowContext: string, 
    requirements: string, 
    model: string,
    customInstruction?: string
): Promise<SiteMapNode[]> => {
    const ai = getAI();
    
    let instructions = `
        Generate a robust, DEEP Information Architecture (Sitemap) for an Enterprise-grade application.
        
        Rules for Enterprise IA:
        1. DEEP HIERARCHY: Do not flatten everything to the top level. Use nested Sections.
           Example: Settings (Section) -> User Management (Section) -> Users (Page), Roles (Page).
        2. GROUPING: Group related pages into 'sections' logically.
        3. ROOT: Must have a single 'root' node.
        4. UTILITY: Put login/404/legal in a Utility section.
        5. COMPLEXITY: Assume the app has many screens. Create a structure that can support 50+ screens if needed.
        
        Input Context:
        Flows: ${flowContext}
        Requirements: ${requirements}
    `;

    if (customInstruction) {
        instructions += `\n\nUSER OVERRIDE INSTRUCTION: ${customInstruction}\nStrictly follow this architectural advice.`;
    }

    const response = await ai.models.generateContent({
        model,
        contents: instructions,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['root', 'section', 'page', 'utility'] },
                        description: { type: Type.STRING },
                        children: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    name: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['section', 'page'] },
                                    description: { type: Type.STRING },
                                    children: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                id: { type: Type.STRING },
                                                name: { type: Type.STRING },
                                                type: { type: Type.STRING, enum: ['page'] },
                                                description: { type: Type.STRING }
                                            }
                                        }
                                    }
                                },
                                required: ['name', 'type', 'description']
                            }
                        }
                    },
                    required: ['name', 'type', 'description', 'children']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    const processNodes = (nodes: any[]): SiteMapNode[] => {
        return nodes.map(n => ({
            ...n,
            id: n.id || crypto.randomUUID(),
            parentId: null,
            children: n.children ? processNodes(n.children) : []
        }));
    };
    return processNodes(raw);
};

export const analyzeArchitectureNode = async (
    nodeLabel: string,
    nodeType: string,
    neighbors: { incoming: string[], outgoing: string[] },
    requirements: string,
    model: string
): Promise<{
    description: string;
    suggestion: string;
    complexity: 'low' | 'medium' | 'high';
    missingConnections: string[];
}> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `
        Analyze this single node within an application architecture.
        
        Node: "${nodeLabel}" (Type: ${nodeType})
        Connections: Incoming from [${neighbors.incoming.join(', ')}], Outgoing to [${neighbors.outgoing.join(', ')}]
        Context (PRD): ${requirements.slice(0, 5000)}
        
        Tasks:
        1. Write a professional description for this node's purpose.
        2. Suggest functionality or UI elements it should contain.
        3. Estimate development complexity.
        4. Identify missing logical connections (e.g. if it's a decision, does it have 2 outputs? if it's a form, does it go to a success state?).
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                    complexity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                    missingConnections: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['description', 'suggestion', 'complexity', 'missingConnections']
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const proposeArchitectureModifications = async (
    targetNode: any,
    instruction: string,
    context: { parents: any[], children: any[] },
    fullGraphContext: string,
    model: string
): Promise<{
    impactSummary: string;
    risk: 'high' | 'medium' | 'low';
    proposedActions: { type: 'add' | 'remove' | 'link' | 'update', label: string, detail: string }[];
}> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `
        You are a System Architect. A user wants to modify an existing architecture diagram.
        
        Target Node: "${targetNode.label}" (${targetNode.type})
        User Instruction: "${instruction}"
        
        Immediate Context:
        - Parents: ${context.parents.map(p => p.label).join(', ')}
        - Children: ${context.children.map(c => c.label).join(', ')}
        
        Full Graph Summary:
        ${fullGraphContext.slice(0, 3000)}
        
        Task:
        1. Analyze the request.
        2. Determine what nodes/edges need to be added, removed, or changed.
        3. Assess the risk (will this break the flow?).
        4. Provide a plan.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    impactSummary: { type: Type.STRING },
                    risk: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                    proposedActions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING, enum: ['add', 'remove', 'link', 'update'] },
                                label: { type: Type.STRING },
                                detail: { type: Type.STRING }
                            },
                            required: ['type', 'label', 'detail']
                        }
                    }
                },
                required: ['impactSummary', 'risk', 'proposedActions']
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const applyArchitectureModifications = async (
    currentNodes: FlowNode[],
    currentEdges: FlowEdge[],
    instruction: string,
    approvedPlan: any,
    model: string
): Promise<{ nodes: FlowNode[], edges: FlowEdge[] }> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `
        Execute the approved architectural changes.
        
        Instruction: "${instruction}"
        Plan: ${JSON.stringify(approvedPlan)}
        
        Current Nodes: ${JSON.stringify(currentNodes.map(n => ({ id: n.id, label: n.label, type: n.type })))}
        Current Edges: ${JSON.stringify(currentEdges)}
        
        Output the NEW FULL list of nodes and edges.
        - Preserve IDs for existing nodes unless deleted.
        - Generate new IDs for new nodes.
        - Ensure the graph is valid.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nodes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['start', 'screen', 'decision', 'action', 'end'] },
                                label: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['id', 'type', 'label']
                        }
                    },
                    edges: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                source: { type: Type.STRING },
                                target: { type: Type.STRING },
                                label: { type: Type.STRING }
                            },
                            required: ['source', 'target']
                        }
                    }
                },
                required: ['nodes', 'edges']
            }
        }
    });
    const result = JSON.parse(response.text || "{}");
    const nodes = result.nodes.map((n: any) => ({ ...n, id: n.id || crypto.randomUUID() }));
    const edges = result.edges.map((e: any) => ({ ...e, id: crypto.randomUUID() }));
    return { nodes, edges };
};

export const generateBaselineDesignSystem = async (config: ProjectConfig, model: string): Promise<DesignSystemState> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Generate a baseline Design System based on config: ${JSON.stringify(config)}.
        Include 5-7 semantic colors and basic typography tokens.
        Create 3 atomic components (Button, Input, Card) with Tailwind CSS code.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    colors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING } }, required: ['name', 'value'] } },
                    typography: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING } }, required: ['name', 'value'] } },
                    components: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT, 
                            properties: { 
                                name: { type: Type.STRING }, 
                                type: { type: Type.STRING, enum: ['atom', 'molecule', 'organism'] },
                                description: { type: Type.STRING },
                                code: { type: Type.STRING }
                            }, 
                            required: ['name', 'type', 'description', 'code'] 
                        } 
                    },
                    guidelines: { type: Type.STRING }
                },
                required: ['colors', 'typography', 'components', 'guidelines']
            }
        }
    });
    const raw = JSON.parse(response.text || "{}");
    if (raw.components) {
        raw.components = raw.components.map((c: any) => ({ ...c, id: crypto.randomUUID() }));
    }
    return raw as DesignSystemState;
};

export const generateVisualTokens = async (type: 'colors' | 'typography', config: ProjectConfig): Promise<{name: string, value: string}[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate ${type} tokens for a design system with style: ${config.designStyle}.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { name: { type: Type.STRING }, value: { type: Type.STRING } },
                    required: ['name', 'value']
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
};

export const generateSpecificComponent = async (
    name: string, 
    type: ComponentType, 
    description: string, 
    imageBytes: string | undefined, 
    ds: DesignSystemState, 
    config: ProjectConfig
): Promise<string> => {
    const ai = getAI();
    const parts: any[] = [];
    if (imageBytes) {
        parts.push({ inlineData: { mimeType: 'image/png', data: imageBytes } });
        parts.push({ text: "Use this image as reference for the component structure." });
    }
    parts.push({ text: `Generate HTML/Tailwind code for a ${type} named "${name}".
    Description: ${description}
    Design Config: ${JSON.stringify(config)}
    Design System Context: ${formatDesignSystemToContext(ds)}
    
    Return ONLY the raw HTML code.` });
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts }
    });
    let code = response.text || "";
    code = code.replace(/```html/g, '').replace(/```/g, '');
    return code;
};

export const generateScreenWireframe = async (
    screen: ScreenItem, 
    module: ProjectModule | undefined, 
    context: string, 
    model: string
): Promise<WireframeItem[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Generate a wireframe structure for screen "${screen.name}".
        Description: ${screen.description}
        Module: ${module?.title}
        Context: ${context}
        
        List the sections from top to bottom.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        sectionName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        essentialElements: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['sectionName', 'description', 'essentialElements']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    return raw.map((w: any) => ({ ...w, id: crypto.randomUUID() }));
};

export const refineWireframe = async (
    items: WireframeItem[], 
    instruction: string, 
    screenName: string, 
    model: string
): Promise<WireframeItem[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Refine this wireframe for "${screenName}" based on instruction: "${instruction}".
        Current Structure: ${JSON.stringify(items)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        sectionName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        essentialElements: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['sectionName', 'description', 'essentialElements']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    return raw.map((w: any) => ({ ...w, id: crypto.randomUUID() }));
};

export const generatePromptBlueprint = async (
    screen: ScreenItem, 
    wireframe: WireframeItem[], 
    context: string, 
    config: ProjectConfig, 
    model: string
): Promise<PromptBlueprint> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Create a detailed Prompt Blueprint for screen "${screen.name}".
        Wireframe: ${JSON.stringify(wireframe)}
        Context: ${context}
        Style: ${config.designStyle}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    layoutInstructions: { type: Type.STRING },
                    visualStyle: { type: Type.STRING },
                    componentUsage: { type: Type.STRING },
                    interactivity: { type: Type.STRING }
                },
                required: ['layoutInstructions', 'visualStyle', 'componentUsage', 'interactivity']
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const generateDesignCode = async (
    prompt: string, 
    dsContext: string, 
    config: ProjectConfig, 
    model: string
): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Generate HTML/Tailwind CSS code for a UI screen.
        
        ${prompt}
        
        Design System Context:
        ${dsContext}
        
        Project Config:
        ${JSON.stringify(config)}
        
        Requirements:
        - Use Tailwind CSS via CDN.
        - Return ONLY the full HTML code.
        - Ensure it is responsive.
        `,
    });
    let code = response.text || "";
    code = code.replace(/```html/g, '').replace(/```/g, '');
    return code;
};

export const planDesignModifications = async (
    code: string, 
    prompt: string, 
    screenName: string, 
    context: string, 
    model: string
): Promise<DesignChangePlan> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Plan design changes for screen "${screenName}".
        User Request: ${prompt}
        Context: ${context}
        Current Code Snippet (first 2000 chars): ${code.slice(0, 2000)}...
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    addedElements: { type: Type.ARRAY, items: { type: Type.STRING } },
                    removedElements: { type: Type.ARRAY, items: { type: Type.STRING } },
                    modifiedStyles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    riskAssessment: { type: Type.STRING }
                },
                required: ['summary', 'addedElements', 'removedElements', 'modifiedStyles', 'riskAssessment']
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const executeDesignModifications = async (
    code: string, 
    prompt: string, 
    screenName: string, 
    plan: DesignChangePlan, 
    dsContext: string, 
    context: string, 
    model: string,
    selectionHtml?: string,
    imageBytes?: string
): Promise<{ code: string, summary: string }> => {
    const ai = getAI();
    const parts: any[] = [];
    if (imageBytes) {
        parts.push({ inlineData: { mimeType: 'image/png', data: imageBytes } });
    }
    let instructions = `Apply changes to the HTML code for "${screenName}".
    User Request: ${prompt}
    Execution Plan: ${JSON.stringify(plan)}
    Design System: ${dsContext}
    Context: ${context}
    
    Input Code:
    ${code}`;
    if (selectionHtml) {
        instructions += `\n\nFOCUSED UPDATE: The user explicitly selected this element to modify:\n${selectionHtml}\n\nPrioritize updating this element and its children.`;
    }
    parts.push({ text: instructions });
    const response = await ai.models.generateContent({
        model,
        contents: { parts }
    });
    let newCode = response.text || "";
    newCode = newCode.replace(/```html/g, '').replace(/```/g, '');
    return { code: newCode, summary: "Changes applied successfully." };
};

export const analyzeDesignAdaptation = async (code: string, ds: DesignSystemState): Promise<DesignAnalysisResult> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this HTML code against the Design System.
        Identify used components and suggest NEW components or colors that should be added to the system.
        
        Code: ${code.slice(0, 5000)}...
        
        Current DS: ${JSON.stringify(ds)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    usedComponents: { type: Type.ARRAY, items: { type: Type.STRING } },
                    newComponents: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT, 
                            properties: { 
                                name: { type: Type.STRING }, 
                                type: { type: Type.STRING, enum: ['atom', 'molecule', 'organism'] },
                                description: { type: Type.STRING },
                                code: { type: Type.STRING }
                            },
                            required: ['name', 'type', 'description', 'code']
                        } 
                    },
                    newColors: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { name: { type: Type.STRING }, value: { type: Type.STRING } },
                            required: ['name', 'value']
                        }
                    }
                },
                required: ['usedComponents', 'newComponents', 'newColors']
            }
        }
    });
    const raw = JSON.parse(response.text || "{}");
    if (raw.newComponents) {
        raw.newComponents = raw.newComponents.map((c: any) => ({ ...c, id: crypto.randomUUID() }));
    }
    return raw;
};

export const runUXAudit = async (code: string, persona: UserPersona | undefined, model: string): Promise<UXAudit> => {
    const ai = getAI();
    const personaContext = persona 
      ? `Persona: ${persona.name} (${persona.role}). ${persona.description}. Goals: ${persona.goals.join(', ')}. Frustrations: ${persona.frustrations.join(', ')}.`
      : "Persona: General User";
    const response = await ai.models.generateContent({
        model,
        contents: `Perform a UX Audit on this UI code.
        ${personaContext}
        
        Code: ${code.slice(0, 10000)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER },
                    heuristicAnalysis: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                category: { type: Type.STRING, enum: ['Usability', 'Accessibility', 'Consistency'] },
                                rating: { type: Type.STRING, enum: ['Good', 'Fair', 'Poor'] },
                                observation: { type: Type.STRING }
                            },
                            required: ['category', 'rating', 'observation']
                        }
                    },
                    personaReaction: {
                        type: Type.OBJECT,
                        properties: {
                            personaName: { type: Type.STRING },
                            sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'frustrated'] },
                            quote: { type: Type.STRING }
                        },
                        required: ['personaName', 'sentiment', 'quote']
                    },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['score', 'heuristicAnalysis', 'personaReaction', 'suggestions']
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const proposeSmartChange = async (
    request: string,
    currentModules: ProjectModule[],
    currentFlows: FlowJourney[],
    designSystemSummary: string,
    model: string,
    previousProposal?: ChangeProposal
): Promise<ChangeProposal> => {
    const ai = getAI();
    const structureContext = currentModules.map(m => ({
        id: m.id,
        title: m.title,
        screens: m.screens.map(s => ({ id: s.id, name: s.name, description: s.description }))
    }));
    const flowContext = currentFlows.map(f => f.title).join(', ');
    let prompt = `
    Act as a Lead Product Architect.
    The user wants to make a change to the project structure.
    
    User Request: "${request}"
    
    Current Structure:
    ${JSON.stringify(structureContext)}
    
    Current User Flows:
    ${flowContext}
    
    Design System Guidelines:
    ${designSystemSummary}
    
    Task:
    1. Analyze the impact of this change on the WHOLE system (Dependencies, Broken Flows, Design consistency).
    2. Propose a specific plan of action.
    3. If this is a high-risk change (e.g. deleting a core screen), warn the user.
    `;
    if (previousProposal) {
        prompt += `
        \n\nPREVIOUS ITERATION:
        The user rejected the previous plan: "${previousProposal.description}"
        Refine the plan based on the NEW User Request above.
        `;
    }
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    impactAnalysis: {
                        type: Type.OBJECT,
                        properties: {
                            severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                            summary: { type: Type.STRING },
                            brokenLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
                            sideEffects: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['severity', 'summary', 'brokenLinks', 'sideEffects']
                    },
                    proposedActions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING, enum: ['delete', 'update', 'create', 'move'] },
                                targetId: { type: Type.STRING },
                                targetName: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['type', 'targetId', 'targetName', 'description']
                        }
                    }
                },
                required: ['title', 'description', 'impactAnalysis', 'proposedActions']
            }
        }
    });
    const result = JSON.parse(response.text || "{}");
    return { ...result, id: crypto.randomUUID() };
};

export const executeSmartChange = async (
    proposal: ChangeProposal,
    currentModules: ProjectModule[],
    currentFlows: FlowJourney[],
    model: string
): Promise<ExecutionResult> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: model,
        contents: `
        Execute the following Change Proposal on the project data.
        
        Proposal:
        ${JSON.stringify(proposal)}
        
        Current Modules:
        ${JSON.stringify(currentModules)}
        
        Current Flows:
        ${JSON.stringify(currentFlows)}
        
        Instructions:
        - Return the FULL updated list of Modules and Flows.
        - Ensure IDs are preserved for items that are not deleted.
        - Generate new IDs for new items.
        - Heal any broken flow steps if screens were deleted.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    updatedModules: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                screens: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            name: { type: Type.STRING },
                                            description: { type: Type.STRING }
                                        },
                                        required: ['name', 'description']
                                    }
                                }
                            },
                            required: ['title', 'description', 'screens']
                        }
                    },
                    updatedFlows: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                steps: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { description: { type: Type.STRING } },
                                        required: ['description']
                                    }
                                }
                            },
                            required: ['title', 'steps']
                        }
                    },
                    summary: { type: Type.STRING }
                },
                required: ['updatedModules', 'updatedFlows', 'summary']
            }
        }
    });
    const result = JSON.parse(response.text || "{}");
    const processedModules = (result.updatedModules || []).map((mod: any) => {
        const existingMod = currentModules.find(m => m.title === mod.title);
        const modId = existingMod ? existingMod.id : crypto.randomUUID();
        const screens = mod.screens.map((scr: any) => {
            let match: ScreenItem | undefined;
            for (const m of currentModules) {
                match = m.screens.find(s => s.name === scr.name || s.id === scr.id);
                if (match) break;
            }
            if (match) {
                return { ...match, moduleId: modId, name: scr.name, description: scr.description };
            } else {
                return {
                    id: crypto.randomUUID(),
                    moduleId: modId,
                    name: scr.name,
                    description: scr.description,
                    status: 'pending'
                };
            }
        });
        return { ...mod, id: modId, screens };
    });
    return {
        updatedModules: processedModules,
        updatedFlows: result.updatedFlows,
        summary: result.summary
    };
};

export const analyzeChangeImpact = async (
    targetScreen: ScreenItem,
    action: 'delete' | 'replace',
    replaceWith: string,
    allScreens: ScreenItem[],
    flows: FlowJourney[]
): Promise<ChangeImpact> => {
    const ai = getAI();
    const flowContext = formatFlowToString(flows);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the impact of ${action}ing screen "${targetScreen.name}".
        ${action === 'replace' ? `Replacement: ${replaceWith}` : ''}
        
        Flows:
        ${flowContext}
        
        All Screens:
        ${allScreens.map(s => s.name).join(', ')}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    impactSummary: { type: Type.STRING },
                    affectedFlows: { type: Type.ARRAY, items: { type: Type.STRING } },
                    adjacentScreens: { type: Type.ARRAY, items: { type: Type.STRING } },
                    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
                },
                required: ['impactSummary', 'affectedFlows', 'adjacentScreens', 'severity']
            }
        }
    });
    return JSON.parse(response.text || "{}") as ChangeImpact;
};

export const applyChangeAndHeal = async (
    targetScreen: ScreenItem,
    action: 'delete' | 'replace',
    replaceWith: string,
    allScreens: ScreenItem[],
    flows: FlowJourney[]
): Promise<{ updatedFlows: FlowJourney[], updatedScreens: ScreenItem[] }> => {
    const ai = getAI();
    const flowContext = formatFlowToString(flows);
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Perform a healing operation on the project structure.
        Action: ${action} screen "${targetScreen.name}".
        ${action === 'replace' ? `Replace with: ${replaceWith}` : ''}
        
        1. Rewrite the User Flows to accommodate this change.
        2. Update the names/descriptions of adjacent screens if their context changes.
        
        Input Flows:
        ${flowContext}
        
        Input Screens:
        ${JSON.stringify(allScreens.map(s => ({ id: s.id, name: s.name, description: s.description })))}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    updatedFlows: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                steps: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { description: { type: Type.STRING } },
                                        required: ['description']
                                    }
                                }
                            },
                            required: ['title', 'steps']
                        }
                    },
                    updatedScreens: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                name: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['id', 'name', 'description']
                        }
                    }
                },
                required: ['updatedFlows', 'updatedScreens']
            }
        }
    });
    const result = JSON.parse(response.text || "{}");
    return result;
};

export const extractAIGuidelinesFromPRD = async (prd: PRDSection[], model: string): Promise<AIGuideline[]> => {
    const ai = getAI();
    const prdContext = formatPRDToString(prd);
    const response = await ai.models.generateContent({
        model: model,
        contents: `Extract explicit AI Guidelines from this PRD.
        Look for Personas, Technical Constraints, Business Rules, and Style/Tone instructions.
        
        PRD:
        ${prdContext}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        category: { type: Type.STRING, enum: ['persona', 'technical', 'business', 'style', 'other'] },
                        content: { type: Type.STRING }
                    },
                    required: ['title', 'category', 'content']
                }
            }
        }
    });
    const raw = JSON.parse(response.text || "[]");
    return raw.map((g: any) => ({ ...g, id: crypto.randomUUID(), isActive: true }));
};
