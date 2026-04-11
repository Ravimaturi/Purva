import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Users as UsersIcon,
  Plus,
  HardHat,
  MessageSquare,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Project } from '../types';
import { PROJECT_STAGES, USERS, STAGE_LABELS } from '../constants';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

import { ProjectDetails } from './ProjectDetails';
import { NewProjectDialog } from './NewProjectDialog';
import { Sheet, SheetContent } from './ui/sheet';

export const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const { user } = useUser();
  const { t } = useLanguage();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    setLoading(true);
    try {
      // 1. Seed profiles if they don't exist
      const { data: existingProfiles } = await supabase.from('profiles').select('id').limit(1);
      if (!existingProfiles || existingProfiles.length === 0) {
        const { error: uError } = await supabase.from('profiles').insert(USERS);
        if (uError) console.error('Error seeding profiles:', uError);
      }

      // 2. Sample Projects
      const sampleProjects = [
        {
          name: 'Mahadev Temple Complex',
          client_name: 'Dharma Rakshana Samithi',
          description: 'A grand temple complex featuring a main sanctum, prayer halls, and traditional stone carvings following Dravidian architecture.',
          status: 'Construction',
          progress: 45,
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: 'Mr. Maturi Ravi Teja',
          last_updated: new Date().toISOString()
        },
        {
          name: 'Vedic Heritage Museum',
          client_name: 'Cultural Ministry of India',
          description: 'Modern museum design integrated with ancient Vedic principles to showcase traditional arts and architecture.',
          status: 'Advance Received',
          progress: 20,
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: 'Mr. Daggupati Naga Vara Prasad',
          last_updated: new Date().toISOString()
        },
        {
          name: 'Spiritual Retreat Center',
          client_name: 'Ananda Yoga Foundation',
          description: 'Eco-friendly retreat center with meditation halls, residential blocks, and organic gardens.',
          status: 'Discussion',
          progress: 10,
          deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: 'Mr. Gandeti Siva Krishna',
          last_updated: new Date().toISOString()
        },
        {
          name: 'Ancient Temple Restoration',
          client_name: 'Archaeological Survey',
          description: 'Restoration of a 12th-century temple structure including structural reinforcement and stone cleaning.',
          status: 'Work is on hold',
          progress: 35,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: 'Mr. Modukuri Dyanesh Kumar',
          last_updated: new Date().toISOString()
        },
        {
          name: 'Community Prayer Hall',
          client_name: 'Village Panchayat',
          description: 'A simple yet elegant prayer hall for the local community, completed with traditional aesthetics.',
          status: 'Completed',
          progress: 100,
          deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: 'Mr. Uriti Vishnu',
          last_updated: new Date().toISOString()
        }
      ];

      const { data: insertedProjects, error: pError } = await supabase
        .from('projects')
        .insert(sampleProjects)
        .select();
      
      if (pError) throw pError;

      if (insertedProjects && insertedProjects.length > 0) {
        const project1 = insertedProjects[0];
        const project2 = insertedProjects[1];

        // 3. Sample Tasks
        const sampleTasks = [
          {
            project_id: project1.id,
            title: 'Foundation Stone Laying Ceremony',
            status: 'Completed',
            priority: 'High',
            assigned_to: 'Mr. Maturi Ravi Teja',
            deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project1.id,
            title: 'Main Pillar Carving - Phase 1',
            status: 'In Progress',
            priority: 'High',
            assigned_to: 'Mr. Gandeti Siva Krishna',
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project1.id,
            title: 'Procurement of Granite Stones',
            status: 'Todo',
            priority: 'Medium',
            assigned_to: 'Mr. Modukuri Dyanesh Kumar',
            deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project2.id,
            title: 'Drafting Initial Floor Plans',
            status: 'In Progress',
            priority: 'High',
            assigned_to: 'Mr. Daggupati Naga Vara Prasad',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project2.id,
            title: '3D Visualization of Main Hall',
            status: 'Todo',
            priority: 'Medium',
            assigned_to: 'Mr. Uriti Vishnu',
            deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];

        const { error: tError } = await supabase.from('tasks').insert(sampleTasks);
        if (tError) console.error('Error seeding tasks:', tError);

        // 4. Sample Comments
        const sampleComments = [
          {
            project_id: project1.id,
            author: 'Mr. Maturi Ravi Teja',
            text: 'The foundation work is progressing well. We need to ensure the stone quality is consistent.',
            type: 'internal',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project1.id,
            author: 'Mr. Gandeti Siva Krishna',
            text: 'Agreed. I have inspected the latest batch of stones and they look excellent.',
            type: 'internal',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];

        const { error: cError } = await supabase.from('comments').insert(sampleComments);
        if (cError) console.error('Error seeding comments:', cError);
      }

      toast.success('Sample data seeded successfully!');
      fetchProjects();
    } catch (err: any) {
      console.error('Error seeding data:', err);
      const errorMessage = err.message || 'Unknown error';
      toast.error(`Failed to seed data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: t('all_projects'), value: projects.length, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('pre_contract'), value: projects.filter(p => STAGE_LABELS[p.status] === 'Pre-Contract').length, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: t('in_progress'), value: projects.filter(p => STAGE_LABELS[p.status] === 'In Progress').length, icon: HardHat, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('handover'), value: projects.filter(p => STAGE_LABELS[p.status] === 'Handover').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const stageData = PROJECT_STAGES.map(stage => ({
    name: STAGE_LABELS[stage],
    count: projects.filter(p => p.status === stage).length
  }));

  const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f1f5f9', '#f8fafc'];

  const filteredProjects = filterStatus 
    ? projects.filter(p => STAGE_LABELS[p.status] === filterStatus || t(p.status.toLowerCase().replace(/ /g, '_')) === filterStatus)
    : projects;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('revenue_overview')}</h1>
          <p className="text-slate-500 text-sm sm:text-base">Welcome back, <span className="text-indigo-600 font-semibold">{user?.full_name}</span>! Here's what's happening.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={seedData}
            disabled={loading}
            className="rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest h-10 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Seed Sample Data
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {filterStatus && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setFilterStatus(null)}
              className="text-slate-500 hover:text-indigo-600 font-bold"
            >
              Clear Filter: {filterStatus}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsNewDialogOpen(true)}
            className="rounded-xl border-slate-200 bg-white flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('add_project')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            onClick={() => setFilterStatus(stat.label === 'Total Projects' ? null : stat.label)}
            className={cn(
              "border-none shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer hover:-translate-y-1 active:scale-95",
              filterStatus === stat.label ? "ring-2 ring-indigo-500 bg-indigo-50/30" : ""
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                </div>
                <div className={`${stat.bg} p-3 rounded-2xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stage Distribution */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              {t('project_status')}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0} 
                  height={100} 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[6, 6, 0, 0]}
                  onClick={(data) => setFilterStatus(data.name)}
                  className="cursor-pointer"
                >
                  {stageData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      className={cn(
                        "transition-opacity duration-200",
                        filterStatus && filterStatus !== entry.name ? "opacity-30" : "opacity-100"
                      )}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                {filterStatus ? `${filterStatus} ${t('projects')}` : t('active_projects')}
              </CardTitle>
              {filterStatus && (
                <Button variant="ghost" size="sm" onClick={() => setFilterStatus(null)} className="h-8 text-xs font-bold text-indigo-600">
                  View All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm font-medium">
                    No projects found for this stage.
                  </div>
                ) : (
                  filteredProjects.slice(0, 6).map((project) => (
                    <div 
                      key={project.id} 
                      onClick={() => {
                        setSelectedProject(project);
                        setIsDetailsOpen(true);
                      }}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                          {project.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.name}</p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{STAGE_LABELS[project.status]}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-700">{project.progress}%</p>
                        <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                          <div className="bg-indigo-600 h-full" style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                {t('recent_activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm">
                        <UsersIcon className="w-5 h-5 text-slate-500" />
                      </div>
                      {i !== 2 && <div className="absolute top-10 left-1/2 w-px h-8 bg-slate-100 -translate-x-1/2" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        <span className="font-bold">Ravi Teja</span> moved <span className="text-indigo-600">Temple Project</span> to In Progress
                      </p>
                      <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
};
