
import { 
  RequirementSource, 
  ProjectInsight, 
  FlowJourney, 
  ProjectModule, 
  DesignSystemState, 
  PRDSection, 
  DesignVersion, 
  AISystemState, 
  ProjectConfig, 
  ScopeDraft, 
  ScopedFeature,
  UserPersona,
  SiteMapNode,
  UserFlowGraph,
  WireframeItem,
  PromptBlueprint,
  UXAudit,
  DataModel,
  APIEndpoint,
  AIGuideline
} from './types';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  theme: 'dark' | 'light';
  config: ProjectConfig;
  sources: RequirementSource[];
  insights: ProjectInsight[];
  userPersonas: UserPersona[];
  masterBrd: PRDSection[]; // NEW
  prd: PRDSection[];
  siteMap: SiteMapNode[];
  userFlows: UserFlowGraph[];
  flow: FlowJourney[];
  dataModel: DataModel; // NEW
  apiSpecs: APIEndpoint[]; // NEW
  modules: ProjectModule[];
  designSystem: DesignSystemState;
  aiSystem: AISystemState;
  scopeDrafts: ScopeDraft[];
}

// ==========================================
// SCENARIO: HEALTHCARE PLATFORM (MediFlow)
// ==========================================

const HEALTH_SOURCES: RequirementSource[] = [
    {
      id: 'src-h1',
      title: 'Product Brief: MediFlow Enterprise Platform',
      type: 'brief',
      isExpanded: true,
      content: `**Healthcare Operations & Pharmacy Platform — Product Brief**

**Overview**
This platform is an integrated healthcare technology system designed to support medication management, care coordination, operational workflow, and compliance tracking within modern healthcare environments. It connects patients, providers, pharmacists, and operational teams through a unified digital infrastructure to ensure safe, traceable, and efficient healthcare delivery.

The system combines real-world healthcare operations with structured digital workflows to improve transparency, accountability, and patient outcomes.

**Purpose**
Healthcare organizations require accurate coordination, documentation, and regulatory alignment across clinical and medication processes. This platform provides a centralized environment to:
- Manage prescription and medication workflows
- Enable coordination between care providers and pharmacy teams
- Maintain structured documentation and operational traceability
- Monitor compliance and verification processes
- Improve patient adherence and continuity of care

**Platform Scope**
The platform operates as a multi-layer ecosystem rather than a single application.

**1. Patient Application**
Designed for individuals managing medications and treatment plans.
*Core capabilities:*
- Prescription refill, transfer, and tracking
- Medication reminders and adherence support
- Delivery tracking and notifications
- Direct communication with pharmacy professionals
- Personalized medication and care assistance

**2. Provider Application**
Designed for doctors, clinics, and healthcare providers.
*Core capabilities:*
- Digital prescription management
- Coordination with pharmacy and care teams
- Monitoring prescription fulfillment and patient adherence
- Streamlining medication-related workflows
- Reducing administrative workload

**3. Pharmacy & Operations Platform**
Supports internal healthcare and pharmacy workflow management.
*Core capabilities:*
- Prescription processing and workflow tracking
- Coordination across patient, provider, and pharmacy roles
- Medication verification and safety processes
- Operational documentation and traceability
- Fulfillment and delivery monitoring

**4. Compliance & Verification Layer**
Ensures accountability and regulatory alignment across healthcare operations.
*Core capabilities:*
- Audit and verification tracking
- Evidence and documentation management
- Structured operational logs
- Compliance monitoring and reporting
- Generation of review-ready documentation

**Key Characteristics**
- Integrated healthcare ecosystem
- Workflow and documentation driven
- Built for clarity and structured information handling
- Supports operational transparency and compliance tracking
- Optimized for digital use, reporting, and print/export formats

**Primary Users**
- Patients
- Healthcare providers and prescribers
- Pharmacy and operations teams
- Compliance and quality teams
- Healthcare administrators

**Value Proposition**
The platform improves healthcare delivery by connecting medication management, care coordination, operational workflows, and compliance processes into a single structured system. It enhances care quality, increases operational visibility, and ensures accountability across the healthcare lifecycle.`
    },
    {
        id: 'src-h2',
        title: 'Transcript: Compliance Officer Interview',
        type: 'transcript',
        isExpanded: false,
        content: `[Interviewer]: What is the biggest risk in the current manual verification process?

[Compliance Officer]: It's the lack of "hard stops". Right now, a pharmacist can override a drug interaction warning by just shouting across the room "Is this okay?". There's no digital record of *why* they approved it. 

[Interviewer]: So you need forced documentation?

[Compliance Officer]: Exactly. If the system flags a high-severity interaction, the "Approve" button should be disabled until they select a clinical justification code from a dropdown.

[Interviewer]: What about audit trails?

[Compliance Officer]: We need to know who looked at a patient's record, when, and for how long. HIPAA requires us to track "Break the Glass" events where a provider accesses a VIP patient or a file they aren't assigned to.

[Interviewer]: Does this apply to the mobile app too?

[Compliance Officer]: Yes. If a patient changes their own dosage reminders, we need to log that it was self-initiated, not doctor-ordered. The chain of custody for the data is critical for the Compliance Layer mentioned in the brief.`
    },
    {
        id: 'src-h3',
        title: 'Technical Spec: HL7 & FHIR Standards',
        type: 'notes',
        isExpanded: false,
        content: `**Interoperability:**
- Must support **FHIR R4** resources for Patient, MedicationRequest, and Observation to connect Provider and Pharmacy apps.
- **HL7 v2.x** ADT feeds for patient admission/discharge events from hospital EMRs.
- **NCPDP SCRIPT v2017071** for e-prescribing transmission.

**Security Constraints:**
- End-to-end encryption (TLS 1.3).
- Data at rest encryption (AES-256).
- OAuth 2.0 / OpenID Connect for Single Sign-On (SSO) across the Provider and Ops portals.
- Role-Based Access Control (RBAC) with minimal privilege principle.

**Performance:**
- Pharmacy Ops Cockpit requires <200ms latency for barcode scans.
- Patient App must support offline mode for medication reminders (local caching required).`
    },
    {
        id: 'src-h4',
        title: 'Email: Patient Feedback Summary (Q3)',
        type: 'email',
        isExpanded: false,
        content: `From: UX Research Team
To: Product Management
Subject: Patient Beta Feedback - Q3

Hi Team,

We consolidated feedback from the 50 patients in the beta pilot. Key takeaways relevant to the "Personalized medication assistance" goal:

1. **Confusion on Refills:** Elderly patients (65+) don't understand the difference between "Auto-Refill" and "Request Refill". We need clearer language or visual cues.
2. **Login Fatigue:** Patients hate entering their password every time. Can we implement FaceID/Biometrics? This conflicts with the "hard login" requirement from security but improves adherence.
3. **Pill Identification:** Patients love the idea of seeing a picture of their pill, but our current images are too small. They want to zoom in to verify markings.

Please prioritize Biometrics for the next sprint.

Thanks,
Jenny`
    }
];

