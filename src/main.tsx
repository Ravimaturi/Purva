import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './lib/msalConfig';
import App from './App.tsx';
import './index.css';

// Initialize the MSAL instance before rendering
msalInstance.initialize().then(() => {
  // Handle the redirect flow response
  msalInstance.handleRedirectPromise().catch(err => {
    console.error("MSAL redirect error:", err);
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  );
});
