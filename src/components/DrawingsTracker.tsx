import React, { useState, useEffect, useCallback } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from '../lib/msalConfig';
import { Client } from '@microsoft/microsoft-graph-client';
import { Button } from './ui/button';
import { FileIcon, Download, Upload, Loader2, FolderOpen, Image as ImageIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

interface DrawingsTrackerProps {
  projectId: string;
  projectName: string;
  projectFiles?: any[];
  onFileUploaded?: () => void;
}

export const DrawingsTracker: React.FC<DrawingsTrackerProps> = ({ 
  projectId, 
  projectName,
  projectFiles = [],
  onFileUploaded
}) => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { user, allUsers } = useUser();
  const [isUploading, setIsUploading] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGraphClient = useCallback(async () => {
    if (accounts.length === 0) throw new Error("No accounts found");
    
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0]
    });

    return Client.init({
      authProvider: (done) => {
        done(null, response.accessToken);
      }
    });
  }, [instance, accounts]);

  const handleLogin = () => {
    if (inProgress !== "none") {
      toast.info("Authentication is already in progress. Please wait.");
      return;
    }
    
    // Open a popup to our own app to initiate the redirect flow
    // This bypasses iframe popup communication issues by using redirect inside the popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      `${window.location.origin}?auth_action=login`, 
      'oauth_popup', 
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Poll localStorage for the account
    const pollInterval = setInterval(() => {
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        clearInterval(pollInterval);
        instance.setActiveAccount(accounts[0]);
        toast.success("Successfully logged in to Microsoft");
      }
    }, 1000);

    // Stop polling after 3 minutes
    setTimeout(() => clearInterval(pollInterval), 180000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const client = await getGraphClient();
      const folderName = projectName.replace(/[^a-zA-Z0-9 -]/g, '').trim();
      const folderPath = `PurvaVedic_Projects/${folderName}`;

      if (file.size <= 4 * 1024 * 1024) {
        // Simple upload for small files (<= 4MB)
        await client.api(`/me/drive/root:/${folderPath}/${file.name}:/content`)
          .put(file);
      } else {
        // Large file upload session for files > 4MB (like large DWG files)
        const uploadSession = await client.api(`/me/drive/root:/${folderPath}/${file.name}:/createUploadSession`).post({
          item: {
            "@microsoft.graph.conflictBehavior": "replace",
            "name": file.name
          }
        });

        const uploadUrl = uploadSession.uploadUrl;
        const maxChunkSize = 320 * 1024 * 10; // 3.2 MB chunks (must be a multiple of 320 KiB)
        const size = file.size;
        let start = 0;

        while (start < size) {
          const end = Math.min(start + maxChunkSize, size);
          const chunk = file.slice(start, end);
          
          const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Range': `bytes ${start}-${end - 1}/${size}`
            },
            body: chunk
          });

          if (!response.ok) {
            throw new Error(`Upload failed at chunk ${start}-${end}`);
          }
          
          start = end;
        }
      }
      
      // Create an organization-wide sharing link so anyone in the company can view it
      let sharedUrl = '';
      try {
        const permission = await client.api(`/me/drive/root:/${folderPath}/${file.name}:/createLink`).post({
          type: 'view',
          scope: 'organization'
        });
        sharedUrl = permission.link.webUrl;
      } catch (linkError) {
        console.error("Error creating sharing link:", linkError);
        // Fallback to default webUrl if sharing link creation fails (e.g., admin disabled it)
        const item = await client.api(`/me/drive/root:/${folderPath}/${file.name}`).get();
        sharedUrl = item.webUrl;
      }

      // Automatically add this file to the project's central "Files" tab
      if (user && sharedUrl) {
        await supabase.from('project_files').insert({
          project_id: projectId,
          name: file.name,
          url: sharedUrl,
          description: 'Uploaded via OneDrive Integration',
          uploaded_by: user.id
        });
      }
      
      toast.success("File uploaded and shared successfully");
      if (onFileUploaded) onFileUploaded(); // Refresh the list
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = ''; // Reset input
      }
    }
  };

  const getFileIcon = (mimeType?: string, name?: string) => {
    if (!name) return <FileIcon className="w-8 h-8 text-slate-400" />;
    if (name.toLowerCase().endsWith('.dwg')) return <FileIcon className="w-8 h-8 text-blue-600" />;
    if (mimeType?.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-emerald-500" />;
    if (mimeType === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />;
    return <FileIcon className="w-8 h-8 text-slate-400" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <FolderOpen className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">OneDrive Integration</h3>
        <p className="text-sm text-slate-500 text-center max-w-md mb-6">
          Sign in with your Microsoft account to access, upload, and manage project drawings and files directly from OneDrive.
        </p>
        <Button onClick={handleLogin} disabled={inProgress !== "none"} className="bg-[#0078D4] hover:bg-[#006CBF] text-white">
          {inProgress !== "none" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "Sign in with Microsoft"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Project Files</h3>
          <p className="text-sm text-slate-500">Manage project drawings and documents</p>
        </div>
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <Button disabled={isUploading} onClick={() => document.getElementById('file-upload')?.click()}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload File
          </Button>
        </div>
      </div>

      {projectFiles.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <FileIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-900">No files uploaded yet</p>
          <p className="text-xs text-slate-500 mt-1">Upload DWG, PDF, or image files to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 rounded-tl-2xl">File Name</th>
                  <th className="p-4">Uploaded By</th>
                  <th className="p-4">Date Uploaded</th>
                  <th className="p-4 text-right rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectFiles.map((file) => {
                  const uploader = allUsers.find(u => u.id === file.uploaded_by);
                  const uploaderName = uploader?.full_name || 'Unknown User';
                  
                  return (
                  <tr key={file.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          {getFileIcon(undefined, file.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 line-clamp-1" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">
                            {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                          {uploaderName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {uploaderName}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs font-bold"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          View
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => {
                            // Try to construct a direct download link if it's a SharePoint/OneDrive URL
                            let downloadUrl = file.url;
                            if (downloadUrl.includes('sharepoint.com') || downloadUrl.includes('onedrive.live.com')) {
                              downloadUrl = downloadUrl + (downloadUrl.includes('?') ? '&' : '?') + 'download=1';
                            }
                            window.open(downloadUrl, '_blank');
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