const HEALTH_INSIGHTS: ProjectInsight[] = [
    {
        id: 'ins-h1',
        type: 'risk',
        title: 'Regulatory Non-Compliance Liability',
        description: 'The "Compliance & Verification Layer" is critical. If the audit trail fails to capture a specific override code or "Break the Glass" event, the organization faces severe HIPAA penalties.',
        severity: 'high'
    },
    {
        id: 'ins-h2',
        type: 'conflict',
        title: 'Security vs. Usability (ER Access)',
        description: 'Providers in Emergency Rooms need instant access to patient records (Provider App), but strict MFA and session timeouts (Security Specs) may delay critical care. We need a "Fast Pass" protocol for ER devices.',
        severity: 'high'
    },
    {
        id: 'ins-h3',
        type: 'gap',
        title: 'Offline Capabilities',
        description: 'The brief mentions "modern environments", but hospitals often have dead zones. The Provider App currently lacks a robust offline mode for queuing prescriptions when connectivity is lost.',
        severity: 'medium'
    },
    {
        id: 'ins-h4',
        type: 'opportunity',
        title: 'Predictive Supply Chain',
        description: 'By connecting the "Pharmacy Ops Platform" inventory data with "Provider App" prescribing trends, we can use AI to predict medication shortages before they happen.',
        severity: 'medium'
    }
];

