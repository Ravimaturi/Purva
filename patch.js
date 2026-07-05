const fs = require('fs');
const content = fs.readFileSync('src/components/PettyCash.tsx', 'utf-8');
let newContent = content.replace(
  "import { supabase } from '../lib/supabase';",
  "import { useMsal } from '@azure/msal-react';\nimport { loginRequest } from '../lib/msalConfig';\nimport { Client, ResponseType } from '@microsoft/microsoft-graph-client';\nimport { supabase } from '../lib/supabase';"
);

newContent = newContent.replace(
  "const canCreate = canManagePettyCash(user?.role, 'create');\n  \n  const [entries, setEntries] = useState<PettyCashEntry[]>([]);",
  `const canCreate = canManagePettyCash(user?.role, 'create');

  const { instance, accounts, inProgress } = useMsal();
  const [msalReady, setMsalReady] = useState(() => instance.getAllAccounts().length > 0);
  
  const getGraphToken = useCallback(async (interactive = false) => {
    let activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
    if (!activeAccount && interactive) {
      await instance.loginPopup(loginRequest);
      activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
    }
    if (!activeAccount) {
      throw new Error("Not logged into Microsoft. Please authenticate.");
    }
    
    let token = "";
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: activeAccount
      });
      token = response.accessToken;
    } catch (e: any) {
      if (interactive && (e.name === "InteractionRequiredAuthError" || e.errorCode === "interaction_required")) {
         const response = await instance.acquireTokenPopup(loginRequest);
         token = response.accessToken;
      } else {
         throw e;
      }
    }
    return token;
  }, [instance]);

  const getGraphClient = useCallback(async (interactive = false) => {
    const token = await getGraphToken(interactive);
    return Client.init({
      authProvider: (done) => {
        done(null, token);
      }
    });
  }, [getGraphToken]);

  const [entries, setEntries] = useState<PettyCashEntry[]>([]);`
);

fs.writeFileSync('src/components/PettyCash.tsx', newContent);
