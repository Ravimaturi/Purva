import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { PROJECT_STAGES, USERS, TASK_TEMPLATES, STAGE_LABELS } from '../constants';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

import { useNotifications } from '../contexts/NotificationContext';
import { useUser } from '../contexts/UserContext';

export const NewProjectDialog: React.FC<NewProjectDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const { addNotification } = useNotifications();
  const { user, allUsers } = useUser();
  const { translateData } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    description: '',
    status: PROJECT_STAGES[0],
    assigned_to: USERS[0].full_name,
    deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          ...formData,
          progress: 0,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Automatically insert tasks based on the initial status
      const templates = TASK_TEMPLATES[formData.status] || [];
      if (templates.length > 0 && projectData) {
        const tasksToInsert = templates.map(title => ({
          project_id: projectData.id,
          title,
          status: 'Todo',
          priority: 'Medium',
          assigned_to: formData.assigned_to,
          deadline: formData.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }));

        const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
        if (tasksError) {
          console.error('Error inserting template tasks:', tasksError);
          toast.error('Project created, but failed to add initial tasks.');
        }
      }

      await addNotification('New Project Created', `Project "${formData.name}" has been created by ${user?.full_name || 'an employee'}.`);
      
      // Notify assignee
      if (formData.assigned_to && user && formData.assigned_to !== user.full_name) {
        const assignee = allUsers.find(u => u.full_name === formData.assigned_to || u.id === formData.assigned_to);
        if (assignee && assignee.id !== user.id) {
          await addNotification(
            'New Project Assigned',
            `${user.full_name} assigned you to a new project: "${formData.name}"`,
            assignee.id
          );
        }
      }
      
      toast.success('Project created successfully with initial tasks');
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        client_name: '',
        description: '',
        status: PROJECT_STAGES[0],
        assigned_to: USERS[0].full_name,
        deadline: '',
      });
    } catch (err: any) {
      console.error('Error creating project:', err);
      toast.error(`Failed to create project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-slate-400">Project Name</Label>
            <Input 
              id="name" 
              required 
              placeholder="e.g. Mahadev Temple Construction"
              className="rounded-xl border-slate-200"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client" className="text-xs font-bold uppercase tracking-widest text-slate-400">Client Name</Label>
            <Input 
              id="client" 
              required 
              placeholder="e.g. Dharma Trust"
              className="rounded-xl border-slate-200"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v as any })}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PROJECT_STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{translateData(STAGE_LABELS[stage])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Assigned To</Label>
              <Select 
                value={formData.assigned_to} 
                onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {USERS.map(user => (
                    <SelectItem key={user.id} value={user.full_name}>{user.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline" className="text-xs font-bold uppercase tracking-widest text-slate-400">Deadline</Label>
            <Input 
              id="deadline" 
              type="date" 
              className="rounded-xl border-slate-200"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-slate-400">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Project details and requirements..."
              className="rounded-xl border-slate-200 min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-8 shadow-lg shadow-indigo-100"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