const HEALTH_PERSONAS: UserPersona[] = [
    {
        id: 'pers-h1',
        role: 'Patient (Elderly)',
        name: 'Linda Johnson',
        description: '68-year-old retired teacher managing hypertension and diabetes. Struggles with small text and complex navigation.',
        goals: ['Never miss a dose', 'Easy refill ordering', 'Clear instructions'],
        frustrations: ['Remembering passwords', 'Small fonts', 'Confusing medical jargon'],
        techLiteracy: 'low'
    },
    {
        id: 'pers-h2',
        role: 'Pharmacist',
        name: 'Mark Davis',
        description: 'High-volume retail pharmacist verifying 400+ scripts a day. Needs speed, keyboard shortcuts, and zero latency.',
        goals: ['Patient safety', 'Workflow efficiency', 'Zero errors'],
        frustrations: ['Too many clicks', 'Slow loading screens', 'Alert fatigue (too many popups)'],
        techLiteracy: 'high'
    },
    {
        id: 'pers-h3',
        role: 'Compliance Officer',
        name: 'Sarah Miller',
        description: 'Detail-oriented auditor ensuring the platform meets HIPAA and DEA standards. Needs granular logs and reports.',
        goals: ['Audit readiness', 'Risk mitigation', 'Process transparency'],
        frustrations: ['Unstructured data', 'Missing timestamps', 'Inability to export logs'],
        techLiteracy: 'medium'
    }
];

const HEALTH_MASTER_BRD: PRDSection[] = [
    { id: 'h-brd-1', title: 'Vision', emoji: '👁️', content: 'To become the leading integrated platform for healthcare operations, bridging the gap between clinical prescription, pharmacy fulfillment, and patient adherence through a unified, compliant digital ecosystem.' },
    { id: 'h-brd-2', title: 'Target Audience', emoji: '👥', content: '1. **Clinicians**: Doctors requiring efficient e-prescribing.\n2. **Pharmacy Teams**: Operational staff managing high-volume verification.\n3. **Patients**: Individuals with chronic conditions requiring adherence support.\n4. **Auditors**: Compliance teams needing granular traceability.' },
    { id: 'h-brd-3', title: 'Regulatory Constraints', emoji: '⚖️', content: 'Strict adherence to HIPAA (USA), GDPR (EU), and DEA requirements for EPCS (Electronic Prescribing of Controlled Substances). Must support FHIR interoperability standards.' },
    { id: 'h-brd-4', title: 'Success Metrics', emoji: '📈', content: '- Reduction in medication errors by 40%.\n- Increase in patient adherence scores by 25%.\n- Reduction in pharmacy verification time by 15 seconds per script.' }
];

