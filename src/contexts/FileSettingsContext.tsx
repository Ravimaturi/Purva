import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '../types';

export interface RolePermissions {
  view: UserRole[];
  download: UserRole[];
}

export interface FilePermissionsConfig {
  defaultPermissions: RolePermissions;
  // Key: file extension (e.g., 'dwg', 'pdf', 'jpg')
  extensionOverrides: Record<string, RolePermissions>;
  
  projects: {
    create: UserRole[];
    edit: UserRole[];
    delete: UserRole[];
  };
  tasks: {
    create: UserRole[];
    edit: UserRole[];
    delete: UserRole[];
  };
  vendors: {
    create: UserRole[];
    edit: UserRole[];
    delete: UserRole[];
  };
  pettyCash: {
    create: UserRole[];
    edit: UserRole[];
    delete: UserRole[];
  };
}

const DEFAULT_CONFIG: FilePermissionsConfig = {
  defaultPermissions: {
    view: ['admin', 'chief_sthapathy', 'deputy_sthapathy', 'assistant_sthapathy', 'junior_sthapathy', 'finance_manager', 'employee'], // Everyone can view by default
    download: ['admin', 'chief_sthapathy', 'deputy_sthapathy', 'assistant_sthapathy', 'finance_manager', 'employee'] // Excludes junior_sthapathy by default
  },
  extensionOverrides: {
    'dwg': {
      view: ['admin', 'chief_sthapathy', 'deputy_sthapathy', 'assistant_sthapathy', 'junior_sthapathy'],
      download: ['admin', 'chief_sthapathy', 'deputy_sthapathy']
    },
    'stl': {
      view: ['admin', 'chief_sthapathy', 'deputy_sthapathy', 'assistant_sthapathy', 'junior_sthapathy'],
      download: ['admin', 'chief_sthapathy', 'deputy_sthapathy']
    },
    'rvt': {
      view: ['admin', 'chief_sthapathy', 'deputy_sthapathy', 'assistant_sthapathy', 'junior_sthapathy'],
      download: ['admin', 'chief_sthapathy', 'deputy_sthapathy']
    }
  },
  projects: {
    create: ['admin', 'chief_sthapathy', 'deputy_sthapathy'],
    edit: ['admin', 'chief_sthapathy', 'deputy_sthapathy'],
    delete: ['admin'] // Only admin by default
  },
  tasks: {
    create: ['admin', 'chief_sthapathy', 'deputy_sthapathy'],
    edit: ['admin', 'chief_sthapathy', 'deputy_sthapathy'],
    delete: ['admin', 'chief_sthapathy']
  },
  vendors: {
    create: ['admin', 'finance_manager'],
    edit: ['admin', 'finance_manager'],
    delete: ['admin']
  },
  pettyCash: {
    create: ['admin', 'finance_manager'],
    edit: ['admin', 'finance_manager'],
    delete: ['admin']
  }
};

interface FileSettingsContextType {
  config: FilePermissionsConfig;
  updateConfig: (newConfig: FilePermissionsConfig) => void;
  canViewFile: (role: UserRole | undefined, fileName: string, uploaderId?: string | null, userId?: string | null) => boolean;
  canDownloadFile: (role: UserRole | undefined, fileName: string, uploaderId?: string | null, userId?: string | null) => boolean;
  canManageProjects: (role: UserRole | undefined, action: 'create' | 'edit' | 'delete') => boolean;
  canManageTasks: (role: UserRole | undefined, action: 'create' | 'edit' | 'delete') => boolean;
  canManageVendors: (role: UserRole | undefined, action: 'create' | 'edit' | 'delete') => boolean;
  canManagePettyCash: (role: UserRole | undefined, action: 'create' | 'edit' | 'delete') => boolean;
}

const FileSettingsContext = createContext<FileSettingsContextType | undefined>(undefined);

export const FileSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<FilePermissionsConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Load from localStorage for prototype usage
    const saved = localStorage.getItem('purva_file_permissions_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({
          defaultPermissions: parsed.defaultPermissions || DEFAULT_CONFIG.defaultPermissions,
          extensionOverrides: parsed.extensionOverrides || DEFAULT_CONFIG.extensionOverrides,
          projects: parsed.projects || DEFAULT_CONFIG.projects,
          tasks: parsed.tasks || DEFAULT_CONFIG.tasks,
          vendors: parsed.vendors || DEFAULT_CONFIG.vendors,
          pettyCash: parsed.pettyCash || DEFAULT_CONFIG.pettyCash
        });
      } catch (e) {
        console.error("Failed to parse file permissions from local storage");
      }
    }
  }, []);

  const updateConfig = (newConfig: FilePermissionsConfig) => {
    setConfig(newConfig);
    localStorage.setItem('purva_file_permissions_v1', JSON.stringify(newConfig));
  };

  const getExt = (fileName: string) => fileName.split('.').pop()?.toLowerCase() || '';

  const canViewFile = (role: UserRole | undefined, fileName: string, uploaderId?: string | null, userId?: string | null) => {
    if (!role) return false;
    if (role === 'admin' || role === 'chief_sthapathy') return true; // Admins override everything
    if (uploaderId && userId && uploaderId === userId) return true; // Uploader can always view their file

    const ext = getExt(fileName);
    const rules = config.extensionOverrides[ext] || config.defaultPermissions;
    return rules.view.includes(role);
  };

  const canDownloadFile = (role: UserRole | undefined, fileName: string, uploaderId?: string | null, userId?: string | null) => {
    if (!role) return false;
    if (role === 'admin' || role === 'chief_sthapathy') return true; // Admins override everything
    if (uploaderId && userId && uploaderId === userId) return true; // Uploader can always download their file

    const ext = getExt(fileName);
    const rules = config.extensionOverrides[ext] || config.defaultPermissions;
    return rules.download.includes(role);
  };

  const canManageProjects = (role: UserRole | undefined, action: 'create' | 'edit' | 'delete') => {
    if (!role) return false;
    if (role === 'admin' || role === 'chief_sthapathy') return true;
    return config.projects[action].includes(role);
  };

  const canManageTasks = (role: UserRole | undefined, action: 'create' | 'edit' | 'delete') => {
    if (!role) return false;
    if (role === 'admin' || role === 'chief_sthapathy') return true;
    return config.tasks[action].includes(role);
  };

  const canManageVendors = (role: UserRole | undefined, action: 'create' | 'edit' | 'delete') => {
    if (!role) return false;
    if (role === 'admin') return true;
    return config.vendors[action].includes(role);
  };

  const canManagePettyCash = (role: UserRole | undefined, action: 'create' | 'edit' | 'delete') => {
    if (!role) return false;
    if (role === 'admin') return true;
    return config.pettyCash[action].includes(role);
  };

  return (
    <FileSettingsContext.Provider value={{ 
      config, 
      updateConfig, 
      canViewFile, 
      canDownloadFile, 
      canManageProjects, 
      canManageTasks,
      canManageVendors,
      canManagePettyCash
    }}>
      {children}
    </FileSettingsContext.Provider>
  );
};

export const useFileSettings = () => {
  const context = useContext(FileSettingsContext);
  if (context === undefined) {
    throw new Error('useFileSettings must be used within a FileSettingsProvider');
  }
  return context;
};
