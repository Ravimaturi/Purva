import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './lib/msalConfig';
import App from './App.tsx';
import './index.css';

const isPopup = (window.opener && window.opener !== window) || window.location.hash.includes('code=') || window.location.hash.includes('state=');
if (isPopup) {
  sessionStorage.setItem('msal_popup', 'true');
}

// Initialize the MSAL instance before rendering
msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().then(() => {
    // If MSAL didn't automatically close the popup (e.g. window.opener is null due to COOP)
    // we can close it manually here. The token is already in localStorage.
    if (sessionStorage.getItem('msal_popup') === 'true') {
      setTimeout(() => window.close(), 500);
    }
  }).catch(err => {
    console.error("MSAL handleRedirectPromise error:", err);
  });
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  );
});