const HEALTH_DATA_MODEL: DataModel = {
    entities: [
        { 
            id: 'ent-h1', name: 'Patient', description: 'The subject of care.', 
            fields: [
                { id: 'hf1', name: 'id', type: 'UUID', isRequired: true, isUnique: true, description: 'FHIR ID' },
                { id: 'hf2', name: 'mrn', type: 'String', isRequired: true, isUnique: true, description: 'Medical Record Number' },
                { id: 'hf3', name: 'dob', type: 'Date', isRequired: true, isUnique: false },
                { id: 'hf4', name: 'allergies', type: 'JSON', isRequired: false, isUnique: false }
            ]
        },
        { 
            id: 'ent-h2', name: 'Prescription', description: 'Instruction to dispense medication.', 
            fields: [
                { id: 'hf5', name: 'id', type: 'UUID', isRequired: true, isUnique: true },
                { id: 'hf6', name: 'status', type: 'Enum', isRequired: true, isUnique: false, description: 'ACTIVE, ON_HOLD, COMPLETED, CANCELLED' },
                { id: 'hf7', name: 'sig', type: 'String', isRequired: true, isUnique: false, description: 'Dosage instructions (e.g. 1 tab PO daily)' }
            ]
        },
        { 
            id: 'ent-h3', name: 'Medication', description: 'Drug definition.', 
            fields: [
                { id: 'hf8', name: 'ndc', type: 'String', isRequired: true, isUnique: true, description: 'National Drug Code' },
                { id: 'hf9', name: 'proprietaryName', type: 'String', isRequired: true, isUnique: false }
            ]
        },
        {
            id: 'ent-h4', name: 'AuditLog', description: 'Compliance tracking for all actions.',
            fields: [
                { id: 'hf10', name: 'id', type: 'UUID', isRequired: true, isUnique: true },
                { id: 'hf11', name: 'actorId', type: 'UUID', isRequired: true, isUnique: false },
                { id: 'hf12', name: 'actionType', type: 'String', isRequired: true, isUnique: false },
                { id: 'hf13', name: 'timestamp', type: 'DateTime', isRequired: true, isUnique: false }
            ]
        }
    ],
    relationships: [
        { id: 'rel-h1', sourceEntityId: 'ent-h1', targetEntityId: 'ent-h2', type: 'one-to-many', label: 'has prescriptions' },
        { id: 'rel-h2', sourceEntityId: 'ent-h2', targetEntityId: 'ent-h3', type: 'one-to-one', label: 'is for medication' }
    ]
};

const HEALTH_API_SPECS: APIEndpoint[] = [
    { id: 'hapi-1', method: 'GET', path: '/api/fhir/Patient/{id}', summary: 'Retrieve patient demographics and alerts.', entityId: 'ent-h1' },
    { id: 'hapi-2', method: 'POST', path: '/api/fhir/MedicationRequest', summary: 'Submit a new electronic prescription.', entityId: 'ent-h2' },
    { id: 'hapi-3', method: 'GET', path: '/api/ops/queue', summary: 'Get current pharmacy verification queue.', entityId: 'ent-h2' },
    { id: 'hapi-4', method: 'POST', path: '/api/compliance/audit', summary: 'Log a system action for compliance.', entityId: 'ent-h4' }
];

const HEALTH_PRD: PRDSection[] = [
    {
        id: 'prd-h-1',
        application: 'Patient Application',
        title: 'Core Features',
        emoji: '📱',
        content: '- **Medication Wallet:** Digital list of all active scripts with images of pills.\n- **One-Tap Refill:** Simplified ordering logic with insurance pre-check.\n- **Smart Reminders:** Push notifications based on dosage schedule (Morning/Evening).\n- **Secure Messaging:** Direct encrypted channel to pharmacy staff.'
    },
    {
        id: 'prd-h-2',
        application: 'Provider Application',
        title: 'Clinical Workspace',
        emoji: '🩺',
        content: '- **e-Prescribe Suite:** Fast, error-checked order entry with favorites list.\n- **Adherence Dashboard:** Red/Yellow/Green indicators for patient medication compliance.\n- **Prior Auth Assistant:** Automated handling of insurance approvals.'
    },
    {
        id: 'prd-h-3',
        application: 'Pharmacy & Operations Platform',
        title: 'Fulfillment Features',
        emoji: '💊',
        content: '- **C-Verify Cockpit:** High-speed split-screen verification interface (Image vs. Data).\n- **Inventory Intelligence:** AI-driven stock management and predictive ordering.\n- **Clinical Alerts:** Integrated Drug Utilization Review (DUR) with hard stops for severe interactions.'
    },
    {
        id: 'prd-h-4',
        application: 'Compliance & Verification Layer',
        title: 'Audit Features',
        emoji: '🛡️',
        content: '- **Universal Audit Trail:** Immutable logs of every record access and modification.\n- **Override Tracking:** Mandatory justification prompts for safety alerts.\n- **Report Generator:** One-click export for DEA/HIPAA audits.'
    }
];

