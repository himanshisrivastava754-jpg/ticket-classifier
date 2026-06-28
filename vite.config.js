import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const geminiKey = env.VITE_GEMINI_API_KEY;

  console.log("✅ Vite config loaded");

  if (!geminiKey) {
    throw new Error("VITE_GEMINI_API_KEY is missing in .env");
  }

  const geminiProxyPlugin = {
    name: "gemini-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0];

        if (req.method !== "POST" || pathname !== "/api/gemini") {
          return next();
        }

        try {
          let body = "";

          await new Promise((resolve, reject) => {
            req.on("data", (chunk) => (body += chunk));
            req.on("end", resolve);
            req.on("error", reject);
          });

          const payload = body ? JSON.parse(body) : {};

          const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );

          res.statusCode = upstream.status;
          res.setHeader("Content-Type", "application/json");
          const text = await upstream.text();
          res.end(text);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };

  return {
    plugins: [react(), tailwindcss(), geminiProxyPlugin],
  };
});