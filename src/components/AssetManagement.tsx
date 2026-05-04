import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Button } from './ui/button';
import { Plus, Download, X, Loader2, FileText, Image as ImageIcon, Briefcase, LandmarkIcon, Building2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from '../lib/msalConfig';
import { Client } from '@microsoft/microsoft-graph-client';

export type AssetType = 'asset' | 'fd' | 'loan';

interface AssetRecord {
  id: string;
  type: AssetType;
  name: string;
  value: number;
  purchase_date: string | null;
  maturity_date: string | null;
  interest_rate: number | null;
  details: string | null;
  file_url: string | null;
  created_at: string;
  status: string;
}

export const AssetManagement: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<AssetType>('asset');
  const [items, setItems] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // MSAL setup for File Upload
  const { instance, inProgress } = useMsal();
  const [msalReady, setMsalReady] = useState(() => instance.getAllAccounts().length > 0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    name: '',
    value: '',
    purchase_date: '',
    maturity_date: '',
    interest_rate: '',
    details: '',
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('asset_management')
        .select('*')
        .eq('type', activeTab)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          toast.error("Database table 'asset_management' not found. Please run the SQL migration.");
        } else {
          throw error;
        }
      }
      if (data) {
        setItems(data as AssetRecord[]);
      }
    } catch (err: any) {
      console.error("Error fetching items:", err);
      toast.error(err.message || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const getGraphClient = useCallback(async () => {
    const activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
    if (!activeAccount) {
      throw new Error("Not logged into Microsoft. Please authenticate.");
    }
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: activeAccount
    });
    return Client.init({
      authProvider: (done) => {
        done(null, response.accessToken);
      }
    });
  }, [instance]);

  const handleLogin = () => {
    if (inProgress !== "none") {
      toast.info("Authentication is already in progress. Please wait.");
      return;
    }
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(`${window.location.origin}?auth_action=login`, 'oauth_popup', `width=${width},height=${height},left=${left},top=${top}`);
    
    const receiveMessage = async (event: MessageEvent) => {
      if (typeof event.data === 'string' && event.data === 'msal_login_success') {
        window.removeEventListener('message', receiveMessage);
        setMsalReady(true);
        toast.success("Successfully logged in to Microsoft");
      }
    };
    window.addEventListener('message', receiveMessage);
    
    let attempts = 0;
    const pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > 180) { clearInterval(pollInterval); return; }
      try {
        if (instance.getAllAccounts().length > 0) {
          clearInterval(pollInterval);
          window.removeEventListener('message', receiveMessage);
          setMsalReady(true);
        }
      } catch (err) {}
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;
    try {
      setIsUploading(true);
      const client = await getGraphClient();
      
      const timestamp = new Date().getTime();
      const encodedFile = encodeURIComponent(`${timestamp}_${selectedFile.name}`);
      const encodedFolder = encodeURIComponent('PurvaVedic_Assets');
      
      // We will just do a simple put for now. Real implementations can handle larger chunks.
      const response = await client.api(`/me/drive/root:/${encodedFolder}/${encodedFile}:/content`).put(selectedFile);
      
      return response['@microsoft.graph.downloadUrl'] || response.webUrl;
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Failed to upload file to OneDrive.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) {
      toast.error("Please fill Name and Value fields");
      return;
    }
    
    setIsSubmitting(true);
    let uploadedUrl = null;
    if (selectedFile && msalReady) {
      uploadedUrl = await uploadFile();
    }

    const payload = {
      type: activeTab,
      name: form.name,
      value: parseFloat(form.value) || 0,
      purchase_date: form.purchase_date || null,
      maturity_date: form.maturity_date || null,
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
      details: form.details || null,
      file_url: uploadedUrl,
      created_by: user?.id,
    };

    try {
      const { data, error } = await supabase.from('asset_management').insert(payload).select();
      if (error) throw error;
      
      toast.success("Added successfully");
      setShowForm(false);
      setForm(initialForm);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (data && data.length > 0) {
        setItems([data[0], ...items]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save record");
      if (err.message?.includes("table") && err.message?.includes("does not exist")) {
        toast.error("Please ensure you run the SQL migration (asset_management.sql) in your Supabase dashboard.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-indigo-500" />
            Asset & Wealth Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage physical assets, fixed deposits, and loans.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            {showForm ? <><X className="w-4 h-4 mr-2" /> Cancel</> : <><Plus className="w-4 h-4 mr-2" /> Add Record</>}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-white/10 pb-1">
        {[
          { id: 'asset', label: 'Physical Assets', icon: ImageIcon },
          { id: 'fd', label: 'Fixed Deposits', icon: LandmarkIcon },
          { id: 'loan', label: 'Loans & Borrowings', icon: Building2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as AssetType); setShowForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 p-6 mb-8 transform transition-all duration-300 origin-top">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {activeTab === 'asset' ? 'Asset Name/Description' : activeTab === 'fd' ? 'Bank & FD Number' : 'Loan Provider/Purpose'} *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder={activeTab === 'asset' ? 'e.g., MacBook Pro M3' : 'e.g., HDFC Bank FD'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {activeTab === 'loan' ? 'Principal / Loan Amount' : 'Value / Invested Amount'} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {activeTab === 'asset' ? 'Date of Purchase' : 'Start Date'} 
                </label>
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={e => setForm({ ...form, purchase_date: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {(activeTab === 'fd' || activeTab === 'loan') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Maturity / End Date
                    </label>
                    <input
                      type="date"
                      value={form.maturity_date}
                      onChange={e => setForm({ ...form, maturity_date: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.interest_rate}
                      onChange={e => setForm({ ...form, interest_rate: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      placeholder="e.g. 6.5"
                    />
                  </div>
                </>
              )}

              <div className={activeTab === 'asset' ? "md:col-span-2" : "md:col-span-1"}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Additional Details
                </label>
                <input
                  type="text"
                  value={form.details}
                  onChange={e => setForm({ ...form, details: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Notes, receipts IDs, etc..."
                />
              </div>

              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-700 mb-4">
                  {activeTab === 'asset' ? 'Upload Photo / Invoice' : 'Upload Document'} (Microsoft OneDrive)
                </label>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {!msalReady ? (
                    <Button type="button" variant="outline" onClick={handleLogin} className="border-[#0078D4] text-[#0078D4]">
                      Connect Microsoft Account to Upload
                    </Button>
                  ) : (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                        accept={activeTab === 'asset' ? "image/*,.pdf" : ".pdf,.jpg,.jpeg,.png,.doc,.docx"}
                      />
                      <Button
                        type="button"
                        variant={selectedFile ? "outline" : "default"}
                        onClick={() => fileInputRef.current?.click()}
                        className={selectedFile ? "border-green-500 text-green-600" : "bg-[#0078D4] hover:bg-[#005a9e] text-white"}
                      >
                        <UploadCloud className="w-4 h-4 mr-2" />
                        {selectedFile ? 'Change File' : 'Select File'}
                      </Button>
                      
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                          <button
                            type="button"
                            onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                {isUploading ? "Uploading..." : isSubmitting ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No records found</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            You haven't added any {activeTab === 'asset' ? 'physical assets' : activeTab === 'fd' ? 'fixed deposits' : 'loans'} yet.
          </p>
          <Button onClick={() => setShowForm(true)} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add First Record
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white line-clamp-1" title={item.name}>
                    {item.name}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    ₹{item.value.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div className="space-y-3 text-sm">
                  {item.purchase_date && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{activeTab === 'asset' ? 'Purchased' : 'Started'}:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-300">
                        {new Date(item.purchase_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {item.maturity_date && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Maturity/End:</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {new Date(item.maturity_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {item.interest_rate && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Interest Rate:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {item.interest_rate}%
                      </span>
                    </div>
                  )}
                  {item.details && (
                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-500 line-clamp-2">
                      {item.details}
                    </div>
                  )}
                </div>
              </div>
              
              {item.file_url && (
                <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                  <a 
                    href={item.file_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center font-medium"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    View Attached {activeTab === 'asset' ? 'Photo' : 'Document'}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
