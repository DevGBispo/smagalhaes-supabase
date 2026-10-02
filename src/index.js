import { canonicalTerminal,normalizeRow,changesBetween,FIELDS } from './core.js';
import { PORTALS,probePortal,inspectVessel } from './adapters.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const err=(error,status=400)=>json({error:String(error)},status);
function secure(request,env) {
 const expected=env.ADMIN_TOKEN;
 if(typeof expected!=='string'||expected.length<24)return false;
 const input=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(input.length!==expected.length)return false;
 let diff=0;for(let i=0;i<input.length;i++)diff|=input.charCodeAt(i)^expected.charCodeAt(i);
 return diff===0;
}
async function importProgramming(request,env) {
 const length=Number(request.headers.get('content-length')||0);
 if(length>200000) return err('Payload too large',413);
 let payload;
 try {payload=await request.json();}catch{return err('Expected JSON body');}
 if(!payload||!Array.isArray(payload.rows)||payload.rows.length<1||payload.rows.length>250)return err('rows must have 1 to 250 records');
 if(typeof payload.source!=='string'||!payload.source.trim()||payload.source.length>120)return err('source is required');
 let rows;try{rows=payload.rows.map(normalizeRow);}catch(e){return err(e.message);}
 const id=crypto.randomUUID(),at=new Date().toISOString();
 const statements=[
   env.DB.prepare('INSERT INTO imports (id,created_at,source_name,reservation_count) VALUES(?,?,?,?)').bind(id,at,payload.source,rows.length),
   env.DB.prepare('UPDATE vessels SET active=0'),
 ];
 const seen=new Set();
 for(let i=0;i<rows.length;i++){
   const r=rows[i];
   if(!seen.has(r.vesselId)){
     seen.add(r.vesselId);
     statements.push(env.DB.prepare('INSERT INTO vessels (id,terminal,ship,voyage,imported_deadline,active,last_import_id) VALUES(?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET active=1, imported_deadline=excluded.imported_deadline,last_import_id=excluded.last_import_id').bind(r.vesselId,r.terminal,r.ship,r.voyage,r.deadline,id));
   }
   statements.push(env.DB.prepare('INSERT INTO reservations (id,import_id,vessel_id,reservation,client,deadline,qty20,qty40) VALUES(?,?,?,?,?,?,?,?)').bind(id+':'+i,id,r.vesselId,r.reservation,r.client,r.deadline,r.qty20,r.qty40));
 }
 try {await env.DB.batch(statements);} catch(e){return err('Database import failure: '+e.message,500);}
 return json({import_id:id,reservations:rows.length,unique_vessels:seen.size,terminals:[...new Set(rows.map(r=>r.terminal))],note:'Replaced active set; previous imports retained.'},201);
}
async function monitor(env) {
 const runId=crypto.randomUUID(),start=new Date().toISOString();
 await env.DB.prepare('INSERT INTO monitor_runs (id,started_at,status) VALUES(?,?,?)').bind(runId,start,'running').run();
 let checked=0,observed=0,changed=0,probes=[];
 try{
   const vessels=(await env.DB.prepare('SELECT * FROM vessels WHERE active=1 ORDER BY terminal,ship LIMIT 300').all()).results;
   if(env.ADAPTER_MODE!=='mock'){
     for(const terminal of [...new Set(vessels.map(v=>v.terminal))])probes.push(await probePortal(terminal));
   }
   for(const v of vessels){
     checked++;
     const stamp=new Date().toISOString();
     const result=await inspectVessel(env,v);
     if(result){
       observed++;
       const current=result.data;
       const hasBaseline=Boolean(v.last_observed_at);
       const previous={eta:v.observed_eta,etb:v.observed_etb,gate_open:v.observed_gate_open,deadline:v.observed_deadline};
       const differences=changesBetween(previous,current,hasBaseline);
       // A missing field never deletes the last good observation.
       const merged=Object.fromEntries(FIELDS.map(k=>[k,current[k]??previous[k]??null]));
       const cmds=[
         env.DB.prepare('INSERT INTO observations (id,vessel_id,observed_at,source,data_json) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),v.id,stamp,result.source,JSON.stringify(current)),
         env.DB.prepare('UPDATE vessels SET observed_eta=?,observed_etb=?,observed_gate_open=?,observed_deadline=?,last_checked_at=?,last_observed_at=? WHERE id=?').bind(merged.eta,merged.etb,merged.gate_open,merged.deadline,stamp,stamp,v.id)
       ];
       for(const change of differences)cmds.push(env.DB.prepare('INSERT INTO changes(id,vessel_id,changed_at,field,previous_value,current_value,source) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),v.id,stamp,change.field,change.before,change.after,result.source));
       await env.DB.batch(cmds);changed+=differences.length;
     }else await env.DB.prepare('UPDATE vessels SET last_checked_at=? WHERE id=?').bind(stamp,v.id).run();
   }
   const status=env.ADAPTER_MODE==='mock'?'completed_mock':'probe_only_no_feed';
   await env.DB.prepare('UPDATE monitor_runs SET finished_at=?,status=?,checked=?,observed=?,changed=?,details_json=? WHERE id=?').bind(new Date().toISOString(),status,checked,observed,changed,JSON.stringify(probes),runId).run();
   return {run_id:runId,status,checked,observed,changed,probes};
 }catch(e){
   await env.DB.prepare('UPDATE monitor_runs SET finished_at=?,status=?,details_json=? WHERE id=?').bind(new Date().toISOString(),'failed',JSON.stringify({error:String(e).slice(0,250)}),runId).run();
   throw e;
 }
}
export default {
 async fetch(request,env){
   const path=new URL(request.url).pathname;
   if(path==='/health'&&request.method==='GET')return json({ok:true,service:'vessel-monitor-poc',adapter_mode:env.ADAPTER_MODE||'probe'});
   if(!secure(request,env))return err('Unauthorized',401);
   if(!env.DB)return err('D1 DB binding missing',503);
   try {
    if(path==='/api/program/import'&&request.method==='POST')return await importProgramming(request,env);
    if(path==='/api/vessels'&&request.method==='GET'){
      const query=new URL(request.url).searchParams;
      const active=query.get('active')==='false'?0:1;
      const result=await env.DB.prepare('SELECT v.*, (SELECT COUNT(*) FROM reservations r WHERE r.vessel_id=v.id AND r.import_id=v.last_import_id) AS reservations FROM vessels v WHERE active=? ORDER BY terminal,ship LIMIT 300').bind(active).all();
      return json({items:result.results});
    }
    if(path==='/api/changes'&&request.method==='GET'){
      const result=await env.DB.prepare('SELECT c.*,v.terminal,v.ship,v.voyage FROM changes c JOIN vessels v ON v.id=c.vessel_id ORDER BY c.changed_at DESC LIMIT 100').all();
      return json({items:result.results});
    }
    if(path==='/api/runs'&&request.method==='GET'){
      const result=await env.DB.prepare('SELECT * FROM monitor_runs ORDER BY started_at DESC LIMIT 20').all();
      return json({items:result.results});
    }
    if(path==='/api/monitor/run'&&request.method==='POST')return json(await monitor(env));
    if(path==='/api/sources/probe'&&request.method==='POST'){
      const items=await Promise.all(Object.keys(PORTALS).map(probePortal));return json({items,notice:'Reachability only; no validated machine-readable feed or ship data'});
    }
    return err('Route not found',404);
   }catch(e){return err('Internal error: '+String(e.message||e).slice(0,200),500);}
 },
 async scheduled(_event,env,ctx){ctx.waitUntil(monitor(env));}
};
