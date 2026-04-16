import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  HardHat,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Project, PaymentStage, VendorOrder } from '../types';
import { PROJECT_STAGES, STAGE_LABELS } from '../constants';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

import { ProjectDetails } from './ProjectDetails';
import { NewProjectDialog } from './NewProjectDialog';
import { Sheet, SheetContent } from './ui/sheet';

const PROJECT_COLORS = [
  { bg: 'bg-rose-50', text: 'text-rose-600', hoverBg: 'group-hover:bg-rose-600', border: 'hover:border-rose-200', progress: 'bg-rose-500' },
  { bg: 'bg-orange-50', text: 'text-orange-600', hoverBg: 'group-hover:bg-orange-500', border: 'hover:border-orange-200', progress: 'bg-orange-500' },
  { bg: 'bg-amber-50', text: 'text-amber-600', hoverBg: 'group-hover:bg-amber-500', border: 'hover:border-amber-200', progress: 'bg-amber-500' },
  { bg: 'bg-yellow-50', text: 'text-yellow-600', hoverBg: 'group-hover:bg-yellow-500', border: 'hover:border-yellow-200', progress: 'bg-yellow-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', hoverBg: 'group-hover:bg-emerald-500', border: 'hover:border-emerald-200', progress: 'bg-emerald-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-600', hoverBg: 'group-hover:bg-cyan-500', border: 'hover:border-cyan-200', progress: 'bg-cyan-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-600', hoverBg: 'group-hover:bg-indigo-500', border: 'hover:border-indigo-200', progress: 'bg-indigo-500' },
  { bg: 'bg-purple-50', text: 'text-purple-600', hoverBg: 'group-hover:bg-purple-500', border: 'hover:border-purple-200', progress: 'bg-purple-500' },
];

