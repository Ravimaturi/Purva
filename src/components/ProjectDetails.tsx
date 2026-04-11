import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  MessageSquare, 
  RefreshCw,
  History, 
  CreditCard,
  Send,
  Paperclip,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Image as ImageIcon,
  FileText,
  Edit,
  Briefcase
} from 'lucide-react';
import { Project, Comment, AuditLog, PaymentStage, Task } from '../types';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
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
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { 
  Plus, 
  CheckCircle2 as CheckIcon, 
  Circle, 
  Trash2 as TrashIcon,
  ListTodo,
  Trash2
} from 'lucide-react';
import { PROJECT_STAGES, USERS } from '../constants';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { KanbanBoard } from './KanbanBoard';
import { CalendarView } from './CalendarView';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'MMM d, yyyy') : 'N/A';
  } catch {
    return 'N/A';
  }
};

interface ProjectDetailsProps {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onClose, onUpdate }) => {
  const { user } = useUser();
  const { addNotification } = useNotifications();
  const [comments, setComments] = useState<Comment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [paymentStages, setPaymentStages] = useState<PaymentStage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [newStageAmount, setNewStageAmount] = useState('');
  const [newStageDueDate, setNewStageDueDate] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
      const [commentsRes, logsRes, paymentsRes, tasksRes] = await Promise.all([
        supabase.from('comments').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
        supabase.from('payment_stages').select('*').eq('project_id', project.id).order('due_date', { ascending: true }),
        supabase.from('tasks').select('*').eq('project_id', project.id).order('created_at', { ascending: true })
      ]);

