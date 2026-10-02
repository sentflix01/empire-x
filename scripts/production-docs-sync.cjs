#!/usr/bin/env node
/**
 * production-docs-sync.cjs — Keeps docs/Production/ in lockstep with the codebase.
 *
 * Modes:
 *   node scripts/production-docs-sync.cjs          apply changes
 *   node scripts/production-docs-sync.cjs --check  exit 1 if changes would be made (CI gate)
 *
 * What it does:
 *   1. NEW source files      -> creates a 4-question stub doc (AUTO-STUB marker)
 *   2. Route modules         -> refreshes the generated Endpoints table from
 *                               backend/api-catalog.json (never drifts)
 *   3. Deleted source files  -> stamps the orphaned doc with a historical banner
 *   4. Prints a report; grouped docs (migrations, ui-primitives, app-routes…)
 *      are treated as covering their members.
 */
const fs=require('fs'),path=require('path');
const ROOT=process.cwd();
const CHECK=process.argv.includes('--check');
const PROD='docs/Production';
const GROUPED=new Set([
 'backend/db/migrations.md','backend/test/overview.md',
 'frontend-next/ui-primitives.md','frontend-next/app-routes.md',
 'frontend-next/configs.md','frontend-next/e2e.md','frontend-next/architecture.md',
 'frontend-next/hooks.md','frontend-next/lib.md','frontend-next/api.md',
 'frontend-next/components.md','frontend-next/components/analytics.md',
 'frontend-next/components/profile.md'
]);
function walk(d,out=[],extRe=/\.m?tsx?$/){
  if(!fs.existsSync(d))return out;
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    const p=path.join(d,e.name);
    // Ignore framework/build caches even when tools suffix the directory name
    // (for example `.next-audit` or `.next-ci-check`). These are generated
    // output, not source files that need permanent production documentation.
    if(e.isDirectory()){
      const generated=e.name==='node_modules'||e.name==='dist'||e.name==='build'||
        e.name==='.next'||e.name.startsWith('.next-')||e.name==='coverage'||
        e.name==='playwright-report'||e.name==='test-results';
      if(!generated)walk(p,out,extRe);
    }
    else if(extRe.test(e.name))out.push(p);
  }
  return out;
}
function docFor(srcRel){
  // grouped targets first
  if(/db\/migrate\d*\.js$/.test(srcRel))return 'backend/db/migrations.md';
  if(/^(backend\/test)\//.test(srcRel))return 'backend/test/overview.md';
  if(/^frontend-next\/app\//.test(srcRel))return 'frontend-next/app-routes.md';
  if(/^frontend-next\/e2e\//.test(srcRel))return 'frontend-next/e2e.md';
  const cfg={'frontend-next/next.config.ts':'frontend-next/next-config.md',
    'frontend-next/proxy.ts':'frontend-next/proxy-ts.md',
    'frontend-next/vitest.config.mts':'frontend-next/configs.md',
    'frontend-next/playwright.config.ts':'frontend-next/configs.md',
    'frontend-next/tailwind.config.js':'frontend-next/configs.md'};
  if(cfg[srcRel])return cfg[srcRel];
  return srcRel.replace(/\.(tsx?|js)$/,'')+'.md';
}
function kindOf(rel){
  if(rel.includes('/routes/'))return 'Express API route module';
  if(rel.includes('/middleware/'))return 'HTTP middleware';
  if(rel.includes('/services/'))return 'Backend service';
  if(rel.includes('/utils/'))return 'Shared utility';
  if(rel.includes('/scripts/'))return 'Operational script';
  if(rel.includes('/db/'))return 'Database layer module';
  if(rel.startsWith('backend/test'))return 'Test suite';
  if(rel.includes('/views/'))return 'Screen component (view layer)';
  if(rel.includes('/components/'))return 'React component';
  if(rel.includes('/store/'))return 'State store slice';
  if(rel.includes('/api/'))return 'API client module';
  if(rel.includes('/hooks/'))return 'React hook';
  if(rel.includes('/lib/'))return rel.startsWith('backend')?'Shared backend library':'Shared frontend library';
  return 'Source module';
}
function facts(abs,rel){
  const src=fs.readFileSync(path.join(ROOT,abs),'utf8');
  const loc=src.split('\n').length;
  const apis=[...new Set(src.match(/\/api\/[a-z0-9\-\/${}:._a-zA-Z]*/g)||[])].slice(0,8);
  const uses=[];
  if(/useAuth/.test(src))uses.push('AuthContext');
  if(/getSocket|socket\.io/.test(src))uses.push('Socket.IO');
  if(/zustand/.test(src))uses.push('zustand');
  if(/useQuery|useMutation/.test(src))uses.push('TanStack Query');
  return {loc,apis,uses};
}
function stub(abs,docRel){
  const rel=abs.replace(/\\/g,'/');
  const {loc,apis,uses}=facts(abs,rel);
  let s='# '+rel.replace(/\.(tsx?|js)$/,'')+'\n\n<!-- AUTO-STUB '+(CHECK?'(check mode)':'')+' '+new Date().toISOString().slice(0,10)+' — curate narrative below -->\n\n';
  s+='## 1. What is this?\n\n**'+kindOf(rel)+'.** Newly added module — narrative pending curation.\n\nSize: roughly '+loc+' lines of source.\n';
  s+='\n## 2. Why does it exist?\n\nNewly introduced as part of recent development; see source and git history for the introducing commit.\n';
  s+='\n## 3. What does it do?\n\nExtracted facts (auto):\n- Lines: ~'+loc+'\n';
  if(apis.length)s+='- API references:\n'+apis.map(a=>'  - `'+a+'`').join('\n')+'\n';
  s+='\n## 4. What does it touch?\n\n';
  if(uses.length)s+='**Integrations:** '+uses.join(', ')+'\n\n';
  s+='**Source:** `'+rel+'`\n';
  return s;
}
// ── collect current source universe ──────────────────────────────────────────
const sources=[
 ...walk('backend').map(p=>p.replace(/\\/g,'/')),
 ...walk('backend',[],/\.m?js$/).map(p=>p.replace(/\\/g,'/')),
 ...walk('frontend-next').map(p=>p.replace(/\\/g,'/')),
].filter(p=>!/^backend\/dist\//.test(p)&&!p.endsWith('.d.ts')&&!/^frontend-next\/public\//.test(p));
const changes=[];
let wouldChange=false;
function apply(relDoc,content){
  const abs=path.join(ROOT,PROD,relDoc);
  const old=fs.existsSync(abs)?fs.readFileSync(abs,'utf8'):null;
  if(old===content)return;
  wouldChange=true;
  changes.push((old?'update':'create')+' '+PROD+'/'+relDoc);
  if(!CHECK){fs.mkdirSync(path.dirname(abs),{recursive:true});fs.writeFileSync(abs,content);}
}
// ── 1+2. ensure/refresh per-source docs ──────────────────────────────────────
let catalog=null;
try{catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'backend/api-catalog.json'),'utf8'));}catch{}
for(const abs of sources){
  const rel=abs.replace(/\\/g,'/');
  const docRel=docFor(rel);
  const docAbs=path.join(ROOT,PROD,docRel);
  const grouped=GROUPED.has(docRel);
  const exists=fs.existsSync(docAbs);
  if(!exists){
    // grouped coverage? any GROUPED doc referencing this path (without ext)
    const stemNoExt='`'+rel.replace(/\.(tsx?|js)$/,'')+'`';
    let coveredByGrouped=false;
    for(const g of GROUPED){
      const gp=path.join(ROOT,PROD,g);
      if(fs.existsSync(gp)&&fs.readFileSync(gp,'utf8').includes(stemNoExt)){coveredByGrouped=true;break;}
    }
    if(coveredByGrouped)continue;
    if(!grouped){apply(docRel,stub(abs,docRel));continue;}
    apply(docRel,'<!-- GROUPED-STUB: add row for `'+rel+'` -->');
    continue;
  }
  // refresh endpoint tables inside route docs
  if(rel.startsWith('backend/routes/')&&catalog&&exists){
    const mod=path.basename(rel).replace(/\.ts$/,'');
    const eps=catalog.endpoints.filter(e=>e.module===mod);
    if(eps.length){
      let tbl='\n### Endpoints ('+eps.length+')\n\n| Method | Path | Auth | Line |\n|---|---|---|---|\n';
      for(const e of eps)tbl+='| `'+e.method+'` | `'+e.full_path+'` | '+e.auth+' | '+e.line+' |\n';
      let cur=fs.readFileSync(docAbs,'utf8');
      const s3=cur.indexOf('## 3. What does it do?');
      const s4=cur.indexOf('## 4. What does it touch?');
      if(s3>-1&&s4>s3){
        const rebuilt=cur.slice(0,s3)+'## 3. What does it do?\n\n'+tbl.trimEnd()+'\n\n'+cur.slice(s4);
        if(rebuilt!==cur)apply(docRel,rebuilt);
      }else{
        const anchor='## 3. What does it do?';
        if(cur.includes(anchor))apply(docRel,cur.replace(anchor,anchor+'\n'+tbl.trimEnd()));
      }
    }
  }
}
// ── 3. stale (deleted source) banners ────────────────────────────────────────
const srcSet=new Set(sources.map(s=>s.replace(/\.(tsx?|js)$/,'')));
function walkProd(d,out=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walkProd(p,out);else if(e.name.endsWith('.md'))out.push(p);}return out;}
for(const abs of walkProd(path.join(ROOT,PROD))){
  const rel=path.relative(ROOT,abs).replace(/\\/g,'/').slice(PROD.length+1);
  if(GROUPED.has(rel)||['README.md','INDEX.md'].includes(path.basename(rel)))continue;
  const base=rel.replace(/\.md$/,'');
  const covered=sources.some(s=>{
    const cand=s.replace(/\.(tsx?|js)$/,'');
    if(cand===base)return true;
    // grouped coverage
    const g=docFor(s);
    return g===rel;
  });
  const cur=fs.readFileSync(abs,'utf8');
  if(!covered&&!cur.includes('> ⚠️ **HISTORICAL')){
    wouldChange=true;
    changes.push('mark-historical '+rel);
    if(!CHECK){
      const banner='> ⚠️ **HISTORICAL** — corresponding source file was removed from the codebase on '+new Date().toISOString().slice(0,10)+'. Kept for reference.\n\n';
      fs.writeFileSync(abs,banner+cur);
    }
  }
}
// ── report ───────────────────────────────────────────────────────────────────
if(changes.length){
  console.log((CHECK?'WOULD ':'')+ 'Production sync changes ('+changes.length+'):');
  for(const c of changes.slice(0,50))console.log('  -',c);
  if(changes.length>50)console.log('  … +'+(changes.length-50)+' more');
}else console.log('Production docs already in sync ✓');
if(CHECK&&wouldChange){console.error('\nRun `npm run production:sync` and commit the result.');process.exit(1);}
