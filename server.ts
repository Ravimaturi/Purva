import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy for Supabase API to avoid mixed content and CORS issues
  app.use('/supabase-api', createProxyMiddleware({
    target: 'http://supabasekong-ffyoj28pwvhn7z3s2qjw010j.89.116.122.17.sslip.io',
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      '^/supabase-api': '', // remove base path
    },
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
