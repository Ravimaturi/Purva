import React, { useState, useRef } from "react";
import {
  useFileSettings,
  FilePermissionsConfig,
  RolePermissions,
} from "../contexts/FileSettingsContext";
import { useUser } from "../contexts/UserContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  useTheme,
  AccentColor,
  ThemeMode,
  DashboardStyle,
} from "../contexts/ThemeContext";
import { UserRole, hasAdminAccess, RoleLabels } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  ShieldCheck,
  Save,
  Trash2,
  Plus,
  Download,
  Eye,
  Palette,
  Paintbrush,
  Moon,
  Sun,
  Monitor,
  LayoutDashboard,
  Building2,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn, fileToBase64 } from "../lib/utils";
import { ImageCropperDialog } from "./ImageCropperDialog";

const ALL_ROLES: UserRole[] = [
  "admin",
  "chief_sthapathy",
  "deputy_sthapathy",
  "assistant_sthapathy",
  "junior_sthapathy",
  "finance_manager",
  "employee",
];

const ACCENT_COLORS: {
  label: string;
  value: AccentColor;
  colorClass: string;
}[] = [
  { label: "Indigo", value: "indigo", colorClass: "bg-indigo-500" },
  { label: "Rose", value: "rose", colorClass: "bg-rose-500" },
  { label: "Emerald", value: "emerald", colorClass: "bg-emerald-500" },
  { label: "Blue", value: "blue", colorClass: "bg-blue-500" },
  { label: "Violet", value: "violet", colorClass: "bg-violet-500" },
  { label: "Orange", value: "orange", colorClass: "bg-orange-500" },
  { label: "Slate", value: "slate", colorClass: "bg-slate-500" },
];

