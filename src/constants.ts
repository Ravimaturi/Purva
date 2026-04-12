import { ProjectStatus } from './types';

export const PROJECT_STAGES: ProjectStatus[] = [
  'Discussion',
  'Advance Received',
  'Construction',
  'Work is on hold',
  'Completed'
];

export const STAGE_LABELS: Record<ProjectStatus, string> = {
  'Discussion': 'Discussion',
  'Advance Received': 'Design & Prep',
  'Construction': 'In Progress',
  'Work is on hold': 'On Hold',
  'Completed': 'Handover'
};

export const TASK_TEMPLATES: Record<ProjectStatus, string[]> = {
  'Discussion': [
    'Draft Preliminary Proposal',
    'Generate Rough Concept Sketches',
    'Conduct Initial Site Measurements',
    'Client Requirement Sign-off',
    'Follow-up: Advance Payment',
    'Execute Work Order / Contract',
    'Request Technical Site Survey',
    'Finalize Resource Budget'
  ],
  'Advance Received': [
    'Develop Detailed Section Drawings',
    'Issue Stone/Idol Purchase Order',
    'Issue Brass Idol Fabrication Order',
    'Procure Dwajasthambam Log',
    'Finalize Temple Cost Estimates',
    'Initiate 3D Model Production',
    'Civil Work Update: Week 1'
  ],
  'Construction': [
    'Review/Approve Revised Drawings',
    'Map Section & Layer Planes',
    'Detail Elevation Ornaments',
    'Sign Primary Sub-Contractor Agreement',
    'Sign Ancillary Vendor Contracts',
    'Weekly Structural Site Inspection'
  ],
  'Work is on hold': [
    'Document Site Halt Reason',
    'Contractual Terms Re-validation',
    'Quarterly Status Site Visit',
    'Resource Demobilization Log'
  ],
  'Completed': [
    'Verify Final Payment Status',
    'Audit Labor & Skill Expenses',
    'Schedule Consecration Ceremony',
    'Archive Project Documentation'
  ]
};
