import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import sharp from "sharp";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.post("/api/convert-image", express.raw({ type: '*/*', limit: '20mb' }), async (req, res) => {
    try {
      if (!req.body) {
        res.status(400).send("No body");
        return;
      }
      
      const image = sharp(req.body);
      const metadata = await image.metadata();
      const jpegBuffer = await image.jpeg({ quality: 90 }).toBuffer();
      
      res.setHeader('Content-Type', 'image/jpeg');
      if (metadata.width && metadata.height) {
        res.setHeader('X-Image-Width', metadata.width.toString());
        res.setHeader('X-Image-Height', metadata.height.toString());
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'X-Image-Width, X-Image-Height');
      res.send(jpegBuffer);
    } catch (error: any) {
      console.error("Convert image error:", error);
      res.status(500).send(`Server error: ${error.message}`);
    }
  });

  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        res.status(400).send("No URL provided");
        return;
      }
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        res.status(response.status).send(`Error fetching image: ${response.statusText}`);
        return;
      }
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      // allow CORS if accessed directly, though it will be on same origin
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      res.status(500).send(`Server error: ${error.message}`);
    }
  });

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