export const FileControls = () => {
  const { user } = useUser();
  const { t } = useLanguage();
  const { config, updateConfig } = useFileSettings();
  const {
    accentColor,
    setAccentColor,
    dashboardStyle,
    setDashboardStyle,
    isColorful,
    setIsColorful,
    themeMode,
    setThemeMode,
    workspaceLogo,
    setWorkspaceLogo,
    workspaceName,
    setWorkspaceName,
  } = useTheme();

  // Local state for editing
  const [localConfig, setLocalConfig] = useState<FilePermissionsConfig>(config);
  const [newExt, setNewExt] = useState("");
  const [activeTab, setActiveTab] = useState("appearance");

  // Appearance local state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = React.useState(workspaceName);
  const [isCropOpen, setIsCropOpen] = React.useState(false);
  const [cropImageSrc, setCropImageSrc] = React.useState("");

  React.useEffect(() => {
    setLocalName(workspaceName);
  }, [workspaceName]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2MB");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setCropImageSrc(base64);
      setIsCropOpen(true);
    } catch (err) {
      toast.error("Failed to process image");
    }
  };

  const handleCropComplete = async (croppedBase64: string) => {
    // Save both the cropped icon and the full original image
    await setWorkspaceLogo(croppedBase64, cropImageSrc);
    toast.success("Workspace logo updated!");
    setCropImageSrc("");
  };

  const styles: { id: DashboardStyle; name: string; desc: string }[] = [
    {
      id: "shadow",
      name: "Soft Shadow",
      desc: "Floating cards with gentle drop shadows",
    },
    { id: "border", name: "Bordered", desc: "Clean outlines with no shadows" },
    { id: "glass", name: "Glassmorphism", desc: "Translucent backgrounds" },
    {
      id: "flat",
      name: "Flat Palette",
      desc: "Solid pastel background filled",
    },
  ];

  if (!hasAdminAccess(user?.role)) {
    return (
      <div className="p-6 text-center text-slate-500">
        You do not have permission to view file controls.
      </div>
    );
  }

  const handleSave = () => {
    updateConfig(localConfig);
    toast.success("Settings updated and saved to this browser.");
  };

  const toggleRole = (
    type: "default" | "override",
    action: "view" | "download",
    role: UserRole,
    ext?: string,
  ) => {
    setLocalConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as FilePermissionsConfig;

      let targetList: UserRole[] = [];
      if (type === "default") {
        targetList = next.defaultPermissions[action];
      } else if (type === "override" && ext) {
        targetList = next.extensionOverrides[ext][action];
      }

      if (targetList.includes(role)) {
        // Remove
        if (type === "default") {
          next.defaultPermissions[action] = targetList.filter(
            (r) => r !== role,
          );
        } else if (type === "override" && ext) {
          next.extensionOverrides[ext][action] = targetList.filter(
            (r) => r !== role,
          );
        }
      } else {
        // Add
        if (type === "default") {
          next.defaultPermissions[action] = [...targetList, role];
        } else if (type === "override" && ext) {
          next.extensionOverrides[ext][action] = [...targetList, role];
        }
      }

      return next;
    });
  };

  const activeRolesObj = (
    action: "view" | "download",
    type: "default" | "override",
    ext?: string,
  ) => {
    if (type === "default") return localConfig.defaultPermissions[action];
    if (type === "override" && ext && localConfig.extensionOverrides[ext]) {
      return localConfig.extensionOverrides[ext][action];
    }
    return [];
  };

  const RoleToggles = ({
    action,
    type,
    ext,
  }: {
    action: "view" | "download";
    type: "default" | "override";
    ext?: string;
  }) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {ALL_ROLES.map((role) => {
          const isActive = activeRolesObj(action, type, ext).includes(role);
          // Admins always have access, disable toggling for admin but show it as active
          const isHardcodedAdmin =
            role === "admin" || role === "chief_sthapathy";

          return (
            <button
              key={role}
              disabled={isHardcodedAdmin}
              onClick={() => toggleRole(type, action, role, ext)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isHardcodedAdmin
                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 opacity-70 cursor-not-allowed"
                  : isActive
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
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
    const ext = newExt.trim().toLowerCase().replace(".", "");
    if (!ext) return;

    if (localConfig.extensionOverrides[ext]) {
      toast.error("Override already exists for this extension");
      return;
    }

    setLocalConfig((prev) => ({
      ...prev,
      extensionOverrides: {
        ...prev.extensionOverrides,
        [ext]: {
          view: [...prev.defaultPermissions.view],
          download: [...prev.defaultPermissions.download],
        },
      },
    }));
    setNewExt("");
  };

  const handleRemoveOverride = (ext: string) => {
    setLocalConfig((prev) => {
      const next = { ...prev };
      const overrides = { ...next.extensionOverrides };
      delete overrides[ext];
      next.extensionOverrides = overrides;
      return next;
    });
  };

  const toggleFeatureRole = (
    feature: "projects" | "tasks",
    action: "create" | "edit" | "delete",
    role: UserRole,
  ) => {
    setLocalConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as FilePermissionsConfig;

      const targetList = next[feature][action];

      if (targetList.includes(role)) {
        next[feature][action] = targetList.filter((r) => r !== role);
      } else {
        next[feature][action] = [...targetList, role];
      }

      return next;
    });
  };

  const FeatureRoleToggles = ({
    feature,
    action,
  }: {
    feature: "projects" | "tasks" | "vendors" | "pettyCash" | "assets";
    action: "create" | "edit" | "delete";
  }) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {ALL_ROLES.map((role) => {
          const isActive = localConfig[feature][action].includes(role);
          const isHardcodedAdmin =
            (role === "admin" || role === "chief_sthapathy") &&
            (feature === "projects" || feature === "tasks");
          const isHardcodedFinanceAdmin = role === "admin";
          const isDisabled =
            feature === "vendors" ||
            feature === "pettyCash" ||
            feature === "assets"
              ? isHardcodedFinanceAdmin
              : isHardcodedAdmin;

          return (
            <button
              key={role}
              disabled={isDisabled}
              onClick={() => toggleFeatureRole(feature as any, action, role)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isDisabled
                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 opacity-70 cursor-not-allowed"
                  : isActive
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />{" "}
            {t("control_panel")}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Manage global app settings, features, and file permissions
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg"
        >
          <Save className="w-4 h-4 mr-2" /> Save Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex gap-2 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
          {[
            { id: "appearance", label: "Appearance", icon: Palette },
            { id: "features", label: "Features", icon: ShieldCheck },
            { id: "files", label: "Files", icon: Download },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm border shrink-0 ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-[#121212] dark:text-slate-400 dark:border-slate-800 dark:hover:bg-[#151515]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <TabsContent value="appearance" className="space-y-6">
          <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151515]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Workspace Details
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure your workspace name and logo
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                  Workspace Name
                </label>
                <div className="flex flex-col sm:flex-row gap-3 max-w-sm">
                  <Input
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="border-slate-200 dark:border-slate-800"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setWorkspaceName(localName);
                      toast.success("Workspace name updated");
                    }}
                    disabled={localName === workspaceName}
                    className="w-full sm:w-auto"
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                  Workspace Logo
                </label>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 border border-slate-200 dark:border-white/10 rounded-2xl max-w-2xl bg-slate-50/50 dark:bg-transparent">
                  {workspaceLogo ? (
                    <img
                      src={workspaceLogo}
                      alt="Workspace Logo"
                      className="w-16 h-16 sm:w-12 sm:h-12 rounded-lg object-contain bg-white dark:bg-[#181818] border border-slate-100 dark:border-white/10 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-12 sm:h-12 rounded-lg bg-white dark:bg-[#181818] border border-slate-100 dark:border-white/10 shadow-sm flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 sm:w-5 sm:h-5 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Upload Logo
                    </p>
                    <p className="text-xs text-slate-500 mt-1 sm:mt-0">
                      Max 2MB. Recommended: PNG icon
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {workspaceLogo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setWorkspaceLogo(null)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 w-full sm:w-auto mt-2 sm:mt-0"
                      >
                        Remove
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto mt-2 sm:mt-0"
                    >
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
          </div>

          <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151515]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Theme & Appearance
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure your workspace visual appearance
              </p>
            </div>

            <div className="p-6 space-y-8">
              {/* Primary Color Section */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-500" /> Primary Accent
                  Color
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        accentColor === color.value
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center ${color.colorClass}`}
                      >
                        {accentColor === color.value && (
                          <div className="w-3 h-3 bg-white rounded-full shadow-md" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          accentColor === color.value
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {color.label}
                      </span>
                    </button>
                  ))}

                  {/* Custom Color Input */}
                  <div
                    className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${accentColor.startsWith("#") ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                  >
                    <div className="relative w-8 h-8 rounded-full shadow-sm overflow-hidden flex items-center justify-center border border-slate-200">
                      <input
                        type="color"
                        value={
                          accentColor.startsWith("#") ? accentColor : "#4f46e5"
                        }
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="absolute inset-0 w-16 h-16 -top-2 -left-2 cursor-pointer"
                      />
                    </div>
                    <span
                      className={`text-sm font-bold ${accentColor.startsWith("#") ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400"}`}
                    >
                      Custom
                    </span>
                  </div>
                </div>
              </div>

              {/* Theme Mode Section */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-slate-500" /> Theme Mode
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                  {[
                    {
                      id: "light",
                      name: "Light Mode",
                      icon: Sun,
                      desc: "Clean and bright",
                    },
                    {
                      id: "dark",
                      name: "Nightview",
                      icon: Moon,
                      desc: "Easy on the eyes",
                    },
                    {
                      id: "system",
                      name: "System Sync",
                      icon: Monitor,
                      desc: "Matches device settings",
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setThemeMode(mode.id as ThemeMode)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-center",
                        themeMode === mode.id
                          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-sm"
                          : "border-slate-200 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]",
                      )}
                    >
                      <mode.icon
                        className={cn(
                          "w-6 h-6 mb-2",
                          themeMode === mode.id
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-slate-500",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-bold mb-1",
                          themeMode === mode.id
                            ? "text-indigo-900 dark:text-indigo-100"
                            : "text-slate-700 dark:text-zinc-300",
                        )}
                      >
                        {mode.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {mode.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced UI Sections */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                    <Paintbrush className="w-4 h-4 text-rose-500" /> Advanced
                    Styling
                  </h3>
                  <div
                    className="flex items-center p-4 bg-slate-50 dark:bg-[#181818] rounded-2xl border border-slate-100 dark:border-white/10 justify-between cursor-pointer active:scale-[0.98] transition-all max-w-2xl"
                    onClick={() => setIsColorful(!isColorful)}
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                        Rainbow Project Colors
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Assign unique colorful accents to each project tile
                      </p>
                    </div>
                    <div
                      className={cn(
                        "w-12 h-6 rounded-full flex items-center transition-colors px-1",
                        isColorful
                          ? "bg-indigo-600 justify-end"
                          : "bg-slate-300 dark:bg-slate-700 justify-start",
                      )}
                    >
                      <div className="w-5 h-5 rounded-full bg-white dark:bg-white shadow-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-emerald-500" />{" "}
                    Dashboard Card Style
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                    {styles.map((style) => (
                      <div
                        key={style.id}
                        onClick={() => setDashboardStyle(style.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all",
                          dashboardStyle === style.id
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-sm"
                            : "border-slate-200 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-900/50",
                        )}
                      >
                        <p
                          className={cn(
                            "font-bold text-sm mb-1",
                            dashboardStyle === style.id
                              ? "text-indigo-900 dark:text-indigo-100"
                              : "text-slate-700 dark:text-slate-300",
                          )}
                        >
                          {style.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {style.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151515]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Feature Permissions
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure who can manage system modules.
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {/* Projects */}
              <div className="p-6 space-y-6">
                <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  Projects Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Create Projects
                    </h4>
                    <FeatureRoleToggles feature="projects" action="create" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Edit Projects
                    </h4>
                    <FeatureRoleToggles feature="projects" action="edit" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">
                      Delete Projects
                    </h4>
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
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Create Tasks
                    </h4>
                    <FeatureRoleToggles feature="tasks" action="create" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Edit Tasks
                    </h4>
                    <FeatureRoleToggles feature="tasks" action="edit" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">
                      Delete Tasks
                    </h4>
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
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Create Vendors
                    </h4>
                    <FeatureRoleToggles feature="vendors" action="create" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Edit Vendors
                    </h4>
                    <FeatureRoleToggles feature="vendors" action="edit" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">
                      Delete Vendors
                    </h4>
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
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Create Entries
                    </h4>
                    <FeatureRoleToggles feature="pettyCash" action="create" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Edit Entries
                    </h4>
                    <FeatureRoleToggles feature="pettyCash" action="edit" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">
                      Delete Entries
                    </h4>
                    <FeatureRoleToggles feature="pettyCash" action="delete" />
                  </div>
                </div>
              </div>

              {/* Assets */}
              <div className="p-6 space-y-6 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  Assets Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Create Assets
                    </h4>
                    <FeatureRoleToggles feature="assets" action="create" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Edit Assets
                    </h4>
                    <FeatureRoleToggles feature="assets" action="edit" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">
                      Delete Assets
                    </h4>
                    <FeatureRoleToggles feature="assets" action="delete" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300">
            <p className="font-bold">Note on Security:</p>
            <p className="mt-1">
              Admin, Chief Sthapathy, and the original uploader will always have
              full access to view and download their respective files regardless
              of these toggles.
            </p>
          </div>

          <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151515]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Default File Permissions
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Applies to all files without a specific override.
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 flex items-center mb-1">
                  <Eye className="w-4 h-4 mr-2 text-emerald-500" /> Roles
                  allowed to VIEW files
                </h3>
                <RoleToggles action="view" type="default" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 flex items-center mb-1">
                  <Download className="w-4 h-4 mr-2 text-amber-500" /> Roles
                  allowed to DOWNLOAD files
                </h3>
                <RoleToggles action="download" type="default" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151515] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Extension Overrides
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Define strict granular permissions for sensitive file types
                  (e.g. DWG, PDF)
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={newExt}
                  onChange={(e) => setNewExt(e.target.value)}
                  placeholder="e.g. dwg"
                  className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-black rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white uppercase font-mono"
                />
                <Button
                  onClick={handleAddOverride}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Rule
                </Button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {Object.keys(localConfig.extensionOverrides).length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No extension overrides created yet. Enter an extension above
                  to add one.
                </div>
              ) : (
                Object.entries(localConfig.extensionOverrides).map(
                  ([ext, rules]) => (
                    <div key={ext} className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-sm font-bold border border-slate-200 dark:border-white/10 uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            .{ext}
                          </span>
                          <span className="text-sm text-slate-500 font-medium">
                            extension files
                          </span>
                        </div>
                        <Button
                          onClick={() => handleRemoveOverride(ext)}
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pl-2">
                        <div className="bg-slate-50/50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                          <h3 className="text-xs uppercase tracking-widest font-bold text-emerald-600 flex items-center mb-1">
                            <Eye className="w-3 h-3 mr-2" /> Can View
                          </h3>
                          <RoleToggles
                            action="view"
                            type="override"
                            ext={ext}
                          />
                        </div>
                        <div className="bg-slate-50/50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                          <h3 className="text-xs uppercase tracking-widest font-bold text-amber-600 flex items-center mb-1">
                            <Download className="w-3 h-3 mr-2" /> Can Download
                          </h3>
                          <RoleToggles
                            action="download"
                            type="override"
                            ext={ext}
                          />
                        </div>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {isCropOpen && (
        <ImageCropperDialog
          open={isCropOpen}
          onOpenChange={setIsCropOpen}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};