export const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [paymentStages, setPaymentStages] = useState<PaymentStage[]>([]);
  const [vendorOrders, setVendorOrders] = useState<VendorOrder[]>([]);
  const [projectChecklists, setProjectChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);

  const { user, allUsers } = useUser();
  const { t, translateData } = useLanguage();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const [projectsRes, paymentsRes, vendorsRes, checklistsRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('payment_stages').select('*'),
        supabase.from('vendor_orders').select('*'),
        supabase.from('project_checklists').select('project_id, is_completed, stage, order_index')
      ]);
      
      if (projectsRes.error) throw projectsRes.error;
      setProjects(projectsRes.data || []);
      setPaymentStages(paymentsRes.data || []);
      setVendorOrders(vendorsRes.data || []);
      setProjectChecklists(checklistsRes.data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    setLoading(true);
    try {
      // 0. Clear existing data to start fresh
      await Promise.all([
        supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('vendor_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);

      // 1. We no longer upsert profiles here. We use the real profiles from the database.
      const getUserId = (name: string) => allUsers.find(u => u.full_name === name)?.id || user?.id;
      const getUserName = (name: string) => allUsers.find(u => u.full_name === name)?.full_name || user?.full_name || 'Unassigned';

      // 2. Sample Vendors
      const sampleVendors = [
        {
          vendor_name: 'Sri Ram Stones & Granites',
          contact_person_name: 'Ramesh Babu',
          phone_no: '+91 98765 43210',
          pan_card_no: 'ABCDE1234F',
          gst_no: '29ABCDE1234F1Z5',
          services_list: 'Granite, Marble, Carved Stones',
        },
        {
          vendor_name: 'Viswakarma Woodworks',
          contact_person_name: 'Karthik Achari',
          phone_no: '+91 87654 32109',
          pan_card_no: 'VWXYZ5678G',
          gst_no: '33VWXYZ5678G1Z2',
          services_list: 'Teak Wood, Carved Doors, Pillars',
        },
        {
          vendor_name: 'Maha Cement Suppliers',
          contact_person_name: 'Suresh Kumar',
          phone_no: '+91 76543 21098',
          pan_card_no: 'PQRST9012H',
          gst_no: '36PQRST9012H1Z8',
          services_list: 'Cement, Sand, Bricks',
        }
      ];

      const { data: insertedVendors, error: vError } = await supabase
        .from('vendors')
        .insert(sampleVendors)
        .select();

      if (vError) throw vError;

      // 3. Sample Projects
      const sampleProjects = [
        {
          name: 'Mahadev Temple Complex',
          client_name: 'Dharma Rakshana Samithi',
          description: 'A grand temple complex featuring a main sanctum, prayer halls, and traditional stone carvings following Dravidian architecture.',
          status: 'Construction',
          progress: 45,
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: getUserName('M Ravi Teja'),
          last_updated: new Date().toISOString()
        },
        {
          name: 'Vedic Heritage Museum',
          client_name: 'Cultural Ministry of India',
          description: 'Modern museum design integrated with ancient Vedic principles to showcase traditional arts and architecture.',
          status: 'Advance Received',
          progress: 20,
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: getUserName('DNV Prasad Sthapathy'),
          last_updated: new Date().toISOString()
        },
        {
          name: 'Spiritual Retreat Center',
          client_name: 'Ananda Yoga Foundation',
          description: 'Eco-friendly retreat center with meditation halls, residential blocks, and organic gardens.',
          status: 'Discussion',
          progress: 10,
          deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: getUserName('G Siva Krishna Sthapathy'),
          last_updated: new Date().toISOString()
        },
        {
          name: 'Ancient Temple Restoration',
          client_name: 'Archaeological Survey',
          description: 'Restoration of a 12th-century temple structure including structural reinforcement and stone cleaning.',
          status: 'Work is on hold',
          progress: 35,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: 'M Dyanesh Kumar',
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
          assigned_to: 'U Vishnu',
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

        // 4. Sample Tasks
        const sampleTasks = [
          {
            project_id: project1.id,
            title: 'Foundation Stone Laying Ceremony',
            status: 'Completed',
            priority: 'High',
            assigned_to: 'M Ravi Teja',
            deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project1.id,
            title: 'Main Pillar Carving - Phase 1',
            status: 'In Progress',
            priority: 'High',
            assigned_to: 'G Siva Krishna Sthapathy',
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project1.id,
            title: 'Procurement of Granite Stones',
            status: 'Todo',
            priority: 'Medium',
            assigned_to: 'M Dyanesh Kumar',
            deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project2.id,
            title: 'Drafting Initial Floor Plans',
            status: 'In Progress',
            priority: 'High',
            assigned_to: 'DNV Prasad Sthapathy',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project2.id,
            title: '3D Visualization of Main Hall',
            status: 'Todo',
            priority: 'Medium',
            assigned_to: 'U Vishnu',
            deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];

        const { error: tError } = await supabase.from('tasks').insert(sampleTasks);
        if (tError) console.error('Error seeding tasks:', tError);

        // 5. Sample Vendor Orders
        if (insertedVendors && insertedVendors.length > 0) {
          const vendor1 = insertedVendors[0];
          const vendor2 = insertedVendors[1];

          const sampleVendorOrders = [
            {
              project_id: project1.id,
              vendor_id: vendor1.id,
              order_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              order_details: 'Black Granite for Main Sanctum Base',
              terms: '50% advance, 50% on delivery',
              total_amount: 500000,
              amount_paid: 250000,
              status: 'In Progress',
              comments: 'First batch expected next week.'
            },
            {
              project_id: project1.id,
              vendor_id: vendor2.id,
              order_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              order_details: 'Teak Wood for Main Doors',
              terms: '100% advance',
              total_amount: 150000,
              amount_paid: 150000,
              status: 'Completed',
              comments: 'Wood quality verified by Sthapathy.'
            },
            {
              project_id: project2.id,
              vendor_id: vendor1.id,
              order_date: new Date().toISOString().split('T')[0],
              order_details: 'Marble Flooring Tiles',
              terms: '30 days credit',
              total_amount: 300000,
              amount_paid: 0,
              status: 'Pending',
              comments: 'Awaiting final design approval before dispatch.'
            }
          ];

          const { error: voError } = await supabase.from('vendor_orders').insert(sampleVendorOrders);
          if (voError) console.error('Error seeding vendor orders:', voError);
        }

        // 6. Sample Comments with Mentions
        const sampleComments = [
          {
            project_id: project1.id,
            author: 'M Dyanesh Kumar',
            text: `@[G Siva Krishna Sthapathy] please take care of the structural drawings for the main sanctum.`,
            type: 'internal',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            project_id: project1.id,
            author: 'G Siva Krishna Sthapathy',
            text: `@[M Ravi Teja] I have inspected the latest batch of stones and they look excellent.`,
            type: 'internal',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];

        const { error: cError } = await supabase.from('comments').insert(sampleComments);
        if (cError) console.error('Error seeding comments:', cError);

        // 7. Sample Notifications for Mentions
        const sampleNotifications = [
          {
            user_id: getUserId('G Siva Krishna Sthapathy'),
            title: 'You were tagged',
            message: `M Dyanesh Kumar tagged you in a comment on project "${project1.name}"`,
            read: false,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            user_id: getUserId('M Ravi Teja'),
            title: 'You were tagged',
            message: `G Siva Krishna Sthapathy tagged you in a comment on project "${project1.name}"`,
            read: false,
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ].filter(n => n.user_id);

        const { error: nError } = await supabase.from('notifications').insert(sampleNotifications);
        if (nError) console.error('Error seeding notifications:', nError);
      }

      toast.success('Sample data updated successfully!');
      fetchProjects();
    } catch (err: any) {
      console.error('Error seeding data:', err);
      const errorMessage = err.message || 'Unknown error';
      toast.error(`Failed to update sample data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: t('all_projects'), value: projects.length, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('discussion'), value: projects.filter(p => p.status === 'Discussion').length, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: t('design_and_prep'), value: projects.filter(p => p.status === 'Advance Received').length, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('in_progress'), value: projects.filter(p => p.status === 'Construction').length, icon: HardHat, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('on_hold'), value: projects.filter(p => p.status === 'Work is on hold').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: t('handover'), value: projects.filter(p => p.status === 'Completed').length, icon: CheckCircle2, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  const filteredProjects = filterStatus 
    ? projects.filter(p => STAGE_LABELS[p.status] === filterStatus || t(p.status.toLowerCase().replace(/ /g, '_')) === filterStatus)
    : projects;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('dashboard')}</h1>
          <p className="text-slate-500 text-sm sm:text-base">
            Welcome back, <span className="text-indigo-600 font-bold">{user?.full_name}</span>! Here's your project overview.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'admin' && (
            <>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setIsNewDialogOpen(true)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 h-10 px-6 font-bold text-xs"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('add_project')}
              </Button>
            </>
          )}
        </div>
      </div>

      {filterStatus && (
        <div className="flex items-center gap-2 animate-in slide-in-from-left duration-300">
          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Filtered: {filterStatus}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilterStatus(null)}
            className="h-7 text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest"
          >
            Clear Filter
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            onClick={() => setFilterStatus(stat.label === t('all_projects') ? null : stat.label)}
            className={cn(
              "border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-1 active:scale-95 group",
              filterStatus === stat.label ? "ring-2 ring-indigo-500 bg-indigo-50/30" : "bg-white"
            )}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">{stat.label}</p>
                  <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                </div>
                <div className={cn(stat.bg, "p-3 rounded-2xl shrink-0 self-start sm:self-center transition-transform group-hover:scale-110")}>
                  <stat.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Highlighted Projects Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            {filterStatus ? `${filterStatus} ${t('projects')}` : t('active_projects')}
          </h2>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsPrivacyMode(!isPrivacyMode)} 
              className={cn(
                "h-8 text-xs font-bold rounded-xl border-slate-200 transition-colors",
                isPrivacyMode ? "bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-slate-800" : "bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
              Privacy Mode
            </Button>
            {filterStatus && (
              <Button variant="ghost" size="sm" onClick={() => setFilterStatus(null)} className="h-8 text-xs font-bold text-indigo-600">
                View All
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-400 text-sm font-medium bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              No projects found.
            </div>
          ) : (
            filteredProjects.map((project, index) => {
              const projectPayments = paymentStages.filter(p => p.project_id === project.id);
              const totalValue = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
              const totalReceived = projectPayments.reduce((sum, p) => sum + (p.amount_received || 0), 0);
              
              const projectVendorOrders = vendorOrders.filter(v => v.project_id === project.id);
              const totalVendorCost = projectVendorOrders.reduce((sum, v) => sum + (v.total_amount || 0), 0);
              const totalVendorPaid = projectVendorOrders.reduce((sum, v) => sum + (v.amount_paid || 0), 0);

              const projectItems = projectChecklists.filter(c => c.project_id === project.id).sort((a, b) => a.order_index - b.order_index);
              const totalItems = projectItems.length;
              const completedItems = projectItems.filter(c => c.is_completed).length;
              const checklistProgress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
              
              const firstIncomplete = projectItems.find(c => !c.is_completed);
              const currentStage = firstIncomplete ? firstIncomplete.stage : (projectItems.length > 0 ? projectItems[projectItems.length - 1].stage : 'Execution Plan');
              const stageDisplay = currentStage !== 'Execution Plan' ? `Execution: ${currentStage}` : 'Execution Plan';

              // Get completed stages (categories)
              const categories = [...new Set(projectItems.map(item => item.category))];
              const completedCategories = categories.filter(cat => {
                const catItems = projectItems.filter(i => i.category === cat);
                return catItems.length > 0 && catItems.every(i => i.is_completed);
              });
              
              const completedStagesText = completedCategories.length > 0 
                ? completedCategories.join(', ') 
                : 'No stages completed entirely';

              const colorTheme = PROJECT_COLORS[index % PROJECT_COLORS.length];

              return (
                <div 
                  key={project.id} 
                  onClick={() => {
                    setSelectedProject(project);
                    setIsDetailsOpen(true);
                  }}
                  className={cn(
                    "bg-white flex flex-col p-5 rounded-3xl hover:shadow-xl cursor-pointer transition-all group border relative overflow-hidden",
                    "border-slate-100", colorTheme.border,
                    "gap-4"
                  )}
                >
                  <div className="flex items-start justify-between relative z-10 bg-white group-hover:bg-transparent transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 transition-colors", colorTheme.bg, colorTheme.text, colorTheme.hoverBg, "group-hover:text-white")}>
                        {project.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-base font-bold text-slate-900 transition-colors truncate", `group-hover:${colorTheme.text}`)}>{translateData(project.name)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{t(project.status.toLowerCase().replace(/ /g, '_'))}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 relative z-10 transition-all duration-300">
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[70%]">
                          {stageDisplay}
                        </span>
                        <span className="text-sm font-black text-slate-900">{checklistProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                        <div className={cn("h-full transition-all duration-1000", colorTheme.progress)} style={{ width: `${checklistProgress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Hover Overlay showing completed stages */}
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 p-5 flex flex-col justify-center">
                    <h4 className={cn("text-xs font-bold uppercase tracking-widest mb-2", colorTheme.text)}>Completed Stages</h4>
                    <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed font-medium">
                      {completedStagesText}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50 relative z-10 bg-white group-hover:bg-transparent transition-colors duration-300">
                    <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                      <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Client Payments</p>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-emerald-700">
                          {isPrivacyMode ? '••••••' : `₹${totalReceived.toLocaleString()}`}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600/50">
                          of {isPrivacyMode ? '••••••' : `₹${totalValue.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50">
                      <p className="text-[9px] font-bold text-amber-600/70 uppercase tracking-widest mb-1">Vendor Costs</p>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-amber-700">
                          {isPrivacyMode ? '••••••' : `₹${totalVendorPaid.toLocaleString()}`}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600/50">
                          of {isPrivacyMode ? '••••••' : `₹${totalVendorCost.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <NewProjectDialog 
        open={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen} 
        onSuccess={fetchProjects} 
      />

      <Sheet open={isDetailsOpen} onOpenChange={(open) => {
        setIsDetailsOpen(open);
        if (!open) setIsMaximized(false);
      }}>
        <SheetContent className={cn(
          "w-full p-0 border-l-slate-200 shadow-2xl transition-all duration-500 ease-in-out",
          isMaximized ? "sm:max-w-[100vw]" : "sm:max-w-[85vw]"
        )}>
          {selectedProject && (
            <ProjectDetails 
              project={selectedProject} 
              onClose={() => setIsDetailsOpen(false)} 
              onUpdate={fetchProjects}
              isMaximized={isMaximized}
              onToggleMaximize={() => setIsMaximized(!isMaximized)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