const HEALTH_AI_GUIDELINES: AIGuideline[] = [
    { id: 'aig-1', title: 'Patient Safety First', category: 'business', content: 'Any action that could impact patient safety (e.g. ignoring a drug interaction) must require a secondary confirmation or explicit override reason.', isActive: true },
    { id: 'aig-2', title: 'HIPAA Data Minimization', category: 'technical', content: 'Only display the minimum necessary PHI. Mask SSN and DOB where possible. Use "break-the-glass" patterns for sensitive records.', isActive: true },
    { id: 'aig-3', title: 'Accessible Typography', category: 'style', content: 'Use high contrast text (WCAG AAA) and large tap targets (min 44px) for the Patient App to support elderly users.', isActive: true },
    { id: 'aig-4', title: 'Operational Speed', category: 'style', content: 'For the Pharmacy Ops Platform, prioritize information density and keyboard navigation. Avoid animations that slow down the workflow.', isActive: true }
];

const HEALTH_SITEMAP: SiteMapNode[] = [
  {
    id: 'root-health', name: 'MediFlow Ecosystem', type: 'root', description: 'Healthcare Platform', parentId: null, children: [
      {
        id: 'app-pharmacy', name: 'Pharmacy Ops Console', type: 'section', description: 'High-volume fulfillment.', parentId: 'root-health', children: [
          { id: 'scr-queue', name: 'Master Queue', type: 'page', description: 'All incoming orders.', parentId: 'app-pharmacy', children: [] },
          { id: 'scr-verify', name: 'Verification Cockpit', type: 'page', description: 'Safety check interface.', parentId: 'app-pharmacy', children: [] }
        ]
      },
      {
        id: 'app-patient', name: 'Patient App', type: 'section', description: 'Mobile app.', parentId: 'root-health', children: [
          { id: 'scr-pat-home', name: 'My Health', type: 'page', description: 'Dashboard.', parentId: 'app-patient', children: [] },
          { id: 'scr-pat-wallet', name: 'Med Wallet', type: 'page', description: 'Active prescriptions.', parentId: 'app-patient', children: [] }
        ]
      },
      {
        id: 'app-compliance', name: 'Compliance Portal', type: 'section', description: 'Audit & Reporting.', parentId: 'root-health', children: [
          { id: 'scr-audit', name: 'Audit Log Viewer', type: 'page', description: 'Searchable history of all actions.', parentId: 'app-compliance', children: [] }
        ]
      }
    ]
  }
];

