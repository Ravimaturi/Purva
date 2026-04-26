import React, { useState } from 'react';
import { useFileSettings, FilePermissionsConfig, RolePermissions } from '../contexts/FileSettingsContext';
import { useUser } from '../contexts/UserContext';
import { UserRole, hasAdminAccess, RoleLabels } from '../types';
import { Button } from './ui/button';
import { ShieldCheck, Save, Trash2, Plus, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

const ALL_ROLES: UserRole[] = [
  'admin',
  'chief_sthapathy',
  'deputy_sthapathy',
  'assistant_sthapathy',
  'junior_sthapathy',
  'finance_manager',
  'employee'
];

export const FileControls = () => {
  const { user } = useUser();
  const { config, updateConfig } = useFileSettings();
  
  // Local state for editing
  const [localConfig, setLocalConfig] = useState<FilePermissionsConfig>(config);
  const [newExt, setNewExt] = useState('');

  if (!hasAdminAccess(user?.role)) {
    return (
      <div className="p-6 text-center text-slate-500">
        You do not have permission to view file controls.
      </div>
    );
  }

  const handleSave = () => {
    updateConfig(localConfig);
    toast.success("File permissions updated. Settings are saved to this browser.");
  };

  const toggleRole = (
    type: 'default' | 'override',
    action: 'view' | 'download',
    role: UserRole,
    ext?: string
  ) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FilePermissionsConfig;
      
      let targetList: UserRole[] = [];
      if (type === 'default') {
        targetList = next.defaultPermissions[action];
      } else if (type === 'override' && ext) {
        targetList = next.extensionOverrides[ext][action];
      }
      
      if (targetList.includes(role)) {
        // Remove
        if (type === 'default') {
          next.defaultPermissions[action] = targetList.filter(r => r !== role);
        } else if (type === 'override' && ext) {
          next.extensionOverrides[ext][action] = targetList.filter(r => r !== role);
        }
      } else {
        // Add
        if (type === 'default') {
          next.defaultPermissions[action] = [...targetList, role];
        } else if (type === 'override' && ext) {
          next.extensionOverrides[ext][action] = [...targetList, role];
        }
      }
      
      return next;
    });
  };

  const activeRolesObj = (action: 'view' | 'download', type: 'default' | 'override', ext?: string) => {
    if (type === 'default') return localConfig.defaultPermissions[action];
    if (type === 'override' && ext && localConfig.extensionOverrides[ext]) {
      return localConfig.extensionOverrides[ext][action];
    }
    return [];
  };

  const RoleToggles = ({ action, type, ext }: { action: 'view' | 'download', type: 'default' | 'override', ext?: string }) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {ALL_ROLES.map(role => {
          const isActive = activeRolesObj(action, type, ext).includes(role);
          // Admins always have access, disable toggling for admin but show it as active
          const isHardcodedAdmin = (role === 'admin' || role === 'chief_sthapathy');
          
          return (
            <button
              key={role}
              disabled={isHardcodedAdmin}
              onClick={() => toggleRole(type, action, role, ext)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isHardcodedAdmin ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 opacity-70 cursor-not-allowed'
                : isActive 
                  ? 'bg-indigo-500 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {RoleLabels[role]}
            </button>
          );
        })}
      </div>
    );
  };

  const handleAddOverride = () => {
    const ext = newExt.trim().toLowerCase().replace('.', '');
    if (!ext) return;
    
    if (localConfig.extensionOverrides[ext]) {
      toast.error('Override already exists for this extension');
      return;
    }
    
    setLocalConfig(prev => ({
      ...prev,
      extensionOverrides: {
        ...prev.extensionOverrides,
        [ext]: {
          view: [...prev.defaultPermissions.view],
          download: [...prev.defaultPermissions.download]
        }
      }
    }));
    setNewExt('');
  };

  const handleRemoveOverride = (ext: string) => {
    setLocalConfig(prev => {
      const next = { ...prev };
      const overrides = { ...next.extensionOverrides };
      delete overrides[ext];
      next.extensionOverrides = overrides;
      return next;
    });
  };

  const toggleFeatureRole = (
    feature: 'projects' | 'tasks',
    action: 'create' | 'edit' | 'delete',
    role: UserRole
  ) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FilePermissionsConfig;
      
      const targetList = next[feature][action];
      
      if (targetList.includes(role)) {
        next[feature][action] = targetList.filter(r => r !== role);
      } else {
        next[feature][action] = [...targetList, role];
      }
      
      return next;
    });
  };

  const FeatureRoleToggles = ({ feature, action }: { feature: 'projects' | 'tasks' | 'vendors' | 'pettyCash', action: 'create' | 'edit' | 'delete' }) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {ALL_ROLES.map(role => {
          const isActive = localConfig[feature][action].includes(role);
          const isHardcodedAdmin = (role === 'admin' || role === 'chief_sthapathy') && (feature === 'projects' || feature === 'tasks');
          const isHardcodedFinanceAdmin = role === 'admin';
          const isDisabled = feature === 'vendors' || feature === 'pettyCash' ? isHardcodedFinanceAdmin : isHardcodedAdmin;
          
          return (
            <button
              key={role}
              disabled={isDisabled}
              onClick={() => toggleFeatureRole(feature as any, action, role)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isDisabled ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 opacity-70 cursor-not-allowed'
                : isActive 
                  ? 'bg-indigo-500 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {RoleLabels[role]}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in fade-in space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <ShieldCheck className="w-6 h-6 text-indigo-500" /> Controls Portal
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">Configure feature access and file permissions based on roles</p>
        </div>
        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg">
          <Save className="w-4 h-4 mr-2" /> Save Settings
        </Button>
      </div>
      
      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300">
        <p className="font-bold">Note on Security:</p>
        <p className="mt-1">
          Settings are saved to the current browser block. Admin, Chief Sthapathy, and the original uploader 
          will always have full access to view and download their respective files regardless of these toggles.
        </p>
      </div>

      {/* Feature Access Section */}
      <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151515]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Feature Permissions</h2>
          <p className="text-sm text-slate-500 mt-1">Configure who can manage Projects and Tasks system-wide.</p>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {/* Projects */}
          <div className="p-6 space-y-6">
            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              Projects Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Create Projects</h4>
                <FeatureRoleToggles feature="projects" action="create" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Edit Projects</h4>
                <FeatureRoleToggles feature="projects" action="edit" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">Delete Projects</h4>
                <FeatureRoleToggles feature="projects" action="delete" />
              </div>
            </div>
          </div>
          
          {/* Tasks */}
          <div className="p-6 space-y-6 border-t border-slate-100 dark:border-white/5">
            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              Tasks Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Create Tasks</h4>
                <FeatureRoleToggles feature="tasks" action="create" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Edit Tasks</h4>
                <FeatureRoleToggles feature="tasks" action="edit" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">Delete Tasks</h4>
                <FeatureRoleToggles feature="tasks" action="delete" />
              </div>
            </div>
          </div>
          
          {/* Vendors */}
          <div className="p-6 space-y-6 border-t border-slate-100 dark:border-white/5">
            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              Vendor Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Create Vendors</h4>
                <FeatureRoleToggles feature="vendors" action="create" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Edit Vendors</h4>
                <FeatureRoleToggles feature="vendors" action="edit" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">Delete Vendors</h4>
                <FeatureRoleToggles feature="vendors" action="delete" />
              </div>
            </div>
          </div>
          
          {/* Petty Cash */}
          <div className="p-6 space-y-6 border-t border-slate-100 dark:border-white/5">
            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              Petty Cash Tracking
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Create Entries</h4>
                <FeatureRoleToggles feature="pettyCash" action="create" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Edit Entries</h4>
                <FeatureRoleToggles feature="pettyCash" action="edit" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">Delete Entries</h4>
                <FeatureRoleToggles feature="pettyCash" action="delete" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Defaults Section */}
      <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151515]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Default Permissions</h2>
          <p className="text-sm text-slate-500 mt-1">Applies to all files without a specific override.</p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 flex items-center mb-1">
              <Eye className="w-4 h-4 mr-2 text-emerald-500" /> Roles allowed to VIEW files
            </h3>
            <RoleToggles action="view" type="default" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 flex items-center mb-1">
              <Download className="w-4 h-4 mr-2 text-amber-500" /> Roles allowed to DOWNLOAD files
            </h3>
            <RoleToggles action="download" type="default" />
          </div>
        </div>
      </div>

      {/* Extension Overrides Section */}
      <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151515] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Extension Overrides</h2>
            <p className="text-sm text-slate-500 mt-1">Define strict granular permissions for sensitive file types (e.g. DWG, PDF)</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input 
              type="text" 
              value={newExt} 
              onChange={e => setNewExt(e.target.value)}
              placeholder="e.g. dwg"
              className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-black rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white uppercase font-mono"
            />
            <Button onClick={handleAddOverride} variant="outline" size="sm" className="h-9">
              <Plus className="w-4 h-4 mr-1" /> Add Rule
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {Object.keys(localConfig.extensionOverrides).length === 0 ? (
             <div className="p-12 text-center text-slate-400">
               No extension overrides created yet. Enter an extension above to add one.
             </div>
          ) : (
            Object.entries(localConfig.extensionOverrides).map(([ext, rules]) => (
              <div key={ext} className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-sm font-bold border border-slate-200 dark:border-white/10 uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      .{ext}
                    </span>
                    <span className="text-sm text-slate-500 font-medium">extension files</span>
                  </div>
                  <Button onClick={() => handleRemoveOverride(ext)} variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pl-2">
                  <div className="bg-slate-50/50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                    <h3 className="text-xs uppercase tracking-widest font-bold text-emerald-600 flex items-center mb-1">
                      <Eye className="w-3 h-3 mr-2" /> Can View
                    </h3>
                    <RoleToggles action="view" type="override" ext={ext} />
                  </div>
                  <div className="bg-slate-50/50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                    <h3 className="text-xs uppercase tracking-widest font-bold text-amber-600 flex items-center mb-1">
                      <Download className="w-3 h-3 mr-2" /> Can Download
                    </h3>
                    <RoleToggles action="download" type="override" ext={ext} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
