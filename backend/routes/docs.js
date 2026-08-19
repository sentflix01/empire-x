/**
 * routes/docs.js — Project Knowledge Base API
 *
 * Reads the project's docs, strategy, implementation plan, and notes
 * folders and exposes them as structured JSON so the DevOps page can
 * display the full project intelligence in one place.
 *
 * All routes require authentication (read-only).
 * Write/update routes require admin.
 *
 * Endpoints:
 *   GET /api/docs/strategy/versions      — all strategy versions + status
 *   GET /api/docs/strategy/:version      — single version README + sections
 *   GET /api/docs/implementation         — all implementation plan specs
 *   GET /api/docs/implementation/:spec   — single spec with requirements/design/tasks
 *   GET /api/docs/notes                  — notes/roadmap/future features
 *   GET /api/docs/tree                   — full folder tree for the knowledge base
 *   GET /api/docs/file                   — read any doc file (safe path only)
 *   GET /api/docs/progress               — computed progress metrics from tasks.md files
 */
const router  = require('express').Router();
const fs      = require('fs');
const path    = require('path');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const ROOT = path.resolve(__dirname, '../../');

// ── Safe path resolver (prevent directory traversal) ────────────────────────
function safePath(relative) {
  const resolved = path.resolve(ROOT, relative);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

// ── Read a markdown file safely ───────────────────────────────────────────────
function readMd(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch { return null; }
}

// ── Parse task completion from a tasks.md file ────────────────────────────────
function parseTaskProgress(content) {
  if (!content) return { total: 0, done: 0, pct: 0 };
  const lines  = content.split('\n');
  const todos  = lines.filter(l => /^\s*- \[ \]/.test(l)).length;
  const dones  = lines.filter(l => /^\s*- \[x\]/i.test(l)).length;
  const total  = todos + dones;
  return { total, done: dones, pct: total > 0 ? Math.round((dones / total) * 100) : 0 };
}

// ── Parse section list from a README.md ──────────────────────────────────────
function parseSections(content) {
  if (!content) return [];
  return content
    .split('\n')
    .filter(l => l.startsWith('## ') || l.startsWith('### '))
    .map(l => l.replace(/^#+\s*/, '').trim())
    .filter(Boolean);
}

// ── GET /api/docs/strategy/versions ─────────────────────────────────────────
router.get('/strategy/versions', requireAuth, (_req, res) => {
  try {
    const stratDir = safePath('docs/strategy');
    if (!stratDir || !fs.existsSync(stratDir)) return res.json([]);

    const versions = fs.readdirSync(stratDir)
      .filter(d => /^v\d/.test(d))
      .sort()
      .map(dir => {
        const vDir    = path.join(stratDir, dir);
        const readme  = readMd(path.join(vDir, 'README.md'));
        const sections = [];

        // Find all sub-sections (sub-folders with audit.md / tasks.md)
        if (fs.existsSync(vDir)) {
          fs.readdirSync(vDir)
            .filter(f => fs.statSync(path.join(vDir, f)).isDirectory())
            .forEach(sub => {
              const subDir   = path.join(vDir, sub);
              const tasks    = readMd(path.join(subDir, 'tasks.md'));
              const audit    = readMd(path.join(subDir, 'audit.md'));
              const progress = parseTaskProgress(tasks);
              sections.push({
                key:      sub,
                label:    sub.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                progress,
                hasTasks: !!tasks,
                hasAudit: !!audit,
              });
            });
        }

        // Extract title and description from README
        const titleMatch = readme?.match(/^#\s+(.+)$/m);
        const themeMatch = readme?.match(/\*\*Theme:\*\*\s*(.+)/);
        const goalMatch  = readme?.match(/\*\*Goal:\*\*\s*(.+)/);

        const allTasks = sections.reduce((s, sec) => {
          const t = readMd(path.join(vDir, sec.key, 'tasks.md'));
          const p = parseTaskProgress(t);
          return { total: s.total + p.total, done: s.done + p.done };
        }, { total: 0, done: 0 });

        return {
          version:     dir,
          label:       titleMatch ? titleMatch[1].replace(/^v[\d.]+ — /, '') : dir,
          theme:       themeMatch ? themeMatch[1].trim() : '',
          goal:        goalMatch  ? goalMatch[1].trim()  : '',
          sections,
          progress: {
            total: allTasks.total,
            done:  allTasks.done,
            pct:   allTasks.total > 0 ? Math.round((allTasks.done / allTasks.total) * 100) : 0,
          },
          readmePath: `docs/strategy/${dir}/README.md`,
        };
      });

    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load strategy versions' });
  }
});

// ── GET /api/docs/strategy/:version ─────────────────────────────────────────
router.get('/strategy/:version', requireAuth, (req, res) => {
  try {
    const vDir  = safePath(`docs/strategy/${req.params.version}`);
    if (!vDir || !fs.existsSync(vDir)) return res.status(404).json({ error: 'Version not found' });

    const readme  = readMd(path.join(vDir, 'README.md'));
    const sections = [];

    fs.readdirSync(vDir)
      .filter(f => fs.statSync(path.join(vDir, f)).isDirectory())
      .forEach(sub => {
        const subDir = path.join(vDir, sub);
        const tasks  = readMd(path.join(subDir, 'tasks.md'));
        const audit  = readMd(path.join(subDir, 'audit.md'));
        sections.push({
          key:      sub,
          label:    sub.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          tasks,
          audit,
          progress: parseTaskProgress(tasks),
        });
      });

    res.json({ version: req.params.version, readme, sections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load version' });
  }
});

// ── GET /api/docs/implementation ─────────────────────────────────────────────
router.get('/implementation', requireAuth, (_req, res) => {
  try {
    const implDir = safePath('implementation plan');
    if (!implDir || !fs.existsSync(implDir)) return res.json([]);

    const specs = fs.readdirSync(implDir)
      .filter(d => fs.statSync(path.join(implDir, d)).isDirectory())
      .map(spec => {
        const sDir    = path.join(implDir, spec);
        const files   = fs.existsSync(sDir) ? fs.readdirSync(sDir) : [];
        const tasks   = readMd(path.join(sDir, 'tasks.md'));
        const design  = readMd(path.join(sDir, 'design.md'));
        const req     = readMd(path.join(sDir, 'requirements.md'));
        const bugfix  = readMd(path.join(sDir, 'bugfix.md'));
        const progress = parseTaskProgress(tasks || bugfix);
        return {
          key:      spec,
          label:    spec.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          files:    files.filter(f => f.endsWith('.md')),
          progress,
          hasRequirements: !!req,
          hasDesign:       !!design,
          hasTasks:        !!tasks,
          hasBugfix:       !!bugfix,
          path:            `implementation plan/${spec}`,
        };
      });

    res.json(specs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load implementation plans' });
  }
});

// ── GET /api/docs/implementation/:spec ───────────────────────────────────────
router.get('/implementation/:spec', requireAuth, (req, res) => {
  try {
    const sDir = safePath(`implementation plan/${req.params.spec}`);
    if (!sDir || !fs.existsSync(sDir)) return res.status(404).json({ error: 'Spec not found' });

    const tasks        = readMd(path.join(sDir, 'tasks.md'));
    const design       = readMd(path.join(sDir, 'design.md'));
    const requirements = readMd(path.join(sDir, 'requirements.md'));
    const bugfix       = readMd(path.join(sDir, 'bugfix.md'));

    res.json({
      key:          req.params.spec,
      tasks,
      design,
      requirements,
      bugfix,
      progress: parseTaskProgress(tasks || bugfix),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load spec' });
  }
});

// ── GET /api/docs/notes ───────────────────────────────────────────────────────
router.get('/notes', requireAuth, (_req, res) => {
  try {
    const noteDir = safePath('note');
    if (!noteDir || !fs.existsSync(noteDir)) return res.json([]);

    const notes = fs.readdirSync(noteDir)
      .filter(f => f.endsWith('.md'))
      .map(file => {
        const content = readMd(path.join(noteDir, file));
        const titleMatch = content?.match(/^#\s+(.+)$/m);
        return {
          file,
          title:   titleMatch ? titleMatch[1] : file.replace('.md', ''),
          content,
          path:    `note/${file}`,
          sections: parseSections(content || ''),
        };
      });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

// ── GET /api/docs/progress ────────────────────────────────────────────────────
// Aggregate completion across ALL tasks.md files in strategy + implementation
router.get('/progress', requireAuth, (_req, res) => {
  try {
    let totalTasks = 0, doneTasks = 0;
    const byVersion = {};

    // Strategy versions
    const stratDir = safePath('docs/strategy');
    if (stratDir && fs.existsSync(stratDir)) {
      fs.readdirSync(stratDir)
        .filter(d => /^v\d/.test(d))
        .forEach(dir => {
          const vDir = path.join(stratDir, dir);
          let vTotal = 0, vDone = 0;
          if (fs.existsSync(vDir)) {
            fs.readdirSync(vDir)
              .filter(f => fs.statSync(path.join(vDir, f)).isDirectory())
              .forEach(sub => {
                const t = readMd(path.join(vDir, sub, 'tasks.md'));
                const p = parseTaskProgress(t);
                vTotal += p.total; vDone += p.done;
              });
          }
          totalTasks += vTotal; doneTasks += vDone;
          byVersion[dir] = { total: vTotal, done: vDone, pct: vTotal > 0 ? Math.round((vDone/vTotal)*100) : 0 };
        });
    }

    // Implementation plans
    const implDir = safePath('implementation plan');
    if (implDir && fs.existsSync(implDir)) {
      fs.readdirSync(implDir)
        .filter(d => fs.statSync(path.join(implDir, d)).isDirectory())
        .forEach(spec => {
          const t = readMd(path.join(implDir, spec, 'tasks.md'))
                 || readMd(path.join(implDir, spec, 'bugfix.md'));
          const p = parseTaskProgress(t);
          totalTasks += p.total; doneTasks += p.done;
        });
    }

    res.json({
      total:     totalTasks,
      done:      doneTasks,
      remaining: totalTasks - doneTasks,
      pct:       totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      byVersion,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute progress' });
  }
});

// ── GET /api/docs/file?path=docs/strategy/v1.0.../README.md ─────────────────
router.get('/file', requireAuth, (req, res) => {
  try {
    const reqPath = String(req.query.path || '');
    if (!reqPath) return res.status(400).json({ error: 'path is required' });

    // Only allow reading from safe directories
    const allowed = ['docs/', 'implementation plan/', 'note/', 'README.md'];
    if (!allowed.some(p => reqPath.startsWith(p) || reqPath === p)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = safePath(reqPath);
    if (!filePath) return res.status(403).json({ error: 'Invalid path' });

    const content = readMd(filePath);
    if (!content) return res.status(404).json({ error: 'File not found' });

    res.json({ path: reqPath, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// ── GET /api/docs/library ─────────────────────────────────────────────────────
// Returns the full structured docs library — every folder and file under docs/
// Used by the DevOps Knowledge Base "Docs Library" tab so engineers can browse
// ALL documentation (finance, compliance, trust-safety, support, people, brand,
// legal, architecture, backend, etc.) without leaving the DevOps panel.
router.get('/library', requireAuth, (_req, res) => {
  try {
    const docsRoot = safePath('docs');
    if (!docsRoot || !fs.existsSync(docsRoot)) return res.json([]);

    // Map of folder → icon + description shown in UI
    const FOLDER_META = {
      'strategy':       { icon: '📋', label: 'Strategy & Roadmap',          color: 'blue' },
      'architecture':   { icon: '🏗️',  label: 'Architecture & Engineering',  color: 'violet' },
      'backend':        { icon: '⚙️',  label: 'Backend & API',               color: 'violet' },
      'frontend':       { icon: '🖥️',  label: 'Frontend & UI',               color: 'violet' },
      'infrastructure': { icon: '☁️',  label: 'Infrastructure & DevOps',     color: 'sky' },
      'operations':     { icon: '🔧',  label: 'Operations & Runbooks',       color: 'sky' },
      'product':        { icon: '🎯',  label: 'Product & PRD',               color: 'emerald' },
      'growth':         { icon: '📈',  label: 'Growth & Partnerships',       color: 'emerald' },
      'brand':          { icon: '🎨',  label: 'Brand & Communications',      color: 'pink' },
      'people':         { icon: '👥',  label: 'People & Organization',       color: 'amber' },
      'finance':        { icon: '💼',  label: 'Finance & Financial Controls', color: 'green' },
      'compliance':     { icon: '🛡️',  label: 'Compliance & Regulatory',     color: 'red' },
      'trust-safety':   { icon: '🔒',  label: 'Trust, Safety & Fraud',       color: 'red' },
      'support':        { icon: '💬',  label: 'Customer Support',            color: 'cyan' },
      'legal':          { icon: '⚖️',  label: 'Legal & Privacy',             color: 'slate' },
      'investor':       { icon: '💰',  label: 'Investor & Fundraising',      color: 'yellow' },
      'patent':         { icon: '📜',  label: 'Patents & IP',                color: 'orange' },
      'best-practice':  { icon: '✅',  label: 'Best Practices',              color: 'teal' },
    };

    // Walk one level: docs/<folder>/<files>
    const entries = fs.readdirSync(docsRoot, { withFileTypes: true });

    const folders = entries
      .filter(e => e.isDirectory())
      .map(e => {
        const folderPath = path.join(docsRoot, e.name);
        const meta = FOLDER_META[e.name] || { icon: '📁', label: e.name, color: 'slate' };

        // Walk sub-folders (one more level deep, e.g. strategy/v1.0/)
        let files = [];
        try {
          const folderEntries = fs.readdirSync(folderPath, { withFileTypes: true });
          folderEntries.forEach(fe => {
            if (fe.isFile() && fe.name.endsWith('.md')) {
              const fPath = `docs/${e.name}/${fe.name}`;
              const content = readMd(path.join(folderPath, fe.name));
              const titleMatch = content?.match(/^#\s+(.+)$/m);
              const descMatch  = content?.match(/^>\s+\*\*(.+?)\*\*/m) || content?.match(/^>\s+(.+)$/m);
              files.push({
                name:    fe.name,
                path:    fPath,
                title:   titleMatch ? titleMatch[1].replace(/^Nodbusiness\s*[—-]\s*/i, '') : fe.name.replace('.md', ''),
                summary: descMatch  ? descMatch[1].trim().slice(0, 120) : '',
              });
            } else if (fe.isDirectory()) {
              // One more level (e.g. strategy/v1.0/README.md)
              const subPath = path.join(folderPath, fe.name);
              try {
                fs.readdirSync(subPath, { withFileTypes: true })
                  .filter(sf => sf.isFile() && sf.name.endsWith('.md'))
                  .forEach(sf => {
                    files.push({
                      name:    sf.name,
                      path:    `docs/${e.name}/${fe.name}/${sf.name}`,
                      title:   `${fe.name}/${sf.name.replace('.md', '')}`,
                      summary: '',
                    });
                  });
              } catch { /* skip unreadable */ }
            }
          });
        } catch { /* skip unreadable */ }

        return {
          folder:    e.name,
          label:     meta.label,
          icon:      meta.icon,
          color:     meta.color,
          fileCount: files.length,
          files,
        };
      })
      .filter(f => f.fileCount > 0);

    // Also include root-level .md files (SOP.md, ONBOARDING.md, etc.)
    const rootFiles = entries
      .filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => {
        const fPath   = `docs/${e.name}`;
        const content = readMd(path.join(docsRoot, e.name));
        const titleMatch = content?.match(/^#\s+(.+)$/m);
        const descMatch  = content?.match(/^>\s+\*\*(.+?)\*\*/m) || content?.match(/^>\s+(.+)$/m);
        return {
          name:    e.name,
          path:    fPath,
          title:   titleMatch ? titleMatch[1].replace(/^Nodbusiness\s*[—-]\s*/i, '') : e.name.replace('.md', ''),
          summary: descMatch  ? descMatch[1].trim().slice(0, 120) : '',
        };
      });

    if (rootFiles.length > 0) {
      folders.unshift({
        folder:    '_root',
        label:     'Core Documents',
        icon:      '📌',
        color:     'slate',
        fileCount: rootFiles.length,
        files:     rootFiles,
      });
    }

    res.json(folders);
  } catch (err) {
    console.error('[docs/library]', err);
    res.status(500).json({ error: 'Failed to load docs library' });
  }
});

// ── GET /api/docs/search?q=aml ────────────────────────────────────────────────
// Full-text search across all docs files — returns matching files with excerpt
router.get('/search', requireAuth, (req, res) => {
  try {
    const query = String(req.query.q || '').toLowerCase().trim();
    if (!query || query.length < 2) return res.json([]);

    const docsRoot = safePath('docs');
    if (!docsRoot || !fs.existsSync(docsRoot)) return res.json([]);

    const results = [];

    function walkDir(dir, relBase) {
      try {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
          const fullPath = path.join(dir, e.name);
          const relPath  = `${relBase}/${e.name}`;
          if (e.isDirectory()) {
            walkDir(fullPath, relPath);
          } else if (e.isFile() && e.name.endsWith('.md')) {
            const content = readMd(fullPath);
            if (!content) return;
            const lower   = content.toLowerCase();
            const idx     = lower.indexOf(query);
            if (idx === -1) return;

            // Extract a small excerpt around the match
            const start   = Math.max(0, idx - 80);
            const end     = Math.min(content.length, idx + 120);
            const excerpt = (start > 0 ? '…' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '…' : '');

            const titleMatch = content.match(/^#\s+(.+)$/m);
            results.push({
              path:    relPath.replace(/^\//, ''),
              title:   titleMatch ? titleMatch[1].replace(/^Nodbusiness\s*[—-]\s*/i, '') : e.name.replace('.md', ''),
              excerpt,
              folder:  relBase.replace(/^\/docs\//, '').replace(/^docs\//, ''),
            });
          }
        });
      } catch { /* skip unreadable dirs */ }
    }

    walkDir(docsRoot, 'docs');

    res.json(results.slice(0, 30)); // cap at 30 results
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
