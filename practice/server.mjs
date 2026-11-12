// Practice server for the book's Playwright chapters.
//
//   node practice/server.mjs          (from the js-qa-study-app folder)
//
// Serves the book and the practice pages at http://localhost:3000, plus a small
// in-memory API used in the API-testing chapter. Data resets when it restarts.
// Requires Node.js 22 or later. No dependencies.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;
const TOKEN = "practice-token-123";
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png",
};

let nextId = 3;
let users = [];
function resetUsers() {
  nextId = 3;
  users = [
    { id: 1, name: "Ana Lopez", email: "ana@test.io", role: "admin" },
    { id: 2, name: "Ben Ito", email: "ben@test.io", role: "qa" },
  ];
}
resetUsers();

function send(res, status, body, headers = {}) {
  const isJson = body !== undefined && typeof body !== "string";
  res.writeHead(status, {
    ...(isJson ? { "content-type": "application/json; charset=utf-8" } : {}),
    ...headers,
  });
  res.end(body === undefined ? undefined : isJson ? JSON.stringify(body) : body);
}

async function readJson(req) {
  let text = "";
  for await (const chunk of req) text += chunk;
  if (!text) return {};
  try { return JSON.parse(text); } catch { return null; }
}

const isAuthed = (req) => req.headers.authorization === `Bearer ${TOKEN}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function api(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "users", "1"]
  const method = req.method;

  if (parts[1] === "login" && method === "POST") {
    const body = await readJson(req);
    if (body?.email === "qa@test.io" && body?.password === "correct-password") return send(res, 200, { token: TOKEN });
    return send(res, 401, { error: "Invalid email or password" });
  }

  if (parts[1] === "reset" && method === "POST") { resetUsers(); return send(res, 204); }

  if (parts[1] === "users") {
    const id = parts[2] === undefined ? undefined : Number(parts[2]);
    if (method === "GET" && id === undefined) {
      const role = url.searchParams.get("role");
      return send(res, 200, { total: users.length, users: role ? users.filter((u) => u.role === role) : users });
    }
    if (method === "GET") {
      const user = users.find((u) => u.id === id);
      return user ? send(res, 200, user) : send(res, 404, { error: `User ${parts[2]} not found` });
    }
    // Changing data requires the token from POST /api/login.
    if (!isAuthed(req)) return send(res, 401, { error: "Missing or invalid token" });
    if (method === "POST" && id === undefined) {
      const body = await readJson(req);
      if (body === null) return send(res, 400, { error: "Body must be valid JSON" });
      if (typeof body.name !== "string" || !body.name.trim()) return send(res, 400, { error: "name is required" });
      if (typeof body.email !== "string" || !EMAIL.test(body.email)) return send(res, 400, { error: "email is invalid" });
      if (users.some((u) => u.email === body.email)) return send(res, 409, { error: "email already exists" });
      const user = { id: nextId++, name: body.name.trim(), email: body.email, role: body.role ?? "qa" };
      users.push(user);
      return send(res, 201, user, { location: `/api/users/${user.id}` });
    }
    if (method === "DELETE" && id !== undefined) {
      const before = users.length;
      users = users.filter((u) => u.id !== id);
      return users.length < before ? send(res, 204) : send(res, 404, { error: `User ${parts[2]} not found` });
    }
  }
  return send(res, 404, { error: "Not found" });
}

async function serveFile(res, pathname) {
  let file = normalize(join(ROOT, decodeURIComponent(pathname)));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return send(res, 403, "Forbidden");
  if (pathname.endsWith("/")) file = join(file, "index.html");
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    send(res, 404, "Not found");
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return await serveFile(res, url.pathname);
  } catch (err) {
    console.error(err);
    send(res, 500, { error: "Internal error" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Book and practice site: http://localhost:${PORT}/`);
  console.log(`Practice pages:          http://localhost:${PORT}/practice/login.html`);
});