      setComments(commentsRes.data || []);
      setAuditLogs(logsRes.data || []);
      setPaymentStages(paymentsRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: project.id,
        title: newTaskTitle,
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
      setNewTaskAssignee('');
      setNewTaskDeadline('');
      fetchDetails();
      toast.success('Task added');
    } catch (err: any) {
      console.error('Failed to add task:', err);
      toast.error(`Failed to add task: ${err.message || 'Unknown error'}`);
    }
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
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      fetchDetails();
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
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
        type: 'internal',
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      setNewComment('');
      fetchDetails();
      toast.success('Comment added');
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePaymentStatus = async (stageId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('payment_stages')
        .update({ status: newStatus })
        .eq('id', stageId);

      if (error) throw error;
      fetchDetails();
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
      const { error } = await supabase.from('payment_stages').insert({
        project_id: project.id,
        stage_name: newStageName,
        amount: parseFloat(newStageAmount),
        status: 'Pending',
        due_date: newStageDueDate || null
      });

      if (error) throw error;
      setNewStageName('');
      setNewStageAmount('');
      setNewStageDueDate('');
      fetchDetails();
      toast.success('Payment stage added');
    } catch (err) {
      toast.error('Failed to add payment stage');
    }
  };

  const deletePaymentStage = async (id: string) => {
    try {
      const { error } = await supabase.from('payment_stages').delete().eq('id', id);
      if (error) throw error;
      fetchDetails();
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
  const totalReceived = paymentStages.filter(s => s.status === 'Paid').reduce((sum, stage) => sum + stage.amount, 0);
  const totalPending = totalValue - totalReceived;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
            <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            {isEditing ? (
              <div className="flex flex-col gap-1 sm:gap-2">
                <Input 
                  value={editData.name} 
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="text-sm sm:text-xl font-bold h-7 sm:h-8 rounded-lg border-slate-200"
                />
                <Input 
                  value={editData.client_name} 
                  onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                  className="text-[10px] sm:text-xs h-5 sm:h-6 rounded-lg border-slate-200"
                  placeholder="Client Name"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">{project.name}</h2>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold uppercase text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0 shrink-0">
                    {project.status}
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Client: <span className="text-slate-900 font-bold">{project.client_name}</span></p>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchDetails} 
                className="h-7 sm:h-8 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-bold">Refresh</span>
              </Button>
              {isEditing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 sm:h-8 rounded-lg text-[10px] sm:text-xs font-bold px-2">Cancel</Button>
                  <Button size="sm" className="h-7 sm:h-8 bg-indigo-600 rounded-lg text-[10px] sm:text-xs font-bold px-3 sm:px-4" onClick={handleUpdateProject}>Save</Button>
                </>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(true)} 
                  className="h-7 sm:h-8 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 gap-2"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs font-bold">Edit</span>
                </Button>
              )}
            </div>
          <Separator orientation="vertical" className="h-5 sm:h-6 hidden sm:block" />
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4 sm:w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Content Area (Left) */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-slate-100 bg-white">
          <Tabs defaultValue="tasks" className="flex-1 flex flex-col">
            <div className="px-8 border-b border-slate-100 bg-slate-50/30">
              <TabsList className="bg-transparent h-14 p-0 gap-4 sm:gap-8 overflow-x-auto no-scrollbar flex-nowrap">
                <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-xs uppercase tracking-widest whitespace-nowrap">
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="kanban" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-xs uppercase tracking-widest whitespace-nowrap">
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="calendar" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-xs uppercase tracking-widest whitespace-nowrap">
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="comments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-xs uppercase tracking-widest whitespace-nowrap">
                  Comments
                </TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-xs uppercase tracking-widest whitespace-nowrap">
                  Payments
                </TabsTrigger>
                <TabsTrigger value="audit" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 font-bold text-slate-400 data-[state=active]:text-indigo-600 text-xs uppercase tracking-widest whitespace-nowrap">
                  Audit Log
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-8">
                  <TabsContent value="tasks" className="mt-0 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Project Tasks</h3>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 rounded-full font-bold">
                        {tasks.filter(t => t.status === 'Completed').length}/{tasks.length} Done
                      </Badge>
                    </div>
                    
                    <form onSubmit={handleAddTask} className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input 
                          placeholder="What needs to be done?" 
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="rounded-xl border-slate-200 h-11 bg-white focus:bg-white transition-all flex-1"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                          <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white flex-1">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Unassigned">Unassigned</SelectItem>
                            {USERS.map(u => (
                              <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>
                            ))}
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
                                <CheckIcon className="w-4 h-4" />
                              </button>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-sm font-bold transition-all",
                                  task.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-700"
                                )}>
                                  {task.title}
                                </span>
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
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 text-slate-300 hover:text-red-500 transition-all"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="kanban" className="mt-0">
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Task Kanban Board</h3>
                      <KanbanBoard tasks={tasks} onStatusChange={toggleTaskStatus} />
                    </div>
                  </TabsContent>

                  <TabsContent value="calendar" className="mt-0">
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Task Calendar</h3>
                      <CalendarView 
                        events={tasks.map(t => ({
                          id: t.id,
                          title: t.title,
                          date: t.deadline,
                          status: t.status,
                          type: 'task'
                        }))} 
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0 space-y-8">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Discussion</h3>
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
                              {comment.text}
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

                  <TabsContent value="payments" className="mt-0 space-y-8">
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                      <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        How it works
                      </p>
                      <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
                        Add payment stages below. Once a stage is marked as <strong>"Paid"</strong>, the amount will be added to the <strong>"Received"</strong> total and tracked in your Dashboard.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Total Value</p>
                        <h3 className="text-2xl font-black">₹ {totalValue.toLocaleString()}</h3>
                      </div>
                      <div className="bg-emerald-500 p-5 rounded-3xl text-white shadow-lg shadow-emerald-100 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">Received</p>
                        <h3 className="text-2xl font-black">₹ {totalReceived.toLocaleString()}</h3>
                      </div>
                      <div className="bg-amber-500 p-5 rounded-3xl text-white shadow-lg shadow-amber-100 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest mb-1">Pending</p>
                        <h3 className="text-2xl font-black">₹ {totalPending.toLocaleString()}</h3>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">New Payment Stage</h4>
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
                          placeholder="Amount (₹)" 
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
                          Add Stage
                        </Button>
                      </form>
                    </div>

                    <div className="space-y-4">
                      {paymentStages.map((stage) => (
                        <div key={stage.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center gap-5">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                              stage.status === 'Paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{stage.stage_name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Due {formatDate(stage.due_date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-base font-black text-slate-900">₹ {stage.amount.toLocaleString()}</p>
                              <Button 
                                size="sm"
                                variant={stage.status === 'Paid' ? "secondary" : "default"}
                                onClick={() => updatePaymentStatus(stage.id, stage.status === 'Paid' ? 'Pending' : 'Paid')}
                                className={cn(
                                  "h-7 rounded-lg text-[10px] font-bold uppercase tracking-widest mt-1 px-3",
                                  stage.status === 'Paid' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none" : "bg-indigo-600 hover:bg-indigo-700"
                                )}
                              >
                                {stage.status === 'Paid' ? 'Paid' : 'Mark as Paid'}
                              </Button>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deletePaymentStage(stage.id)}
                              className="opacity-0 group-hover:opacity-100 h-9 w-9 text-slate-300 hover:text-red-500 transition-all"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

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
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        {/* Sidebar Info (Right) */}
        <aside className="w-full lg:w-80 bg-slate-50/50 flex flex-col border-l border-slate-100 shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-8 space-y-10">
              {/* Progress Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Overall Progress</h3>
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
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Project Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {project.status === 'Completed' ? 'Completed On' : 'Target Date'}
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
                          {project.status === 'Completed' 
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
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Project Lead</p>
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
                            {USERS.map(u => (
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
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Status</p>
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
                              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{project.status}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200/50" />

              {/* Description Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">About Project</h3>
                {isEditing ? (
                  <Textarea 
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="text-xs text-slate-600 leading-relaxed font-medium min-h-[100px] rounded-xl border-slate-200"
                  />
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {project.description || 'No detailed description available for this project.'}
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
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
          
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
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone and all associated data will be removed."
      />
    </div>
  );
};
