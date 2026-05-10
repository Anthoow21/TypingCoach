const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");

const BACKEND_HOST = process.env.BACKEND_HOST || "backend";
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || "8000", 10);

const app = express();
const PORT = 3000;
const IS_DEV = process.env.APP_ENV === "development";
const PUBLIC_DIR = path.join(__dirname, "public");

const DEV_STYLE = `<style>
#dev-env-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9999;
  background: repeating-linear-gradient(
    45deg,
    #f59e0b, #f59e0b 12px,
    #1c1917 12px, #1c1917 24px
  );
  color: #fff;
  text-align: center;
  font-family: monospace;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 3px;
  padding: 6px 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.6);
}
body { padding-top: 32px !important; }
</style>`;

const DEV_BANNER = `<div id="dev-env-banner">⚠ ENVIRONNEMENT DE DÉVELOPPEMENT — branche develop ⚠</div>`;

function serveHtml(filePath, res) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html
    .replace("</head>", DEV_STYLE + "\n</head>")
    .replace(/(<body[^>]*>)/i, `$1\n${DEV_BANNER}`);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "frontend" });
});

app.use("/api", (req, res) => {
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url || "/",
    method: req.method,
    headers: { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error("[proxy] Backend error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ detail: "Backend unavailable" });
    }
  });

  req.pipe(proxyReq, { end: true });
});

// En mode DEV : on intercepte toutes les requêtes HTML avant express.static
if (IS_DEV) {
  app.use((req, res, next) => {
    const ext = path.extname(req.path);
    if (ext && ext !== ".html") return next(); // CSS/JS/images → static

    const name = req.path === "/" ? "index.html"
      : req.path.endsWith(".html") ? req.path.slice(1)
      : req.path.slice(1) + ".html";

    const filePath = path.join(PUBLIC_DIR, name);
    if (fs.existsSync(filePath)) return serveHtml(filePath, res);
    next();
  });
}

app.use(express.static(PUBLIC_DIR));

app.get("*", (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  if (IS_DEV) return serveHtml(indexPath, res);
  res.sendFile(indexPath);
});

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Frontend lancé sur http://0.0.0.0:${PORT} [${IS_DEV ? "DEV" : "PROD"}]`);
  });
}

module.exports = { app, serveHtml, PORT, IS_DEV };