const HEALTH_VERIFY_CODE = `
<div class="flex flex-col h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
  
  <!-- Critical App Header -->
  <header class="h-14 bg-slate-900 text-white flex items-center justify-between px-4 flex-shrink-0 shadow-lg z-30 border-b border-teal-500">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 font-bold text-lg tracking-tight">
        <div class="w-8 h-8 bg-teal-600 rounded flex items-center justify-center shadow-lg shadow-teal-500/50">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12m-6-6h12"/></svg>
        </div>
        <span class="text-teal-50">MediFlow</span><span class="text-teal-400">Ops</span>
      </div>
      <div class="h-6 w-px bg-white/20"></div>
      <nav class="flex gap-2">
        <button class="px-3 py-1.5 bg-teal-600 rounded text-xs font-bold text-white shadow-inner flex items-center gap-2 ring-1 ring-teal-400">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
           Verify (C-Verify)
        </button>
        <button class="px-3 py-1.5 hover:bg-white/10 rounded text-xs font-medium text-slate-300 transition-colors">Queue</button>
      </nav>
    </div>
    
    <div class="flex items-center gap-4">
       <div class="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
          <span class="text-xs font-mono text-slate-300">Provider Link: Live</span>
       </div>
       <div class="text-right">
          <div class="text-xs font-bold text-white">Mark Davis</div>
          <div class="text-[10px] text-slate-400">Ops Lead</div>
       </div>
    </div>
  </header>

  <!-- Patient Context Banner (Sticky) -->
  <div class="bg-white border-b border-slate-300 p-3 shadow-sm z-20 flex justify-between items-center">
      <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-slate-100 border-2 border-slate-300 rounded-lg flex items-center justify-center text-slate-600 font-bold text-xl">LJ</div>
          <div>
             <div class="flex items-baseline gap-2">
                <h1 class="text-xl font-bold text-slate-900">JOHNSON, LINDA</h1>
                <span class="text-sm text-slate-500 font-mono">DOB: 01/12/1955 (69y)</span>
                <span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded border border-blue-200 uppercase tracking-wide">Adherence Risk</span>
             </div>
             <div class="flex items-center gap-4 text-xs mt-1">
                <span class="font-bold text-slate-600">Provider: <span class="font-normal text-slate-800">Dr. S. Chen</span></span>
                <span class="font-bold text-slate-600">Plan: <span class="font-normal text-slate-800">BlueCross Gold</span></span>
             </div>
          </div>
      </div>
      <div class="flex gap-2">
          <div class="text-right px-4 border-r border-slate-200">
             <div class="text-[10px] font-bold text-slate-400 uppercase">Allergies</div>
             <div class="text-sm font-bold text-red-600 flex items-center gap-1 justify-end"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> SULFA</div>
          </div>
      </div>
  </div>

  <!-- Main Workspace -->
  <div class="flex-1 flex overflow-hidden">
    
    <!-- Left: Order Source (CPOE) -->
    <div class="w-[350px] bg-slate-50 flex flex-col border-r border-slate-300 shadow-inner overflow-hidden">
       <div class="bg-slate-200 px-4 py-2 border-b border-slate-300 flex justify-between items-center">
          <span class="text-xs font-bold text-slate-600 uppercase">Incoming Script</span>
          <span class="text-[10px] bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-500">#RX-99210</span>
       </div>
       <div class="p-4 space-y-4 overflow-y-auto">
          <!-- Drug Card -->
          <div class="bg-white border-l-4 border-l-blue-500 border border-slate-200 p-4 rounded shadow-sm">
             <div class="flex justify-between items-start mb-2">
                <div class="font-bold text-blue-700 text-lg">Lisinopril</div>
                <div class="text-xs font-mono text-slate-400">Oral Tablet</div>
             </div>
             <div class="space-y-1 text-sm">
                <div class="flex justify-between border-b border-slate-100 pb-1">
                   <span class="text-slate-500">Dose:</span>
                   <span class="font-bold">10 mg</span>
                </div>
                <div class="flex justify-between border-b border-slate-100 pb-1">
                   <span class="text-slate-500">Qty:</span>
                   <span class="font-bold">90 (Ninety)</span>
                </div>
                <div class="flex justify-between pt-1">
                   <span class="text-slate-500">Sig:</span>
                   <span class="font-bold text-slate-800">1 Tab PO Daily</span>
                </div>
             </div>
          </div>

          <!-- Clinical Alerts -->
          <div class="bg-amber-50 border border-amber-200 p-3 rounded">
             <div class="flex items-center gap-2 mb-1 text-amber-700 font-bold text-xs uppercase">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Interaction Warning
             </div>
             <p class="text-xs text-amber-900 leading-snug">Moderate interaction with current Metformin prescription. Monitor for hypoglycemia.</p>
          </div>
       </div>
    </div>

    <!-- Center: Verification Form -->
    <div class="flex-1 bg-white flex flex-col min-w-0 relative">
       <div class="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
             <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">Dispense Product Selection</h3>
             <div class="grid grid-cols-2 gap-6">
                <div class="col-span-2">
                   <label class="block text-xs font-bold text-slate-500 mb-1">Product</label>
                   <div class="relative">
                      <input type="text" value="Lisinopril 10mg Tab (Generic)" class="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" />
                      <div class="absolute right-3 top-3 text-green-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                   </div>
                </div>
             </div>
          </div>
       </div>
       <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-20">
          <div class="flex items-center gap-4">
             <button class="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 px-4 py-2 rounded hover:bg-red-50 transition-colors">
                Reject Order
             </button>
          </div>
          <div class="flex gap-3">
             <button class="px-8 py-3 bg-teal-600 text-white font-bold text-sm rounded shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all transform active:scale-95 flex items-center gap-2">
                Verify & Dispense
             </button>
          </div>
       </div>
    </div>
  </div>
</div>
`;

