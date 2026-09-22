import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import crypto from 'node:crypto';
const root='/var/home/jedwards/kiedas-orbiter',app=root+'/.preview-work/stage2',work=root+'/.preview-work/stage3-work';
const require=createRequire(app+'/package.json');const pkg=fs.readdirSync(app+'/node_modules/.pnpm').find(n=>n.startsWith('@babel+parser@'));const {parse}=require(app+'/node_modules/.pnpm/'+pkg+'/node_modules/@babel/parser');
const filename=app+'/src/screens/Dashboard.jsx',source=fs.readFileSync(filename,'utf8');
if(fs.existsSync(work+'/Dashboard.before.jsx'))throw Error('Before source already exists; refusing overwrite');
fs.copyFileSync(filename,work+'/Dashboard.before.jsx');
for(const n of ['implementation.patch','implementation.json'])fs.copyFileSync(root+'/docs/revamp/stage-2/'+n,work+'/stage2-'+n);
const ast=parse(source,{sourceType:'module',plugins:['jsx']});const ranges=[];
function walk(node){if(!node||typeof node!=='object')return;if(node.type==='JSXExpressionContainer'&&node.start>source.lastIndexOf('  return (\n    <PageLayout')){const text=source.slice(node.expression.start,node.expression.end),match=text.match(/^isVisible\('([^']+)'\)/);if(match){ranges.push({id:match[1],start:node.start,end:node.end,expression:text});return;}}for(const [k,v]of Object.entries(node)){if(['loc','start','end'].includes(k))continue;if(Array.isArray(v))v.forEach(walk);else walk(v);}}
walk(ast);if(ranges.length!==19||new Set(ranges.map(x=>x.id)).size!==19)throw Error('Expected exactly 19 distinct card expressions');
let modified=source;for(const x of [...ranges].reverse())modified=modified.slice(0,x.start)+'{cards['+JSON.stringify(x.id)+']}'+modified.slice(x.end);
const gridStart=modified.indexOf('      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">');const gridEnd=modified.indexOf('      <DescendiaModal />',gridStart);
const grid=modified.slice(gridStart,gridEnd);modified=modified.slice(0,gridStart)+'      {IS_PREVIEW ? <PreviewDashboardLayout cards={cards} onCustomize={() => setShowSettings(true)} /> : (\n'+grid+'      )}\n'+modified.slice(gridEnd);
const insert=modified.lastIndexOf('  return (\n    <PageLayout');modified=modified.slice(0,insert)+'  const cards = {\n'+ranges.map(x=>'    '+JSON.stringify(x.id)+': ('+x.expression+'),').join('\n')+'\n  };\n\n'+modified.slice(insert);
modified="import { IS_PREVIEW } from '../lib/buildProfile';\nimport PreviewDashboardLayout from '../components/PreviewDashboardLayout';\n"+modified;
parse(modified,{sourceType:'module',plugins:['jsx']});fs.writeFileSync(filename,modified);
fs.writeFileSync(root+'/docs/revamp/stage-3/evidence/card-extraction.json',JSON.stringify({before_sha256:crypto.createHash('sha256').update(source).digest('hex'),cards:ranges.map(({id,start,end,expression})=>({id,start,end,expression_sha256:crypto.createHash('sha256').update(expression).digest('hex')})),method:'Babel AST ranges; original expressions copied verbatim; stable grid expressions replaced with slots'},null,2)+'\n');
