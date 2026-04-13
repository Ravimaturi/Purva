import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  History, 
  CreditCard,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Image as ImageIcon,
  FileText,
  Edit,
  TrendingUp,
  Plus, 
  CheckCircle2 as CheckIcon, 
  Circle, 
  Trash2 as TrashIcon,
  ListTodo,
  Maximize2,
  Minimize2,
  RefreshCw,
  Briefcase,
  User as UserIcon,
  Calendar as CalendarIcon,
  Paperclip,
  CheckIcon as CheckSmallIcon
} from 'lucide-react';
import { Project, Comment, AuditLog, PaymentStage, Task } from '../types';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { cn, getInitials } from '../lib/utils';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ConfirmDialog } from './ConfirmDialog';
import { ProjectVendorOrders } from './ProjectVendorOrders';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { PROJECT_STAGES, TASK_TEMPLATES, STAGE_LABELS } from '../constants';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { KanbanBoard } from './KanbanBoard';
import { CalendarView } from './CalendarView';
import { Lightbulb } from 'lucide-react';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'MMM d, yyyy') : 'N/A';
  } catch {
    return 'N/A';
  }
};

import { TransactionComments } from './TransactionComments';

interface ProjectDetailsProps {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  initialTab?: string;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ 
  project, 
  onClose, 
  onUpdate,
  isMaximized = false,
  onToggleMaximize,
  initialTab = 'activity'
}) => {
  const { user, allUsers } = useUser();
  const { addNotification } = useNotifications();
  const { t, translateData: rawTranslateData } = useLanguage();
  
  const translateData = (data: any) => {
    if (!data) return '';
    return rawTranslateData(data);
  };
  const [comments, setComments] = useState<Comment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [paymentStages, setPaymentStages] = useState<PaymentStage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [newStageAmount, setNewStageAmount] = useState('');
  const [newStageDueDate, setNewStageDueDate] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [commentType, setCommentType] = useState<'internal' | 'client'>('internal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localPaymentAmounts, setLocalPaymentAmounts] = useState<Record<string, string>>({});
  const [localPaymentDates, setLocalPaymentDates] = useState<Record<string, string>>({});
  
  // File upload state
  const [newFileName, setNewFileName] = useState('');
  const [newFileDescription, setNewFileDescription] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Scroll to top when project changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [project.id]);
  
  // Update local payment amounts when paymentStages change
  useEffect(() => {
    const amounts: Record<string, string> = {};
    const dates: Record<string, string> = {};
    paymentStages.forEach(stage => {
      amounts[stage.id] = (stage.amount_received || 0).toString();
      dates[stage.id] = stage.received_date || '';
    });
    setLocalPaymentAmounts(amounts);
    setLocalPaymentDates(dates);
  }, [paymentStages]);
  
  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTaskDeleteDialogOpen, setIsTaskDeleteDialogOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<string | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: project.name,
    client_name: project.client_name,
    description: project.description || '',
    progress: project.progress,
    status: project.status,
    deadline: project.deadline || '',
    assigned_to: project.assigned_to || ''
  });

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      setEditData({ ...editData, progress: Math.min(100, Math.max(0, val)) });
    }
  };

  const notifyAssignee = async (action: string) => {
    if (!user) return;
    
    const assigneeNameOrId = project.assigned_to;
    if (!assigneeNameOrId) return;

    const assignee = allUsers.find(u => u.full_name === assigneeNameOrId || u.id === assigneeNameOrId);
    
    // Don't notify if the person making the change is the assignee
    if (assignee && assignee.id !== user.id) {
      await addNotification(
        'Project Update',
        `${user.full_name} ${action} on project "${project.name}"`,
        assignee.id
      );
    }
  };

  useEffect(() => {
    fetchDetails();
    setEditData({
      name: project.name,
      client_name: project.client_name,
      description: project.description || '',
      progress: project.progress,
      status: project.status,
      deadline: project.deadline || '',
      assigned_to: project.assigned_to || ''
    });
  }, [project.id]);

  const handleUpdateProject = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          ...editData,
          last_updated: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;
      
      await addNotification('Project Updated', `Project "${editData.name}" has been updated by ${user?.full_name}.`);
      await notifyAssignee('updated project details');
      
      toast.success('Project updated');
      
      // Log change
      await supabase.from('audit_logs').insert({
        project_id: project.id,
        user_id: user?.id,
        user_name: user?.full_name,
        action: 'Project Update',
        details: `Updated project details: ${Object.keys(editData).join(', ')}`,
        created_at: new Date().toISOString()
      });

      setIsEditing(false);
      onUpdate();
    } catch (err) {
      toast.error('Failed to update project');
    }
  };

  const fetchDetails = async () => {
    try {
      const [commentsRes, logsRes, paymentsRes, tasksRes, filesRes] = await Promise.all([
        supabase.from('comments').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
        supabase.from('payment_stages').select('*').eq('project_id', project.id).order('due_date', { ascending: true }),
        supabase.from('tasks').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('project_files').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
      ]);

      setComments(commentsRes.data || []);
      setAuditLogs(logsRes.data || []);
      setPaymentStages(paymentsRes.data || []);
      setTasks(tasksRes.data || []);
      setFiles(filesRes.data || []);
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileUrl.trim() || !user) return;

    setIsAddingFile(true);
    try {
      const { error } = await supabase.from('project_files').insert({
        project_id: project.id,
        name: newFileName,
        description: newFileDescription,
        url: newFileUrl,
        uploaded_by: user.id
      });

      if (error) throw error;

      toast.success('File added successfully');
      setNewFileName('');
      setNewFileDescription('');
      setNewFileUrl('');
      fetchDetails();
      
      // Log change
      await supabase.from('audit_logs').insert({
        project_id: project.id,
        user_id: user.id,
        user_name: user.full_name,
        action: 'File Added',
        details: `Added file: ${newFileName}`,
        created_at: new Date().toISOString()
      });
      
      notifyAssignee('added a new file to');
    } catch (err: any) {
      console.error('Error adding file:', err);
      toast.error(`Failed to add file: ${err.message}`);
    } finally {
      setIsAddingFile(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: project.id,
        title: newTaskTitle,
        description: newTaskDescription || null,
        assigned_to: newTaskAssignee || null,
        deadline: newTaskDeadline || null,
        status: 'Todo',
        priority: 'Medium',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Supabase error adding task:', error);
        throw error;
      }
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskAssignee('');
      setNewTaskDeadline('');
      fetchDetails();
      await notifyAssignee('added a new task');
      toast.success('Task added');
    } catch (err: any) {
      console.error('Failed to add task:', err);
      toast.error(`Failed to add task: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAddTemplateTask = (title: string) => {
    setNewTaskTitle(title);
    toast.info(`Title set to: ${title}. You can now add more details.`);
  };

  const toggleTaskStatus = async (task: Task, forcedStatus?: Task['status']) => {
    const isCompleting = forcedStatus ? forcedStatus === 'Completed' : task.status !== 'Completed';
    const newStatus = forcedStatus || (isCompleting ? 'Completed' : 'Todo');
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: isCompleting ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;
      fetchDetails();
      await notifyAssignee('updated a task status');
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async () => {
    if (!taskIdToDelete) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskIdToDelete);
      if (error) throw error;
      fetchDetails();
      await notifyAssignee('deleted a task');
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    } finally {
      setTaskIdToDelete(null);
      setIsTaskDeleteDialogOpen(false);
    }
  };

  const handleCommentChange = (text: string) => {
    setNewComment(text);
    const lastWord = text.split(/\s/).pop() || '';
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionSearch(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (userName: string) => {
    const words = newComment.split(/\s/);
    words.pop();
    const newText = [...words, `@[${userName}] `].join(' ');
    setNewComment(newText);
    setShowMentions(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        project_id: project.id,
        author: user.full_name,
        text: newComment,
        type: commentType,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      // Handle mentions
      const mentionedUserIds = new Set<string>();
      
      // 1. Explicit mentions using @[Name]
      const explicitMentions = newComment.match(/@\[([^\]]+)\]/g) || [];
      for (const mention of explicitMentions) {
        const name = mention.slice(2, -1).trim().toLowerCase();
        const mentionedUser = allUsers.find(u => u.full_name.trim().toLowerCase() === name);
        if (mentionedUser) {
          mentionedUserIds.add(mentionedUser.id);
        }
      }

      // 2. Implicit mentions using @Name
      for (const u of allUsers) {
        const name = u.full_name.trim();
        // Escape special characters in name
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`@${escapedName}(?:\\b|\\s|$)`, 'i');
        if (regex.test(newComment)) {
          mentionedUserIds.add(u.id);
        }
      }

      for (const userId of mentionedUserIds) {
        await addNotification(
          'You were tagged',
          `${user.full_name} tagged you in a comment on project "${project.name}"`,
          userId
        );
      }

      setNewComment('');
      setCommentType('internal');
      fetchDetails();
      await notifyAssignee('added a comment');
      toast.success('Comment added');
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePaymentReceived = async (stageId: string, amount: number, date?: string) => {
    try {
      const stage = paymentStages.find(s => s.id === stageId);
      if (!stage) return;

      const newStatus = amount >= stage.amount ? 'Paid' : 'Pending';
      const receivedDate = date !== undefined ? date : (localPaymentDates[stageId] || null);

      // Direct update attempt
      const { error } = await supabase
        .from('payment_stages')
        .update({ 
          status: newStatus,
          amount_received: amount,
          received_date: receivedDate
        })
        .eq('id', stageId);

      if (error) {
        console.error('Supabase update error:', error);
        // If it's a column missing error, we still want to update status at least
        if (error.message.includes('amount_received') || error.message.includes('received_date')) {
          await supabase
            .from('payment_stages')
            .update({ status: newStatus })
            .eq('id', stageId);
          toast.warning('Payment status updated, but partial amount or date tracking is unavailable in database.');
        } else {
          throw error;
        }
      } else {
        toast.success('Payment updated successfully');
      }
      
      fetchDetails();
      await notifyAssignee('updated payment details');
    } catch (err) {
      console.error('Error updating payment:', err);
      toast.error('Failed to update payment');
    }
  };

  const updatePaymentComments = async (stageId: string, newComments: string) => {
    try {
      const { error } = await supabase.from('payment_stages').update({ comments: newComments }).eq('id', stageId);
      if (error) throw error;
      fetchDetails();
    } catch (err) {
      console.error('Error updating comments:', err);
      toast.error('Failed to update comments');
    }
  };

  const updatePaymentStatus = async (stageId: string, newStatus: string) => {
    try {
      const stage = paymentStages.find(s => s.id === stageId);
      if (!stage) return;

      const { error } = await supabase
        .from('payment_stages')
        .update({ 
          status: newStatus,
          amount_received: newStatus === 'Paid' ? stage.amount : 0
        })
        .eq('id', stageId);

      if (error) throw error;
      fetchDetails();
      await notifyAssignee('updated payment status');
      toast.success('Payment status updated');
    } catch (err) {
      console.error('Error updating payment:', err);
      toast.error('Failed to update payment');
    }
  };

  const handleAddPaymentStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim() || !newStageAmount) return;

    try {
      const insertData: any = {
        project_id: project.id,
        stage_name: newStageName,
        amount: parseFloat(newStageAmount),
        status: 'Pending',
        due_date: newStageDueDate || null
      };

      // Try to include amount_received
      insertData.amount_received = 0;

      const { error } = await supabase.from('payment_stages').insert(insertData);

      if (error) {
        if (error.message.includes('amount_received')) {
          console.warn('Column amount_received missing in payment_stages table. Falling back to simple insert.');
          delete insertData.amount_received;
          const { error: fallbackError } = await supabase.from('payment_stages').insert(insertData);
          if (fallbackError) throw fallbackError;
          toast.warning('Payment stage added, but partial payment tracking is unavailable.');
        } else {
          throw error;
        }
      }
      setNewStageName('');
      setNewStageAmount('');
      setNewStageDueDate('');
      fetchDetails();
      await notifyAssignee('added a payment stage');
      toast.success('Payment stage added');
    } catch (err: any) {
      console.error('Failed to add payment stage:', err);
      toast.error(`Failed to add payment stage: ${err.message || 'Unknown error'}`);
    }
  };

  const deletePaymentStage = async (id: string) => {
    try {
      const { error } = await supabase.from('payment_stages').delete().eq('id', id);
      if (error) throw error;
      fetchDetails();
      await notifyAssignee('deleted a payment stage');
      toast.success('Payment stage deleted');
    } catch (err) {
      toast.error('Failed to delete payment stage');
    }
  };

  const handleDeleteProject = async () => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;

      await addNotification('Project Deleted', `Project "${project.name}" has been deleted.`);
      toast.success('Project deleted');
      onUpdate();
      onClose();
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const totalValue = paymentStages.reduce((sum, stage) => sum + stage.amount, 0);
  const totalReceived = paymentStages.reduce((sum, stage) => sum + (stage.amount_received || 0), 0);
  const totalPending = totalValue - totalReceived;

  // Combine tasks and comments for Activity tab
  const activityItems = [
    ...tasks.map(t => ({ ...t, activityType: 'task' as const })),
    ...comments.map(c => ({ ...c, activityType: 'comment' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 sm:px-8 py-3 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
            <Briefcase className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            {isEditing ? (
              <div className="flex flex-col gap-1 sm:gap-2">
                <Input 
                  value={editData.name} 
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="text-sm sm:text-xl font-bold h-8 sm:h-10 rounded-xl border-slate-200"
                />
                <Input 
                  value={editData.client_name} 
                  onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                  className="text-[10px] sm:text-xs h-6 sm:h-8 rounded-xl border-slate-200"
                  placeholder="Client Name"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-sm sm:text-xl font-bold text-slate-900 tracking-tight truncate">{translateData(project.name)}</h2>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-black uppercase text-[7px] sm:text-[9px] px-1.5 sm:px-2 py-0 shrink-0 tracking-tighter">
                    {t(project.status.toLowerCase().replace(/ /g, '_'))}
                  </Badge>
                </div>
                <p className="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest truncate">Client: <span className="text-slate-900">{translateData(project.client_name)}</span></p>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 sm:p-1 rounded-xl border border-slate-100">
              {onToggleMaximize && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onToggleMaximize} 
                  className="h-7 w-7 sm:w-auto sm:h-9 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 gap-2 p-0 sm:px-3"
                  title={isMaximized ? "Minimize" : "Maximize"}
                >
                  {isMaximized ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 h-4" />}
                  <span className="hidden lg:inline text-xs font-bold">{isMaximized ? "Minimize" : "Maximize"}</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchDetails} 
                className="h-7 w-7 sm:w-auto sm:h-9 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 gap-2 p-0 sm:px-3"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 h-4" />
                <span className="hidden lg:inline text-xs font-bold">{t('refresh')}</span>
              </Button>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 rounded-lg text-[9px] font-bold px-1.5 sm:px-2">{t('cancel')}</Button>
                  <Button size="sm" className="h-7 bg-indigo-600 rounded-lg text-[9px] font-bold px-2 sm:px-3" onClick={handleUpdateProject}>{t('save')}</Button>
                </div>
              ) : (
                user?.role === 'admin' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(true)} 
                    className="h-7 w-7 sm:w-auto sm:h-9 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 gap-2 p-0 sm:px-3"
                  >
                    <Edit className="w-3.5 h-3.5 sm:w-4 h-4" />
                    <span className="hidden lg:inline text-xs font-bold">{t('edit')}</span>
                  </Button>
                )
              )}
            </div>
          <Separator orientation="vertical" className="h-5 sm:h-6 hidden md:block" />
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4 sm:w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* Main Content Area (Left) */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-slate-100 bg-white lg:overflow-hidden shrink-0 lg:shrink">
          <Tabs defaultValue={initialTab} className="flex-1 flex flex-col lg:overflow-hidden">
            <div className="px-4 sm:px-8 border-b border-slate-100 bg-slate-50/30 shrink-0">
              <TabsList className="bg-transparent h-12 sm:h-14 p-0 gap-4 sm:gap-8 overflow-x-auto no-scrollbar flex-nowrap justify-start">
                <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                  {t('activity')}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                  {t('tasks')}
                </TabsTrigger>
                <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                  Files
                </TabsTrigger>
                {user?.role === 'admin' && (
                  <TabsTrigger value="payments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                    {t('payments')}
                  </TabsTrigger>
                )}
                {user?.role === 'admin' && (
                  <TabsTrigger value="vendors" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                    Vendor Orders
                  </TabsTrigger>
                )}
                <TabsTrigger value="audit" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                  {t('audit_log')}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 lg:overflow-y-auto" ref={scrollRef}>
              <div className="min-h-full flex flex-col">
                <TabsContent value="activity" className="mt-0 space-y-8 outline-none p-4 sm:p-8 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{t('recent_activity')}</h3>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">{t('add_comment')}</h4>
                      <form onSubmit={handleAddComment} className="space-y-4">
                        <div className="relative">
                          <Textarea 
                            placeholder="Share an update or ask a question..." 
                            value={newComment}
                            onChange={(e) => handleCommentChange(e.target.value)}
                            className="min-h-[100px] rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                          />
                          {showMentions && (
                            <div className="absolute bottom-full left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 mb-2 overflow-hidden">
                              <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Tag Team Member
                              </div>
                              <ScrollArea className="max-h-48">
                                {allUsers.filter(u => u.full_name.toLowerCase().includes(mentionSearch)).map(u => (
                                  <div 
                                    key={u.id}
                                    onClick={() => insertMention(u.full_name)}
                                    className="p-3 hover:bg-indigo-50 cursor-pointer flex items-center gap-3 transition-colors"
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="bg-indigo-100 text-indigo-600 text-[10px] font-bold">
                                        {getInitials(u.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-bold text-slate-700">{u.full_name}</span>
                                  </div>
                                ))}
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
                            <Button 
                              type="button"
                              variant={commentType === 'internal' ? 'secondary' : 'ghost'} 
                              size="sm" 
                              onClick={() => setCommentType('internal')}
                              className={cn("h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider", commentType === 'internal' && "bg-white shadow-sm")}
                            >
                              {t('internal_comment')}
                            </Button>
                            <Button 
                              type="button"
                              variant={commentType === 'client' ? 'secondary' : 'ghost'} 
                              size="sm" 
                              onClick={() => setCommentType('client')}
                              className={cn("h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider", commentType === 'client' && "bg-white shadow-sm")}
                            >
                              {t('client_comment')}
                            </Button>
                          </div>
                          <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 rounded-xl px-6 font-bold shadow-lg shadow-indigo-100">
                            {t('add_comment')}
                          </Button>
                        </div>
                      </form>
                    </div>

                    <div className="space-y-6">
                      {activityItems.map((item: any) => (
                        <div key={`${item.activityType}-${item.id}`} className="relative pl-10">
                          <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm z-10">
                            {item.activityType === 'task' ? (
                              <ListTodo className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <MessageSquare className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                          <div className={cn(
                            "p-4 rounded-2xl border transition-all",
                            item.activityType === 'comment' && item.type === 'client' 
                              ? "bg-amber-50 border-amber-100 shadow-sm" 
                              : "bg-white border-slate-100 shadow-sm"
                          )}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">{item.author || item.assigned_to || 'System'}</span>
                                  {item.activityType === 'comment' && item.type === 'client' && (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[8px] font-black uppercase tracking-tighter">
                                      {t('client_comment')}
                                    </Badge>
                                  )}
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {format(new Date(item.created_at), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                                {item.activityType === 'task' && (
                                  <Badge variant={item.status === 'Completed' ? 'default' : 'secondary'} className={cn(
                                    "text-[8px] font-black uppercase tracking-tighter",
                                    item.status === 'Completed' ? "bg-emerald-500" : "bg-slate-100"
                                  )}>
                                    {t(item.status.toLowerCase())}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {item.activityType === 'task' ? `${t('tasks')}: ${translateData(item.title)}` : item.text}
                              </p>
                            {item.activityType === 'task' && item.description && (
                              <p className="text-xs text-slate-400 mt-1 italic">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="tasks" className="mt-0 space-y-6 p-4 sm:p-8 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Project Tasks</h3>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 rounded-full font-bold">
                        {tasks.filter(t => t.status === 'Completed').length}/{tasks.length} Done
                      </Badge>
                    </div>
                    
                    <form onSubmit={handleAddTask} className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex flex-col gap-2">
                        <Input 
                          placeholder="What needs to be done?" 
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="rounded-xl border-slate-200 h-11 bg-white focus:bg-white transition-all w-full"
                        />
                        <Textarea 
                          placeholder="Add more details (optional)..." 
                          value={newTaskDescription}
                          onChange={(e) => setNewTaskDescription(e.target.value)}
                          className="rounded-xl border-slate-200 min-h-[80px] bg-white focus:bg-white transition-all w-full"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                          <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white flex-1">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Unassigned">Unassigned</SelectItem>
                            {user?.role === 'admin' || project.assigned_to === user?.full_name ? (
                              allUsers.map(u => (
                                <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>
                              ))
                            ) : (
                              project.assigned_to ? (
                                <SelectItem value={project.assigned_to}>{project.assigned_to}</SelectItem>
                              ) : null
                            )}
                          </SelectContent>
                        </Select>
                        <Input 
                          type="date"
                          value={newTaskDeadline}
                          onChange={(e) => setNewTaskDeadline(e.target.value)}
                          className="rounded-xl border-slate-200 h-11 bg-white flex-1"
                        />
                        <Button type="submit" className="bg-indigo-600 rounded-xl h-11 px-6 font-bold shadow-lg shadow-indigo-100 w-full sm:w-auto shrink-0">
                          Add Task
                        </Button>
                      </div>
                    </form>

                    {/* Suggested Tasks */}
                    {TASK_TEMPLATES[project.status] && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-amber-600">
                          <Lightbulb className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{t('suggestions')} for {translateData(STAGE_LABELS[project.status])}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {TASK_TEMPLATES[project.status]
                            .filter(title => !tasks.some(t => t.title === title))
                            .map(title => (
                              <button
                                key={title}
                                onClick={() => handleAddTemplateTask(title)}
                                className="text-[10px] font-bold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full hover:bg-amber-100 transition-all"
                                title="Click to fill the task name above"
                              >
                                + {translateData(title)}
                              </button>
                            ))
                          }
                          {TASK_TEMPLATES[project.status].filter(title => !tasks.some(t => t.title === title)).length === 0 && (
                            <span className="text-[10px] font-medium text-slate-400 italic">All suggested tasks for this stage have been added.</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Tip: Click a suggestion to fill the name, then add details and click "Add Task".</p>
                      </div>
                    )}

                    <div className="space-y-3 pt-2">
                      {tasks.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                          <ListTodo className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-400">No tasks created yet.</p>
                        </div>
                      ) : (
                        tasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => toggleTaskStatus(task)}
                                className={cn(
                                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                  task.status === 'Completed' 
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : "border-slate-200 text-transparent hover:border-indigo-400"
                                )}
                              >
                                <CheckSmallIcon className="w-4 h-4" />
                              </button>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-sm font-bold transition-all break-words line-clamp-2",
                                  task.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-700"
                                )}>
                                  {translateData(task.title)}
                                </span>
                                {task.description && (
                                  <p className={cn(
                                    "text-xs mt-0.5",
                                    task.status === 'Completed' ? "text-slate-300" : "text-slate-500"
                                  )}>
                                    {translateData(task.description)}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  {task.assigned_to && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <UserIcon className="w-2.5 h-2.5 text-indigo-600" />
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        {task.assigned_to}
                                      </span>
                                    </div>
                                  )}
                                  {task.deadline && (
                                    <div className="flex items-center gap-1.5">
                                      <CalendarIcon className="w-3 h-3 text-slate-400" />
                                      <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider",
                                        new Date(task.deadline) < new Date() && task.status !== 'Completed' 
                                          ? "text-red-500" 
                                          : "text-slate-400"
                                      )}>
                                        {formatDate(task.deadline)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {task.status === 'Completed' && task.completed_at && (
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Done {formatDate(task.completed_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {user?.role === 'admin' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  setTaskIdToDelete(task.id);
                                  setIsTaskDeleteDialogOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-slate-300 hover:text-red-500 transition-all"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="files" className="mt-0 space-y-8 outline-none p-4 sm:p-8 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Project Files</h3>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">Add New File Link</h4>
                      <form onSubmit={handleAddFile} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input 
                            placeholder="File Name (e.g., Site Plan)" 
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                            required
                          />
                          <Input 
                            placeholder="SharePoint URL" 
                            value={newFileUrl}
                            onChange={(e) => setNewFileUrl(e.target.value)}
                            className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                            type="url"
                            required
                          />
                        </div>
                        <Textarea 
                          placeholder="Description (optional)" 
                          value={newFileDescription}
                          onChange={(e) => setNewFileDescription(e.target.value)}
                          className="min-h-[80px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                        />
                        <Button 
                          type="submit" 
                          disabled={isAddingFile}
                          className="bg-indigo-600 rounded-xl px-6 font-bold shadow-lg shadow-indigo-100"
                        >
                          {isAddingFile ? 'Adding...' : 'Add File Link'}
                        </Button>
                      </form>
                    </div>

                    <div className="space-y-3 pt-2">
                      {files.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-400">No files added yet.</p>
                        </div>
                      ) : (
                        files.map((file) => {
                          const uploader = allUsers.find(u => u.id === file.uploaded_by);
                          return (
                            <div key={file.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex flex-col">
                                  <a 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-indigo-600 hover:underline transition-all break-words line-clamp-1"
                                  >
                                    {file.name}
                                  </a>
                                  {file.description && (
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                      {file.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                      <UserIcon className="w-3 h-3" />
                                      {uploader?.full_name || 'Unknown User'}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDate(file.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.open(file.url, '_blank')}
                                className="rounded-xl font-bold text-xs shrink-0"
                              >
                                Open Link
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="kanban" className="mt-0 p-4 sm:p-8 flex-1">
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Task Kanban Board</h3>
                      <KanbanBoard tasks={tasks} onStatusChange={toggleTaskStatus} />
                    </div>
                  </TabsContent>

                  <TabsContent value="calendar" className="mt-0 p-4 sm:p-8 flex-1">
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Task Calendar</h3>
      <CalendarView 
        events={tasks.map(t => ({
          id: t.id,
          title: t.title,
          date: t.deadline,
          status: t.status,
          type: 'task',
          project_name: project.name
        }))} 
        selectedProjectName={project.name}
      />
                    </div>
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0 space-y-8 p-4 sm:p-8 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Discussion & Updates</h3>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-full font-bold">
                        {comments.length} Comments
                      </Badge>
                    </div>

                    <form onSubmit={handleAddComment} className="relative">
                      <Textarea 
                        placeholder="Share an update or ask a question..." 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[120px] rounded-2xl border-slate-200 shadow-sm focus:ring-indigo-500 p-4 pb-14 bg-slate-50/50 focus:bg-white transition-all"
                      />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-indigo-600 font-bold text-xs">
                          <Paperclip className="w-3.5 h-3.5 mr-2" />
                          Attach File
                        </Button>
                        <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6 font-bold shadow-lg shadow-indigo-100">
                          Post Comment
                        </Button>
                      </div>
                    </form>

                    <div className="space-y-8 pt-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                            <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                              {getInitials(comment.author)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-slate-900">{comment.author}</h4>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 text-sm text-slate-600 leading-relaxed shadow-sm group-hover:shadow-md transition-all">
                              {comment.text.split(/(@\[[^\]]+\])/g).map((part, i) => {
                                if (part.startsWith('@[') && part.endsWith(']')) {
                                  const name = part.slice(2, -1);
                                  return <span key={i} className="text-indigo-600 font-bold">{name}</span>;
                                }
                                return part;
                              })}
                              {comment.attachment_url && (
                                <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group/file cursor-pointer hover:bg-indigo-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                                      <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 group-hover/file:text-indigo-600">Attachment.png</span>
                                  </div>
                                  <FileText className="w-4 h-4 text-slate-300" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {user?.role === 'admin' && (
                    <TabsContent value="payments" className="mt-0 space-y-8 p-4 sm:p-8 flex-1">
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                        <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" />
                          {t('how_it_works')}
                        </p>
                        <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
                          Add payment stages below. You can track partial payments by updating the <strong>"Amount Received"</strong> field for each stage.
                        </p>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">{t('total_value')}</p>
                        <h3 className="text-2xl font-black">₹ {totalValue.toLocaleString()}</h3>
                      </div>
                      <div className="bg-emerald-500 p-5 rounded-3xl text-white shadow-lg shadow-emerald-100 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">{t('amount_received')}</p>
                        <h3 className="text-2xl font-black">₹ {totalReceived.toLocaleString()}</h3>
                      </div>
                      <div className="bg-amber-500 p-5 rounded-3xl text-white shadow-lg shadow-amber-100 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest mb-1">{t('pending_payments')}</p>
                        <h3 className="text-2xl font-black">₹ {totalPending.toLocaleString()}</h3>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">{t('add_payment')}</h4>
                      <form onSubmit={handleAddPaymentStage} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-3">
                          <Input 
                            placeholder="Stage Name (e.g. Advance, 50% Completion)" 
                            value={newStageName}
                            onChange={(e) => setNewStageName(e.target.value)}
                            className="rounded-xl border-slate-200 bg-white"
                          />
                        </div>
                        <Input 
                          type="number" 
                          placeholder={t('amount')} 
                          value={newStageAmount}
                          onChange={(e) => setNewStageAmount(e.target.value)}
                          className="rounded-xl border-slate-200 bg-white"
                        />
                        <Input 
                          type="date" 
                          value={newStageDueDate}
                          onChange={(e) => setNewStageDueDate(e.target.value)}
                          className="rounded-xl border-slate-200 bg-white"
                        />
                        <Button type="submit" className="bg-indigo-600 rounded-xl font-bold shadow-lg shadow-indigo-100">
                          {t('add_payment')}
                        </Button>
                      </form>
                    </div>

                    <div className="space-y-4">
                      {paymentStages.map((stage) => (
                          <div key={stage.id} className="flex flex-col p-4 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3 sm:gap-5">
                                <div className={cn(
                                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0",
                                  stage.status === 'Paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                )}>
                                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 truncate">{translateData(stage.stage_name)}</h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t('due_date')} {formatDate(stage.due_date)}</p>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                                <div className="flex flex-col items-start sm:items-end gap-1">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('amount')}</p>
                                  <p className="text-sm font-black text-slate-900">₹ {stage.amount.toLocaleString()}</p>
                                </div>
                                
                                <div className="flex flex-col items-start sm:items-end gap-1 min-w-[100px]">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('amount_received')}</p>
                                  <div className="flex items-center gap-2">
                                    <Input 
                                      type="number"
                                      value={localPaymentAmounts[stage.id] || ''}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setLocalPaymentAmounts(prev => ({ ...prev, [stage.id]: val }));
                                      }}
                                      onBlur={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        updatePaymentReceived(stage.id, val);
                                      }}
                                      className="h-8 w-24 text-xs font-bold rounded-lg border-slate-200"
                                    />
                                    {stage.amount_received >= stage.amount ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-amber-500" />
                                    )}
                                  </div>
                                </div>
    
                                <div className="flex flex-col items-start sm:items-end gap-1 min-w-[120px]">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('received_date')}</p>
                                  <Input 
                                    type="date"
                                    value={localPaymentDates[stage.id] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLocalPaymentDates(prev => ({ ...prev, [stage.id]: val }));
                                      updatePaymentReceived(stage.id, parseFloat(localPaymentAmounts[stage.id]) || 0, val);
                                    }}
                                    className="h-8 w-32 text-xs font-bold rounded-lg border-slate-200"
                                  />
                                </div>
    
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => deletePaymentStage(stage.id)}
                                  className="h-9 w-9 text-slate-300 hover:text-red-500 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="w-full pt-4 mt-2 border-t border-slate-50">
                              <TransactionComments 
                                commentsJson={stage.comments} 
                                onUpdate={(newCommentsJson) => updatePaymentComments(stage.id, newCommentsJson)} 
                              />
                            </div>
                          </div>
                      ))}
                    </div>
                  </TabsContent>
                )}

                  {user?.role === 'admin' && (
                    <TabsContent value="vendors" className="mt-0 p-4 sm:p-8 flex-1">
                      <ProjectVendorOrders project={project} />
                    </TabsContent>
                  )}

                  <TabsContent value="audit" className="mt-0">
                    <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="relative pl-12">
                          <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm z-10">
                            <History className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-slate-900">{log.action}</h4>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{log.details}</p>
                            <div className="flex items-center gap-2 pt-1">
                              <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center">
                                <UserIcon className="w-2.5 h-2.5 text-indigo-600" />
                              </div>
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{log.user_name || 'System'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>

        {/* Sidebar Info (Right) */}
        <aside className="w-full lg:w-80 bg-slate-50/50 flex flex-col border-l border-slate-100 shrink-0 lg:overflow-hidden">
          <div className="flex-1 lg:overflow-y-auto">
            <div className="p-4 sm:p-8 space-y-10">
              {/* Progress Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t('progress')}</h3>
                  <span className="text-sm font-black text-indigo-600">{project.progress}%</span>
                </div>
                <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="absolute inset-y-0 left-0 bg-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tasks Done</p>
                    <p className="text-sm font-bold text-slate-900">{tasks.filter(t => t.status === 'Completed').length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payments</p>
                    <p className="text-sm font-bold text-slate-900">{paymentStages.filter(s => s.status === 'Paid').length}/{paymentStages.length}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200/50" />

              {/* Details Section */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t('about_project')}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {STAGE_LABELS[project.status] === 'Handover' ? 'Completed On' : t('target_date')}
                      </p>
                      {isEditing ? (
                        <Input 
                          type="date"
                          value={editData.deadline}
                          onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
                          className="text-sm font-bold text-slate-900 h-8 mt-1 rounded-lg border-slate-200"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">
                          {STAGE_LABELS[project.status] === 'Handover' 
                            ? formatDate(project.completed_at || project.deadline) 
                            : formatDate(project.deadline)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('project_lead')}</p>
                      {isEditing ? (
                        <Select 
                          value={editData.assigned_to} 
                          onValueChange={(v) => setEditData({ ...editData, assigned_to: v })}
                        >
                          <SelectTrigger className="h-8 mt-1 rounded-lg border-slate-200 text-sm font-bold">
                            <SelectValue placeholder="Select Lead" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Unassigned">Unassigned</SelectItem>
                            {allUsers.map(u => (
                              <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{project.assigned_to || 'Unassigned'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('current_status')}</p>
                      {isEditing ? (
                        <Select 
                          value={editData.status} 
                          onValueChange={(v) => setEditData({ ...editData, status: v as any })}
                        >
                          <SelectTrigger className="h-8 mt-1 rounded-lg border-slate-200 text-sm font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {PROJECT_STAGES.map(stage => (
                              <SelectItem key={stage} value={stage}>{translateData(STAGE_LABELS[stage])}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{translateData(STAGE_LABELS[project.status])}</p>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Progress (%)</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            value={editData.progress}
                            onChange={handleProgressChange}
                            className="text-sm font-bold text-slate-900 h-8 rounded-lg border-slate-200 w-20"
                          />
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={editData.progress}
                            onChange={(e) => setEditData({ ...editData, progress: parseInt(e.target.value) })}
                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="bg-slate-200/50" />

              {/* Description Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t('about_project')}</h3>
                {isEditing ? (
                  <Textarea 
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="text-xs text-slate-600 leading-relaxed font-medium min-h-[100px] rounded-xl border-slate-200"
                  />
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {translateData(project.description || 'No detailed description available for this project.')}
                  </p>
                )}
              </div>
              
              {isEditing && (
                <div className="pt-4">
                  <Button 
                    variant="ghost" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-bold h-10 gap-2"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete Project
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-6 border-t border-slate-100 bg-white">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold h-12 shadow-lg shadow-indigo-100 transition-all active:scale-95"
              onClick={() => isEditing ? handleUpdateProject() : setIsEditing(true)}
            >
              {isEditing ? 'Save Changes' : 'Edit Details'}
            </Button>
          </div>
        </aside>
      </div>
      <ConfirmDialog 
        open={isTaskDeleteDialogOpen}
        onOpenChange={setIsTaskDeleteDialogOpen}
        onConfirm={deleteTask}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
      />
      <ConfirmDialog 
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone and all associated data will be removed."
      />
    </div>
  );
};
