import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const sample=JSON.parse(await readFile(resolve(root,'programacao.json'),'utf8'));
test('Daily schedule preserved',()=>{
 assert.equal(sample.rows.length,186);
 assert.ok(sample.rows.some(x=>x.ship==='GRANDE DAKAR'&&x.terminal==='ECOPORTO'));
 assert.ok(sample.rows.some(x=>x.ship==='MSC ALBANY'&&x.terminal==='BTP'));
});
test('Cloudflare Worker routes with real daily schedule, without live outbound network', async()=>{
 let raw=await readFile(resolve(root,'worker.js'),'utf8');
 const html=await readFile(resolve(root,'index.html'),'utf8');
 raw=raw.replace("import PROGRAMACAO from './programacao.json' with {type:'json'};",'const PROGRAMACAO = '+JSON.stringify(sample)+';')
 .replace("import HTML from './index.html';",'const HTML = '+JSON.stringify(html)+';');
 const path=resolve(root,'worker.test.generated.mjs');await writeFile(path,raw);
 try{
 const worker=(await import('../worker.test.generated.mjs?'+Date.now())).default;
 const env={ACCESS_PASSWORD:'very-long-password-for-local-tests'};
 let r=await worker.fetch(new Request('https://example.com/health'),env);assert.equal(r.status,200);assert.equal((await r.json()).platform,'cloudflare-worker');
 r=await worker.fetch(new Request('https://example.com/'),env);assert.equal(r.status,401);
 const authorized=(path)=>new Request('https://example.com'+path,{headers:{authorization:'Basic '+btoa('monitor:'+env.ACCESS_PASSWORD)}});
 r=await worker.fetch(authorized('/'),env);assert.equal(r.status,200);assert.match(await r.text(),/Programação diária/);
 r=await worker.fetch(authorized('/api/navios?q=GRANDE%20DAKAR'),env);let data=await r.json();assert.equal(data.items.length,1);assert.equal(data.items[0].terminal,'ECOPORTO');
 r=await worker.fetch(authorized('/api/navio?ship=GRANDE%20DAKAR&terminal=ECOPORTO'),env);data=await r.json();assert.ok(data.booking_rows.some(x=>x.booking==='S3-30367963'));
 r=await worker.fetch(authorized('/api/navio?ship=MSC%20ALBANY&terminal=BTP'),env);data=await r.json();assert.equal(data.external.kind,'nao_integrado');
 r=await worker.fetch(authorized('/api/navio?ship=UNKNOWN&terminal=BTP'),env);assert.equal(r.status,404);
 }finally{await unlink(path).catch(()=>{});}
});