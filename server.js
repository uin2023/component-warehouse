'use strict';
/* ============================================================
 * RCL Studio —— NAS 服务端（零依赖，Node.js 18+ 即可运行）
 * 功能：静态托管 index.html + 数据 REST API + 定期自动备份
 * 数据：全部保存在 DATA_DIR（默认 ./data）：
 *   - db.json            所有元器件（含图片/数据手册）、出入库流水、分类
 *   - backups/           定期自动备份（可配置间隔与保留份数）
 * 环境变量：
 *   PORT                   监听端口（默认 80）
 *   DATA_DIR               数据目录（默认 ./data）
 *   BACKUP_INTERVAL_HOURS  自动备份间隔小时数（默认 24）
 *   BACKUP_KEEP            保留最近几份备份（默认 14）
 * ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '80', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_INTERVAL_H = parseFloat(process.env.BACKUP_INTERVAL_HOURS || '24');
const BACKUP_KEEP = parseInt(process.env.BACKUP_KEEP || '14', 10);
const MAX_BODY = 100 * 1024 * 1024; // 单条数据手册 base64 可达 ~27MB，留足余量

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

/* ---------- 数据加载 ---------- */
let state = { components: [], transactions: [], categories: null };
try {
  if (fs.existsSync(DB_FILE)) {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    state.components = Array.isArray(d.components) ? d.components : [];
    state.transactions = Array.isArray(d.transactions) ? d.transactions : [];
    state.categories = d.categories && typeof d.categories === 'object' && !Array.isArray(d.categories) ? d.categories : null;
    console.log(`已加载数据：${state.components.length} 个元器件，${state.transactions.length} 条流水`);
  }
} catch (e) { console.error('读取数据文件失败，从空库启动：', e.message); }

/* ---------- 原子落盘（防抖 300ms，崩溃/退出时强制写） ---------- */
let saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; persistNow(); }, 300);
}
function persistNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const tmp = DB_FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) { console.error('保存失败：', e.message); }
}

/* ---------- 定期自动备份 ---------- */
function makeBackup() {
  try {
    persistNow();
    if (!fs.existsSync(DB_FILE)) return;
    const t = new Date();
    const p = n => String(n).padStart(2, '0');
    const name = `backup-${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}-${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}.json`;
    fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, name));
    const files = fs.readdirSync(BACKUP_DIR).filter(f => /^backup-.*\.json$/.test(f)).sort();
    while (files.length > BACKUP_KEEP) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    console.log('[backup]', name);
  } catch (e) { console.error('备份失败：', e.message); }
}
setInterval(makeBackup, Math.max(0.05, BACKUP_INTERVAL_H) * 3600 * 1000).unref();
setTimeout(makeBackup, 30 * 1000).unref(); // 启动 30 秒后做一次基线备份

/* ---------- 静态资源 ---------- */
const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'));

/* ---------- 工具 ---------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function sendJson(res, code, obj, downloadName) {
  const buf = Buffer.from(JSON.stringify(obj));
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (downloadName) headers['Content-Disposition'] = `attachment; filename="${downloadName}"`;
  res.writeHead(code, headers);
  res.end(buf);
}
function upsert(arr, item) {
  const i = arr.findIndex(x => x.id === item.id);
  if (i >= 0) arr[i] = item; else arr.push(item);
}

/* ---------- HTTP 服务 ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    // 页面
    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, must-revalidate' });
      res.end(INDEX); return;
    }

    // API
    if (p === '/api/health') { sendJson(res, 200, { ok: true, uptime: process.uptime() }); return; }

    if (p === '/api/state' && req.method === 'GET') { sendJson(res, 200, state); return; }

    if (p === '/api/export' && req.method === 'GET') {
      sendJson(res, 200, { version: 1, exportedAt: Date.now(), categories: state.categories, components: state.components, transactions: state.transactions }, 'rcl-studio-backup.json'); return;
    }

    if (p === '/api/categories' && req.method === 'PUT') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || 'null');
      if (body && typeof body === 'object' && !Array.isArray(body)) { state.categories = body; persist(); }
      sendJson(res, 200, { ok: true }); return;
    }

    if (p === '/api/import' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8'));
      if (!body || !Array.isArray(body.components)) { sendJson(res, 400, { error: 'bad format' }); return; }
      state.components = body.components;
      state.transactions = Array.isArray(body.transactions) ? body.transactions : [];
      if (body.categories && typeof body.categories === 'object' && !Array.isArray(body.categories)) state.categories = body.categories;
      persistNow();
      sendJson(res, 200, { ok: true }); return;
    }

    let m = p.match(/^\/api\/(components|transactions)(?:\/([^/]+))?$/);
    if (m) {
      const store = m[1], id = m[2] ? decodeURIComponent(m[2]) : null;
      const arr = state[store];
      if (req.method === 'PUT' && id) {
        const item = JSON.parse((await readBody(req)).toString('utf8') || 'null');
        if (!item || item.id === undefined) { sendJson(res, 400, { error: 'bad item' }); return; }
        upsert(arr, item); persist(); sendJson(res, 200, { ok: true }); return;
      }
      if (req.method === 'DELETE') {
        if (id) { const i = arr.findIndex(x => String(x.id) === id); if (i >= 0) arr.splice(i, 1); }
        else arr.length = 0;
        persist(); sendJson(res, 200, { ok: true }); return;
      }
    }

    // 备份列表 / 下载 / 立即备份
    if (p === '/api/backups' && req.method === 'GET') {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => /^backup-.*\.json$/.test(f)).sort().reverse();
      sendJson(res, 200, files); return;
    }
    m = p.match(/^\/api\/backups\/(backup-[\w-]+\.json)$/);
    if (m && req.method === 'GET') {
      const f = path.join(BACKUP_DIR, m[1]);
      if (fs.existsSync(f)) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${m[1]}"` });
        fs.createReadStream(f).pipe(res); return;
      }
    }
    if (p === '/api/backup-now' && req.method === 'POST') { makeBackup(); sendJson(res, 200, { ok: true }); return; }

    sendJson(res, 404, { error: 'not found' });
  } catch (e) {
    console.error('请求处理出错：', e.message);
    try { sendJson(res, 500, { error: e.message }); } catch (_) {}
  }
});

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`RCL Studio 已启动：http://${HOST}:${PORT}  数据目录：${DATA_DIR}  备份间隔：${BACKUP_INTERVAL_H}h（保留 ${BACKUP_KEEP} 份）`));
process.on('SIGTERM', () => { try { persistNow(); } catch (e) {} process.exit(0); });
process.on('SIGINT', () => { try { persistNow(); } catch (e) {} process.exit(0); });
