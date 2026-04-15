import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { CheckCircle2, Circle, Plus, Loader2, Trash2, User as UserIcon, Clock, RotateCcw, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { DESIGN_ITEMS, OBSERVATION_ITEMS, STONE_CONSTRUCTION_ITEMS, CEMENT_CONSTRUCTION_ITEMS } from '../lib/checklistTemplates';
import { toast } from 'sonner';
import { useUser } from '../contexts/UserContext';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';

interface ProjectChecklistProps {
  projectId: string;
}

interface ChecklistItem {
  id: string;
  project_id: string;
  stage: string;
  category: string;
  task_name: string;
  is_completed: boolean;
  order_index: number;
  target_date?: string;
  entry_date?: string;
}

interface ItemAudit {
  user_name: string;
  created_at: string;
}

export const ProjectChecklist: React.FC<ProjectChecklistProps> = ({ projectId }) => {
  const { user } = useUser();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [itemAudits, setItemAudits] = useState<Record<string, ItemAudit>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [materialType, setMaterialType] = useState<'stone' | 'cement' | 'both'>('stone');
  const [newTaskName, setNewTaskName] = useState('');
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklistAndAudits();
  }, [projectId]);

  const fetchChecklistAndAudits = async () => {
    try {
      const [checklistResponse, auditResponse] = await Promise.all([
        supabase
          .from('project_checklists')
          .select('*')
          .eq('project_id', projectId)
          .order('order_index', { ascending: true }),
        supabase
          .from('audit_logs')
          .select('*')
          .eq('project_id', projectId)
          .eq('action', 'Checklist Item Completed')
          .order('created_at', { ascending: false })
      ]);

      if (checklistResponse.error) throw checklistResponse.error;
      
      setItems(checklistResponse.data || []);

      // Map audits to items (latest completion per item)
      const audits: Record<string, ItemAudit> = {};
      if (auditResponse.data) {
        auditResponse.data.forEach(log => {
          // log.details contains the item.id
          if (!audits[log.details]) {
            audits[log.details] = {
              user_name: log.user_name,
              created_at: log.created_at
            };
          }
        });
      }
      setItemAudits(audits);

    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePlan = async () => {
    setIsGenerating(true);
    try {
      const newItems: Partial<ChecklistItem>[] = [];
      let order = 0;

      // Add Design Items
      DESIGN_ITEMS.forEach(item => {
        newItems.push({
          project_id: projectId,
          stage: 'Design & Prep',
          category: 'Design',
          task_name: item,
          is_completed: false,
          order_index: order++
        });
      });

      // Add Observation Items
      OBSERVATION_ITEMS.forEach(item => {
        newItems.push({
          project_id: projectId,
          stage: 'Design & Prep',
          category: 'Observations',
          task_name: item,
          is_completed: false,
          order_index: order++
        });
      });

      // Add Construction Items based on material
      let constructionItems = STONE_CONSTRUCTION_ITEMS;
      let categoryName = 'Construction (Stone)';
      
      if (materialType === 'cement') {
        constructionItems = CEMENT_CONSTRUCTION_ITEMS;
        categoryName = 'Construction (Cement)';
      } else if (materialType === 'both') {
        // Import BOTH_CONSTRUCTION_ITEMS from templates
        const { BOTH_CONSTRUCTION_ITEMS } = await import('../lib/checklistTemplates');
        constructionItems = BOTH_CONSTRUCTION_ITEMS;
        categoryName = 'Construction (Stone & Cement)';
      }

      constructionItems.forEach(item => {
        newItems.push({
          project_id: projectId,
          stage: 'In Progress',
          category: categoryName,
          task_name: item,
          is_completed: false,
          order_index: order++
        });
      });

      const { error } = await supabase.from('project_checklists').insert(newItems);
      if (error) throw error;

      toast.success('Execution plan generated successfully!');
      fetchChecklistAndAudits();
    } catch (error) {
      console.error('Error generating plan:', error);
      toast.error('Failed to generate execution plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItem = async (id: string, currentStatus: boolean, taskName: string) => {
    try {
      // Optimistic update
      setItems(items.map(item => item.id === id ? { ...item, is_completed: !currentStatus } : item));
      
      const { error } = await supabase
        .from('project_checklists')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      // Log to AuditLog if completed
      if (!currentStatus && user) {
        await supabase.from('audit_logs').insert([{
          project_id: projectId,
          user_id: user.id,
          user_name: user.full_name,
          action: 'Checklist Item Completed',
          details: id // Store item ID to map it back
        }]);
        
        // Refresh to get the new audit log
        fetchChecklistAndAudits();
      }
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Failed to update task');
      fetchChecklistAndAudits(); // Revert on error
    }
  };

  const updateEntryDate = async (id: string, date: string) => {
    try {
      // Optimistic update
      setItems(items.map(item => item.id === id ? { ...item, entry_date: date } : item));
      
      const { error } = await supabase
        .from('project_checklists')
        .update({ entry_date: date })
        .eq('id', id);

      if (error) throw error;
      toast.success('Entry date updated');
    } catch (error) {
      console.error('Error updating entry date:', error);
      toast.error('Failed to update entry date');
      fetchChecklistAndAudits(); // Revert on error
    }
  };

  const addCustomTask = async (category: string, stage: string) => {
    if (!newTaskName.trim()) return;

    try {
      const categoryItems = items.filter(i => i.category === category);
      const maxOrder = categoryItems.length > 0 ? Math.max(...categoryItems.map(i => i.order_index)) : 0;

      const { error } = await supabase.from('project_checklists').insert([{
        project_id: projectId,
        stage,
        category,
        task_name: newTaskName.trim(),
        is_completed: false,
        order_index: maxOrder + 1
      }]);

      if (error) throw error;
      
      setNewTaskName('');
      setAddingToCategory(null);
      fetchChecklistAndAudits();
      toast.success('Custom task added');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const moveItem = async (item: ChecklistItem, direction: 'up' | 'down') => {
    const categoryItems = items.filter(i => i.category === item.category).sort((a, b) => a.order_index - b.order_index);
    const currentIndex = categoryItems.findIndex(i => i.id === item.id);
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === categoryItems.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapItem = categoryItems[swapIndex];

    try {
      // Optimistic update
      const newItems = items.map(i => {
        if (i.id === item.id) return { ...i, order_index: swapItem.order_index };
        if (i.id === swapItem.id) return { ...i, order_index: item.order_index };
        return i;
      });
      setItems(newItems);

      // Update in DB
      await Promise.all([
        supabase.from('project_checklists').update({ order_index: swapItem.order_index }).eq('id', item.id),
        supabase.from('project_checklists').update({ order_index: item.order_index }).eq('id', swapItem.id)
      ]);
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast.error('Failed to reorder tasks');
      fetchChecklistAndAudits(); // Revert
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const { error } = await supabase.from('project_checklists').delete().eq('id', itemToDelete);
      if (error) throw error;
      setItems(items.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const confirmReset = async () => {
    try {
      const { error } = await supabase
        .from('project_checklists')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;

      toast.success('Execution plan reset successfully');
      setIsResetConfirmOpen(false);
      fetchChecklistAndAudits();
    } catch (error) {
      console.error('Error resetting plan:', error);
      toast.error('Failed to reset execution plan');
    }
  };

  const downloadReport = () => {
    const headers = ['Stage', 'Category', 'Task Name', 'Status', 'Entry Date', 'Completed By', 'Completed At'];
    
    // Sort items by category and order_index
    const sortedItems = [...items].sort((a, b) => {
      if (a.category === b.category) {
        return a.order_index - b.order_index;
      }
      return a.category.localeCompare(b.category);
    });

    const csvContent = [
      headers.join(','),
      ...sortedItems.map(item => {
        const audit = itemAudits[item.id];
        const completedBy = audit ? audit.user_name : '';
        const completedAt = audit ? format(new Date(audit.created_at), 'yyyy-MM-dd HH:mm') : '';
        
        return [
          `"${item.stage}"`,
          `"${item.category}"`,
          `"${item.task_name.replace(/"/g, '""')}"`,
          item.is_completed ? 'Completed' : 'Pending',
          item.entry_date || '',
          `"${completedBy}"`,
          `"${completedAt}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `execution_plan_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Generate Execution Plan</h3>
        <p className="text-sm text-slate-500 text-center max-w-md mb-6">
          Create a detailed, phased checklist for this project based on the construction material.
        </p>
        
        <div className="flex items-center gap-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="material" 
              value="stone" 
              checked={materialType === 'stone'} 
              onChange={() => setMaterialType('stone')}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">Stone</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="material" 
              value="cement" 
              checked={materialType === 'cement'} 
              onChange={() => setMaterialType('cement')}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">Cement</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="material" 
              value="both" 
              checked={materialType === 'both'} 
              onChange={() => setMaterialType('both')}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">Stone & Cement</span>
          </label>
        </div>

        <Button onClick={generatePlan} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Generate Plan
        </Button>
      </div>
    );
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const totalItems = items.length;
  const completedItems = items.filter(i => i.is_completed).length;
  const progressPercentage = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  return (
    <div className="space-y-8">
      {/* Overall Progress */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Overall Execution Progress</h3>
            <p className="text-xs text-slate-500">{completedItems} of {totalItems} tasks completed</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={downloadReport} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200">
              <Download className="w-4 h-4 mr-2" />
              Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsResetConfirmOpen(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Plan
            </Button>
            <span className="text-2xl font-black text-indigo-600">{progressPercentage}%</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      {Object.entries(groupedItems).map(([category, categoryItems]) => {
        const catCompleted = categoryItems.filter(i => i.is_completed).length;
        const catTotal = categoryItems.length;
        const stage = categoryItems[0]?.stage || 'Design & Prep';

        return (
          <div key={category} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900">{category}</h4>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{stage}</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                {catCompleted} / {catTotal}
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {categoryItems.sort((a, b) => a.order_index - b.order_index).map(item => {
                const isClientApproval = item.task_name.startsWith('Client Approval');
                const audit = itemAudits[item.id];

                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 transition-colors group ${isClientApproval ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => toggleItem(item.id, item.is_completed, item.task_name)}
                    >
                      {item.is_completed ? (
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isClientApproval ? 'text-amber-500' : 'text-emerald-500'}`} />
                      ) : (
                        <Circle className={`w-5 h-5 shrink-0 transition-colors ${isClientApproval ? 'text-amber-200 group-hover:text-amber-400' : 'text-slate-300 group-hover:text-indigo-400'}`} />
                      )}
                      
                      <div className="flex flex-col">
                        <span className={`text-sm ${item.is_completed ? 'text-slate-400 line-through' : (isClientApproval ? 'text-amber-900 font-bold' : 'text-slate-700 font-medium')}`}>
                          {item.task_name}
                        </span>
                        
                        {item.is_completed && audit && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              <UserIcon className="w-3 h-3" />
                              {audit.user_name}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                              <Clock className="w-3 h-3" />
                              {format(new Date(audit.created_at), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => moveItem(item, 'up')}
                          className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => moveItem(item, 'down')}
                          className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <input 
                        type="date"
                        value={item.entry_date || ''}
                        onChange={(e) => updateEntryDate(item.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-500 focus:outline-none focus:border-indigo-500 bg-transparent hover:bg-white transition-colors"
                        title="Entry Date (Completion Date)"
                      />
                      <button 
                        onClick={() => setItemToDelete(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Custom Task */}
            <div className="p-3 bg-slate-50/50 border-t border-slate-100">
              {addingToCategory === category ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Enter custom task name..."
                    className="flex-1 text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomTask(category, stage);
                      if (e.key === 'Escape') {
                        setAddingToCategory(null);
                        setNewTaskName('');
                      }
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => addCustomTask(category, stage)} className="h-8">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingToCategory(null); setNewTaskName(''); }} className="h-8">Cancel</Button>
                </div>
              ) : (
                <button 
                  onClick={() => setAddingToCategory(category)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Custom Task
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Execution Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the execution plan? All progress and custom tasks will be lost. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReset}>Reset Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
