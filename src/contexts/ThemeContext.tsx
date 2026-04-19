import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type AccentColor = 'indigo' | 'rose' | 'emerald' | 'blue' | 'violet' | 'orange' | 'slate';
export type DashboardStyle = 'shadow' | 'border' | 'glass' | 'flat';

interface ThemeContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  dashboardStyle: DashboardStyle;
  setDashboardStyle: (style: DashboardStyle) => void;
  isColorful: boolean;
  setIsColorful: (colorful: boolean) => void;
  workspaceName: string;
  setWorkspaceName: (name: string) => Promise<void>;
  workspaceLogo: string | null;
  setWorkspaceLogo: (logo: string | null) => Promise<void>;
  getProjectColors: (index: number) => any;
  getDashboardColors: () => any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    return (localStorage.getItem('app-accent') as AccentColor) || 'indigo';
  });
  
  const [dashboardStyle, setDashboardStyle] = useState<DashboardStyle>(() => {
    return (localStorage.getItem('app-cardStyle') as DashboardStyle) || 'shadow';
  });

  const [isColorful, setIsColorful] = useState<boolean>(() => {
    const saved = localStorage.getItem('app-colorful');
    return saved !== null ? saved === 'true' : true;
  });

  const [workspaceName, setWorkspaceNameState] = useState<string>('Purva Vedic');
  const [workspaceLogo, setWorkspaceLogoState] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('app-accent', accentColor);
    localStorage.setItem('app-cardStyle', dashboardStyle);
    localStorage.setItem('app-colorful', String(isColorful));
    
    // Set root attribute to let CSS override the theme colors globally
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [accentColor, dashboardStyle, isColorful]);

  useEffect(() => {
    const loadWorkspaceSettings = async () => {
      // Load local settings as fallback
      const localName = localStorage.getItem('app-workspace-name');
      const localLogo = localStorage.getItem('app-workspace-logo');
      if (localName) setWorkspaceNameState(localName);
      if (localLogo) setWorkspaceLogoState(localLogo);

      // Try fetching from supabase (it will fail if the table doesn't exist yet, which is expected before running the SQL)
      try {
        const { data, error } = await supabase.from('workspace_settings').select('*').limit(1).maybeSingle();
        if (!error && data) {
          if (data.workspace_name) setWorkspaceNameState(data.workspace_name);
          if (data.logo_url) setWorkspaceLogoState(data.logo_url);
        }
      } catch (err) {
        // Table probably doesn't exist yet, ignore
      }
    };
    loadWorkspaceSettings();
  }, []);

  const setWorkspaceName = async (name: string) => {
    setWorkspaceNameState(name);
    localStorage.setItem('app-workspace-name', name);
    try {
      const { data } = await supabase.from('workspace_settings').select('id').limit(1).maybeSingle();
      if (data?.id) {
        await supabase.from('workspace_settings').update({ workspace_name: name }).eq('id', data.id);
      } else {
        await supabase.from('workspace_settings').insert([{ workspace_name: name }]);
      }
    } catch (err) {
      // Ignored
    }
  };

  const setWorkspaceLogo = async (logo: string | null) => {
    setWorkspaceLogoState(logo);
    if (logo) localStorage.setItem('app-workspace-logo', logo);
    else localStorage.removeItem('app-workspace-logo');

    try {
      const { data } = await supabase.from('workspace_settings').select('id').limit(1).maybeSingle();
      if (data?.id) {
        await supabase.from('workspace_settings').update({ logo_url: logo }).eq('id', data.id);
      } else {
        await supabase.from('workspace_settings').insert([{ logo_url: logo }]);
      }
    } catch (err) {
      // Ignored
    }
  };

  const PALETTES: Record<AccentColor, any> = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', progress: 'bg-indigo-500', hoverBg: 'hover:bg-indigo-500', solid: 'bg-indigo-600', solidHover: 'hover:bg-indigo-700' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', progress: 'bg-rose-500', hoverBg: 'hover:bg-rose-500', solid: 'bg-rose-600', solidHover: 'hover:bg-rose-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', progress: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-500', solid: 'bg-emerald-600', solidHover: 'hover:bg-emerald-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', progress: 'bg-blue-500', hoverBg: 'hover:bg-blue-500', solid: 'bg-blue-600', solidHover: 'hover:bg-blue-700' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', progress: 'bg-violet-500', hoverBg: 'hover:bg-violet-500', solid: 'bg-violet-600', solidHover: 'hover:bg-violet-700' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', progress: 'bg-orange-500', hoverBg: 'hover:bg-orange-500', solid: 'bg-orange-600', solidHover: 'hover:bg-orange-700' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', progress: 'bg-slate-600', hoverBg: 'hover:bg-slate-600', solid: 'bg-slate-700', solidHover: 'hover:bg-slate-800' },
  };

  const getProjectColors = (index: number) => {
    if (isColorful) {
      const colors = [
        PALETTES.emerald,
        PALETTES.orange,
        PALETTES.blue,
        PALETTES.rose,
        PALETTES.violet,
        PALETTES.slate,
        PALETTES.indigo,
      ];
      return colors[index % colors.length];
    }
    return PALETTES[accentColor];
  };

  const getDashboardColors = () => {
    return PALETTES[accentColor];
  };

  return (
    <ThemeContext.Provider value={{ 
      accentColor, setAccentColor, 
      dashboardStyle, setDashboardStyle, 
      isColorful, setIsColorful, 
      workspaceName, setWorkspaceName,
      workspaceLogo, setWorkspaceLogo,
      getProjectColors, getDashboardColors 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
