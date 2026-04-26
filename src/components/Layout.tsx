import React from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, 
  Trello, 
  Calendar as CalendarIcon, 
  LogOut, 
  User,
  Settings,
  Bell,
  ListTodo,
  Users as UsersIcon,
  Menu,
  X as CloseIcon,
  MoreVertical,
  Building2,
  Languages,
  Monitor
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { cn, getInitials } from '../lib/utils';
import { toast } from 'sonner';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import { format } from 'date-fns';
import { AppearanceSettings } from './AppearanceSettings';
import { BanknotesIcon } from '@heroicons/react/24/outline'; // Or use IndianRupee from lucide-react? let's use lucide
import { IndianRupee } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

import { hasAdminAccess, hasProjectManagementAccess, hasFinanceAccess, isLimitedUser, RoleLabels } from '../types';

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, setUser, allUsers } = useUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { language, setLanguage, t, translateData } = useLanguage();
  const [showHistory, setShowHistory] = React.useState(false);
  const [showAppearance, setShowAppearance] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    const role = user.role;
    if (activeTab === 'dashboard' && !hasAdminAccess(role) && role !== 'finance_manager') {
      setActiveTab('kanban');
    }
  }, [user?.role, activeTab, setActiveTab]);

  const getNavItems = () => {
    const role = user?.role;
    
    if (hasAdminAccess(role)) {
      return [
        { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { id: 'projects', label: t('projects'), icon: ListTodo },
        { id: 'kanban', label: t('kanban'), icon: Trello },
        { id: 'calendar', label: t('calendar'), icon: CalendarIcon },
        { id: 'vendors', label: t('vendors'), icon: Building2 },
        { id: 'team', label: t('team'), icon: UsersIcon },
        { id: 'petty_cash', label: 'Petty Cash', icon: IndianRupee }
      ];
    }
    
    if (role === 'deputy_sthapathy') {
      return [
        { id: 'kanban', label: t('kanban'), icon: Trello },
        { id: 'projects', label: t('projects'), icon: ListTodo },
        { id: 'calendar', label: t('calendar'), icon: CalendarIcon },
        { id: 'vendors', label: t('vendors'), icon: Building2 },
        { id: 'petty_cash', label: 'Petty Cash', icon: IndianRupee }
      ];
    }
    
    if (role === 'finance_manager') {
      return [
        { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { id: 'projects', label: t('projects'), icon: ListTodo },
        { id: 'vendors', label: t('vendors'), icon: Building2 },
        { id: 'petty_cash', label: 'Petty Cash', icon: IndianRupee }
      ];
    }
    
    return [
      { id: 'kanban', label: t('kanban'), icon: Trello },
      { id: 'projects', label: t('projects'), icon: ListTodo },
      { id: 'calendar', label: t('calendar'), icon: CalendarIcon },
      { id: 'petty_cash', label: 'Petty Cash', icon: IndianRupee }
    ];
  };

  const navItems = getNavItems();

  const UserMenuContent = () => (
    <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg border-slate-200 dark:border-white/10 dark:border-slate-800 p-2">
      <div className="px-2 py-2 mb-1">
        <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 dark:text-slate-100">{user?.full_name}</p>
        <div className="flex flex-col mt-1">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{translateData(user?.designation || 'N/A')}</p>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{user?.role ? RoleLabels[user.role] || user.role : ''}</p>
        </div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveTab('profile')}>
        <User className="mr-2 h-4 w-4" />
        <span>My Profile</span>
      </DropdownMenuItem>
      {hasAdminAccess(user?.role) && (
        <DropdownMenuItem onClick={() => setActiveTab('team')}>
          <UsersIcon className="mr-2 h-4 w-4" />
          <span>{t('team')}</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-red-600" onClick={async () => {
        await supabase.auth.signOut();
        setUser(null);
        window.location.reload();
      }}>
        <LogOut className="mr-2 h-4 w-4" />
        <span>{t('logout')}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => {
    const { getDashboardColors, workspaceName, workspaceLogo } = useTheme();
    const themeColors = getDashboardColors();
    
    return (
      <div className="flex flex-col h-full relative">
        <div className={cn("border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 flex flex-col justify-center", isCollapsed ? "p-4 items-center h-[88px]" : "p-6 h-[88px]")}>
          <div className="flex items-center gap-3 w-full">
            {workspaceLogo ? (
              <img src={workspaceLogo} alt="Logo" className={cn("object-contain object-left", isCollapsed ? "h-8 w-8 mx-auto" : "h-8 max-w-[120px]")} />
            ) : (
              <div className={cn("rounded-lg flex items-center justify-center shrink-0 text-white", themeColors.solid, isCollapsed ? "w-10 h-10 mx-auto" : "w-8 h-8")}>
                {workspaceName.charAt(0)}
              </div>
            )}
            {!isCollapsed && (
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight flex-1">
                {workspaceName}
              </h1>
            )}
          </div>
          {!isCollapsed && <p className="text-xs text-slate-500 mt-1.5 font-medium uppercase tracking-wider">{t('project_management')}</p>}
        </div>

        <nav className={cn("flex-1 space-y-1", isCollapsed ? "p-3" : "p-4")}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center transition-all duration-200",
                isCollapsed ? "w-12 h-12 justify-center rounded-2xl mx-auto" : "w-full gap-3 px-4 py-3 rounded-xl",
                activeTab === item.id 
                  ? cn(themeColors.bg, themeColors.text, "shadow-sm border dark:border-white/5")
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 dark:border-transparent hover:text-slate-900 dark:hover:text-slate-100 border border-transparent"
              )}
            >
              <item.icon className={cn("shrink-0", activeTab === item.id ? themeColors.text : "text-slate-400", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#FFFFF0] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className={cn("hidden lg:flex bg-white dark:bg-[#121212] dark:bg-slate-900 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 transition-all duration-300 relative", isSidebarCollapsed ? "w-20" : "w-64")}>
        <SidebarContent isCollapsed={isSidebarCollapsed} />
        
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <Sheet>
              <SheetTrigger 
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden rounded-xl">
                    <Menu className="h-5 w-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {t(activeTab.replace('-', '_'))}
            </h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-slate-500 relative mr-1"
              onClick={() => setShowAppearance(true)}
            >
              <Monitor className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger 
                render={
                  <Button variant="ghost" size="icon" className="rounded-full text-slate-500 relative mr-1">
                    <Languages className="h-5 w-5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-32 rounded-xl shadow-lg border-slate-200 dark:border-slate-800 p-1">
                <DropdownMenuItem 
                  onClick={() => setLanguage('en')}
                  className={cn("rounded-lg text-xs font-bold", language === 'en' && "bg-indigo-50 text-indigo-700")}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('te')}
                  className={cn("rounded-lg text-xs font-bold", language === 'te' && "bg-indigo-50 text-indigo-700")}
                >
                  తెలుగు
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger 
                render={
                  <Button variant="ghost" size="icon" className="rounded-full text-slate-500 relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    )}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-lg border-slate-200 dark:border-slate-800 p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowHistory(true)}
                      className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:text-zinc-300"
                    >
                      History
                    </button>
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => markAllAsRead()}
                        className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:text-indigo-700"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={cn(
                            "p-4 hover:bg-slate-50 dark:bg-slate-950 transition-colors cursor-pointer relative",
                            !n.read && "bg-indigo-50/30"
                          )}
                          onClick={() => markAsRead(n.id)}
                        >
                          {!n.read && (
                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full" />
                          )}
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-medium">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">No notifications</p>
                      <p className="text-xs text-slate-500 mt-1">We'll notify you when something happens.</p>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>



            {/* Profile Button in Header */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-100 dark:border-slate-800">
              <DropdownMenu>
                <DropdownMenuTrigger 
                  render={
                    <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-10 rounded-xl hover:bg-slate-50 dark:bg-slate-950 transition-all">
                      <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-[10px]">{getInitials(user?.full_name || '')}</AvatarFallback>
                      </Avatar>
                      <div className="hidden md:flex flex-col items-start text-left">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">{user?.full_name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{user?.role ? RoleLabels[user.role] || user.role : ''}</p>
                      </div>
                    </Button>
                  }
                />
                <UserMenuContent />
              </DropdownMenu>
            </div>
            
            {/* Mobile User Avatar */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger 
                  render={
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-[10px]">{getInitials(user?.full_name || '')}</AvatarFallback>
                      </Avatar>
                    </Button>
                  }
                />
                <UserMenuContent />
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Notification History Dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl">
            <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Notification History</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6">
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(new Date(n.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">No history</p>
                  <p className="text-sm text-slate-500 mt-1">You don't have any notifications yet.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Content Area */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </div>
        
        <AppearanceSettings open={showAppearance} onOpenChange={setShowAppearance} />
      </main>
    </div>
  );
};
