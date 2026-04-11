export type ProjectStatus = 
  | 'Discussion' 
  | 'Proposal Sent' 
  | 'Advance Received' 
  | 'Construction' 
  | 'Work is on hold' 
  | 'Completed';

export type UserRole = 'admin' | 'employee';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
  emp_code?: string;
  designation?: string;
  DOJ?: string;
}

export interface Project {
  id: string;
  name: string;
  client_name: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  deadline: string | null; // Target completion
  completed_at: string | null;
  assigned_to: string; // User ID or Name
  last_updated: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'Todo' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  deadline: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  author: string;
  text: string;
  type: 'internal' | 'client';
  attachment_url: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

export interface PaymentStage {
  id: string;
  project_id: string;
  stage_name: string;
  amount: number;
  amount_received: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  due_date: string | null;
}
