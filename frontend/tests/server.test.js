const request = require("supertest");

// APP_ENV is not "development" → prod mode (no banner injection, no IS_DEV middleware)
process.env.APP_ENV = "test";
process.env.BACKEND_HOST = "127.0.0.1";
process.env.BACKEND_PORT = "19999"; // nothing listening there → proxy → 502

const { app, serveHtml, IS_DEV } = require("../server");

// ── /health ───────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with status ok and service frontend", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("frontend");
  });
});

// ── IS_DEV flag ───────────────────────────────────────────────────────────────

describe("IS_DEV flag", () => {
  it("is false when APP_ENV is not 'development'", () => {
    expect(IS_DEV).toBe(false);
  });
});

// ── /api proxy error handling ─────────────────────────────────────────────────

describe("GET /api/* proxy", () => {
  it("returns 502 when backend is unreachable", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(502);
  });

  it("502 response contains detail field", async () => {
    const res = await request(app).get("/api/exercises");
    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty("detail");
  });
});

// ── static file serving ───────────────────────────────────────────────────────

describe("Static file serving", () => {
  it("returns 200 for index.html", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("returns 200 for exercises.html", async () => {
    const res = await request(app).get("/exercises.html");
    expect(res.status).toBe(200);
  });

  it("returns 200 for practice.html", async () => {
    const res = await request(app).get("/practice.html");
    expect(res.status).toBe(200);
  });

  it("returns 200 for stats.html", async () => {
    const res = await request(app).get("/stats.html");
    expect(res.status).toBe(200);
  });

  it("returns 200 for history.html", async () => {
    const res = await request(app).get("/history.html");
    expect(res.status).toBe(200);
  });

  it("returns 200 for series.html", async () => {
    const res = await request(app).get("/series.html");
    expect(res.status).toBe(200);
  });

  it("falls back to index.html for unknown routes", async () => {
    const res = await request(app).get("/unknown-page");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});

// ── dev banner injection (serveHtml) ──────────────────────────────────────────

describe("serveHtml dev banner injection", () => {
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  let tmpFile;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `test_${Date.now()}.html`);
    fs.writeFileSync(
      tmpFile,
      "<html><head></head><body>Hello</body></html>"
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it("injects dev style into <head>", () => {
    const captured = [];
    const mockRes = {
      setHeader: () => {},
      send: (html) => captured.push(html),
    };
    serveHtml(tmpFile, mockRes);
    expect(captured[0]).toContain("dev-env-banner");
    expect(captured[0]).toContain("</head>");
  });

  it("injects banner after opening <body> tag", () => {
    const captured = [];
    const mockRes = {
      setHeader: () => {},
      send: (html) => captured.push(html),
    };
    serveHtml(tmpFile, mockRes);
    expect(captured[0]).toContain("id=\"dev-env-banner\"");
    expect(captured[0]).toContain("<body>");
  });

  it("sets content-type to text/html", () => {
    const headers = {};
    const mockRes = {
      setHeader: (k, v) => { headers[k] = v; },
      send: () => {},
    };
    serveHtml(tmpFile, mockRes);
    expect(headers["Content-Type"]).toMatch(/text\/html/);
  });
});
