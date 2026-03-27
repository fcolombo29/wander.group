import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth/index.js";
import { registerApiRoutes } from "./routes/api";

const app = express();
const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

async function start() {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerApiRoutes(app);

  if (isProd) {
    const distPath = path.resolve(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const port = isProd ? 5000 : 3001;
  const host = isProd ? "0.0.0.0" : "localhost";
  app.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
  });
}

start().catch(console.error);
