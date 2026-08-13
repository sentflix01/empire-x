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

module.exports = router;
