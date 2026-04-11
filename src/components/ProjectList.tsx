import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Search, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Project } from '../types';
import { ProjectDetails } from './ProjectDetails';
import { NewProjectDialog } from './NewProjectDialog';
import { useNotifications } from '../contexts/NotificationContext';
import { Sheet, SheetContent } from './ui/sheet';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { getInitials, cn } from '../lib/utils';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'MMM d, yyyy') : 'N/A';
  } catch {
    return 'N/A';
  }
};

export const ProjectList: React.FC = () => {
  const { addNotification } = useNotifications();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Delete confirmation state
  const [projectIdToDelete, setProjectIdToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof Project>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Column filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [assignedFilter, setAssignedFilter] = useState<string>('All');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      console.log('Fetching projects...');
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Projects fetched:', data);
      setProjects(data || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      toast.error(`Failed to load projects: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectIdToDelete) return;

    try {
      const projectToDelete = projects.find(p => p.id === projectIdToDelete);
      const { error } = await supabase.from('projects').delete().eq('id', projectIdToDelete);
      if (error) throw error;

      if (projectToDelete) {
        await addNotification('Project Deleted', `Project "${projectToDelete.name}" has been deleted.`);
      }

      toast.success('Project deleted');
      fetchProjects();
    } catch (err) {
      toast.error('Failed to delete project');
    } finally {
      setProjectIdToDelete(null);
    }
  };

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedProjects = projects
    .filter(p => {
      const matchesSearch = (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (p.client_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (p.assigned_to?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchesAssigned = assignedFilter === 'All' || p.assigned_to === assignedFilter;
      
      return matchesSearch && matchesStatus && matchesAssigned;
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      
      return 0;
    });

  const uniqueStatuses = ['All', ...Array.from(new Set(projects.map(p => p.status)))];
  const uniqueAssignees = ['All', ...Array.from(new Set(projects.map(p => p.assigned_to).filter(Boolean)))];

  const SortIcon = ({ field }: { field: keyof Project }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" /> 
      : <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 bg-white border-slate-200 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <Button 
          onClick={() => setIsNewDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead 
                  className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Project Name <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap hidden md:table-cell cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => handleSort('client_name')}
                >
                  <div className="flex items-center">
                    Client <SortIcon field="client_name" />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    Status
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        render={
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md hover:bg-slate-200">
                            <Filter className={cn("w-3 h-3", statusFilter !== 'All' ? "text-indigo-600" : "text-slate-400")} />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="rounded-xl">
                        {uniqueStatuses.map(status => (
                          <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                            <span className={cn(statusFilter === status && "font-bold text-indigo-600")}>{status}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    Assigned To
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        render={
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md hover:bg-slate-200">
                            <Filter className={cn("w-3 h-3", assignedFilter !== 'All' ? "text-indigo-600" : "text-slate-400")} />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="rounded-xl">
                        {uniqueAssignees.map(assignee => (
                          <DropdownMenuItem key={assignee} onClick={() => setAssignedFilter(assignee)}>
                            <span className={cn(assignedFilter === assignee && "font-bold text-indigo-600")}>{assignee}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap hidden lg:table-cell cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => handleSort('deadline')}
                >
                  <div className="flex items-center">
                    Deadline <SortIcon field="deadline" />
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => handleSort('progress')}
                >
                  <div className="flex items-center">
                    Progress <SortIcon field="progress" />
                  </div>
                </TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-medium">
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-medium">
                    No projects found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-slate-50/50 border-slate-50 group">
                    <TableCell className="font-bold text-slate-900 whitespace-nowrap">{project.name}</TableCell>
                    <TableCell className="text-sm text-slate-500 font-medium whitespace-nowrap hidden md:table-cell">{project.client_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap">
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Avatar className="h-6 w-6 border border-slate-200">
                          <AvatarFallback className="bg-indigo-600 text-white font-bold text-[8px]">
                            {getInitials(project.assigned_to || 'Unassigned')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold text-slate-700">
                          {project.assigned_to?.includes('@') ? project.assigned_to.split('@')[0] : (project.assigned_to || 'Unassigned')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 font-medium whitespace-nowrap hidden lg:table-cell">
                      {project.status === 'Completed' 
                        ? formatDate(project.completed_at || project.deadline) 
                        : formatDate(project.deadline)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <div className="w-16 sm:w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{project.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded-full h-8 w-8 text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-colors outline-none">
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-lg">
                          <DropdownMenuItem onClick={() => {
                            setSelectedProject(project);
                            setIsDetailsOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => {
                            setProjectIdToDelete(project.id);
                            setIsDeleteDialogOpen(true);
                          }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewProjectDialog 
        open={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen} 
        onSuccess={fetchProjects} 
      />

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-[85vw] w-full p-0 border-l-slate-200 shadow-2xl">
          {selectedProject && (
            <ProjectDetails 
              project={selectedProject} 
              onClose={() => setIsDetailsOpen(false)} 
              onUpdate={fetchProjects}
            />
          )}
        </SheetContent>
      </Sheet>
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
