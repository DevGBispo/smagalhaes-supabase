import { normalizeObservation } from './core.js';

export const PORTALS = {
 BTP: 'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
 ECOPORTO: 'https://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
 SANTOS_BRASIL: 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao'
};
// Probe verifies network reachability only. A 200 HTML page is NOT a stable data API.
export async function probePortal(terminal) {
 const url=PORTALS[terminal];
 if(!url) return {terminal,ok:false,reason:'unsupported_terminal'};
 try {
   const response=await fetch(url,{headers:{Accept:'text/html,application/json'},signal:AbortSignal.timeout(9000),redirect:'follow'});
   await response.body?.cancel();
   return {terminal,ok:response.ok,http_status:response.status,content_type:response.headers.get('content-type'),final_origin:new URL(response.url).origin,verified_feed:false};
 } catch(e) { return {terminal,ok:false,reason:String(e).slice(0,200),verified_feed:false}; }
}
export function mockObservation(env, vessel) {
 if(env.ADAPTER_MODE !== 'mock' || env.ALLOW_DEMO !== 'true') return null;
 let records;
 try{ records=JSON.parse(env.DEMO_OBSERVATIONS_JSON||'{}').observations; } catch { throw new Error('Invalid DEMO_OBSERVATIONS_JSON'); }
 if(!Array.isArray(records)) return null;
 for(const record of records) {
   try { const out=normalizeObservation(record,vessel); if(out) return {source:'mock',data:out}; } catch {}
 }
 return null;
}
export async function inspectVessel(env,vessel) {
 if(env.ADAPTER_MODE==='mock') return mockObservation(env,vessel);
 // No arbitrary HTML extraction, anti-bot bypass or fabricated terminal statuses.
 return null;
}
