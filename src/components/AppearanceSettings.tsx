import React, { useRef } from 'react';
import { useTheme, AccentColor, DashboardStyle } from '../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn, fileToBase64 } from '../lib/utils';
import { Paintbrush, LayoutDashboard, Palette, Image as ImageIcon, Upload, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropperDialog } from './ImageCropperDialog';

interface AppearanceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ open, onOpenChange }) => {
  const { accentColor, setAccentColor, dashboardStyle, setDashboardStyle, isColorful, setIsColorful, workspaceLogo, setWorkspaceLogo, workspaceName, setWorkspaceName } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = React.useState(workspaceName);
  
  const [isCropOpen, setIsCropOpen] = React.useState(false);
  const [cropImageSrc, setCropImageSrc] = React.useState('');

  React.useEffect(() => {
    if (open) setLocalName(workspaceName);
  }, [open, workspaceName]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be less than 2MB');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setCropImageSrc(base64);
      setIsCropOpen(true);
    } catch (err) {
      toast.error('Failed to process image');
    }
  };

  const handleCropComplete = async (croppedBase64: string) => {
    await setWorkspaceLogo(croppedBase64);
    toast.success('Workspace logo updated!');
    setCropImageSrc('');
  };

  const colors: { id: AccentColor; name: string; hex: string }[] = [
    { id: 'indigo', name: 'Indigo', hex: 'bg-indigo-600' },
    { id: 'blue', name: 'Blue', hex: 'bg-blue-600' },
    { id: 'emerald', name: 'Emerald', hex: 'bg-emerald-600' },
    { id: 'rose', name: 'Rose', hex: 'bg-rose-600' },
    { id: 'violet', name: 'Violet', hex: 'bg-violet-600' },
    { id: 'orange', name: 'Orange', hex: 'bg-orange-600' },
    { id: 'slate', name: 'Slate', hex: 'bg-slate-700' },
  ];

  const styles: { id: DashboardStyle; name: string; desc: string }[] = [
    { id: 'shadow', name: 'Soft Shadow', desc: 'Floating cards with gentle drop shadows' },
    { id: 'border', name: 'Bordered', desc: 'Clean outlines with no shadows' },
    { id: 'glass', name: 'Glassmorphism', desc: 'Translucent backgrounds' },
    { id: 'flat', name: 'Flat Palette', desc: 'Solid pastel background filled' },
  ];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Paintbrush className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Appearance</DialogTitle>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Customize your workspace look and feel</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Primary Color
              </h3>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-3">
              {colors.map(color => (
                <button
                  key={color.id}
                  onClick={() => {
                    setAccentColor(color.id);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    color.hex,
                    accentColor === color.id ? "ring-4 ring-slate-200 ring-offset-2 scale-110 shadow-lg" : "hover:scale-105 opacity-90 hover:opacity-100"
                  )}
                  title={color.name}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 justify-between cursor-pointer active:scale-[0.98] transition-all" onClick={() => setIsColorful(!isColorful)}>
              <div>
                <p className="font-bold text-sm text-slate-900">Rainbow Project Colors</p>
                <p className="text-xs text-slate-500">Each project card gets a unique color</p>
              </div>
              <div className={cn("w-10 h-6 rounded-full flex items-center transition-colors px-1", isColorful ? "bg-indigo-600 justify-end" : "bg-slate-300 justify-start")}>
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Cards Style
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {styles.map(style => (
                <div 
                  key={style.id}
                  onClick={() => setDashboardStyle(style.id)}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all",
                    dashboardStyle === style.id 
                      ? "border-slate-800 bg-slate-50 shadow-sm" 
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                >
                  <p className={cn("font-bold text-sm mb-1", dashboardStyle === style.id ? "text-slate-900" : "text-slate-700")}>{style.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{style.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Workspace Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Workspace Name</label>
                <div className="flex gap-2">
                  <Input 
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="border-slate-200"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setWorkspaceName(localName);
                      toast.success('Workspace name updated');
                    }}
                    disabled={localName === workspaceName}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 mt-2 border border-slate-200 rounded-2xl bg-white">
              {workspaceLogo ? (
                <img src={workspaceLogo} alt="Workspace Logo" className="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-100" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Upload Logo</p>
                <p className="text-xs text-slate-500">Max 2MB. Recommended: PNG</p>
              </div>
              <div className="flex items-center gap-2">
                {workspaceLogo && (
                  <Button variant="ghost" size="sm" onClick={() => setWorkspaceLogo(null)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    Remove
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Browse
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {isCropOpen && (
      <ImageCropperDialog
        open={isCropOpen}
        onOpenChange={setIsCropOpen}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
      />
    )}
    </>
  );
};