const HEALTH_MODULES: ProjectModule[] = [
    {
        id: 'mod-h-3',
        title: 'Pharmacy Operations',
        description: 'Fulfillment and Safety Layer.',
        isExpanded: true,
        screens: [
            {
                id: 'scr-verify',
                moduleId: 'mod-h-3',
                name: 'Verification Cockpit',
                description: 'A split-screen interface for validating script data against scanned images with integrated clinical alerts.',
                status: 'designed',
                designCode: HEALTH_VERIFY_CODE
            }
        ]
    }
];

const HEALTH_DS: DesignSystemState = {
  guidelines: 'Use a "Bio-Safe" aesthetic. High contrast text (Slate-900 on White). Semantic Colors (Red=Stop, Yellow=Warning, Teal=Primary). Rounded-xl corners.',
  colors: [
    { name: 'Clinical Teal', value: '#0d9488' },
    { name: 'Deep Slate', value: '#0f172a' },
    { name: 'Critical Red', value: '#dc2626' }
  ],
  typography: [
    { name: 'UI Sans', value: 'font-sans text-sm text-slate-600' },
    { name: 'Heading', value: 'font-sans text-xl font-bold text-slate-900' }
  ],
  components: []
};

const HEALTH_AI: AISystemState = {
    guidelines: HEALTH_AI_GUIDELINES
};

const HEALTH_FEATURES: ScopedFeature[] = [
  { id: 'feat-h-1', category: 'Patient App', name: 'Medication Wallet', description: 'Digital script list.', isSelected: true },
  { id: 'feat-h-2', category: 'Provider Portal', name: 'Adherence Dashboard', description: 'Risk indicators.', isSelected: true },
  { id: 'feat-h-3', category: 'Pharmacy Ops', name: 'C-Verify Cockpit', description: 'Safety check UI.', isSelected: true },
  { id: 'feat-h-4', category: 'Compliance', name: 'Audit Log Generator', description: 'Reporting tool.', isSelected: true }
];

const HEALTH_DRAFTS: ScopeDraft[] = [
    {
        id: 'draft-h-1',
        name: 'MediFlow Enterprise Scope',
        timestamp: Date.now() - 172800000, 
        sourceCount: 4,
        features: HEALTH_FEATURES
    }
];

// ==========================================
// EXPORT SCENARIO MAP
// ==========================================

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  'health': {
    id: 'health',
    name: 'MediFlow Enterprise Platform',
    description: 'An integrated ecosystem for Healthcare Operations. Connects Patients, Providers, and Pharmacy Ops in a unified compliance-ready environment.',
    theme: 'light',
    config: {
        projectName: "MediFlow Enterprise",
        designStyle: 'Professional',
        designLibrary: 'Custom',
        primaryColor: 'teal',
        borderRadius: 'lg',
        customInstructions: "Prioritize patient safety, data clarity, and role-based workflows. Use a 'Bio-Safe' teal aesthetic with high-contrast text."
    },
    sources: HEALTH_SOURCES,
    insights: HEALTH_INSIGHTS,
    userPersonas: HEALTH_PERSONAS,
    masterBrd: HEALTH_MASTER_BRD,
    prd: HEALTH_PRD,
    siteMap: HEALTH_SITEMAP,
    userFlows: [],
    flow: [],
    dataModel: HEALTH_DATA_MODEL,
    apiSpecs: HEALTH_API_SPECS,
    modules: HEALTH_MODULES,
    designSystem: HEALTH_DS,
    aiSystem: HEALTH_AI,
    scopeDrafts: HEALTH_DRAFTS
  }
};
