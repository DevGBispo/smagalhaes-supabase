// Pure functions: independent from Cloudflare and D1, executable with node:test.
export const FIELDS = ['eta', 'etb', 'gate_open', 'deadline'];
export const TERMINALS = ['BTP', 'ECOPORTO', 'SANTOS_BRASIL'];
export function clean(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function canonicalTerminal(input) {
  const v = clean(input);
  if (v === 'BTP' || v.includes('BRASIL TERMINAL PORTUARIO')) return 'BTP';
  if (v.includes('ECOPORTO')) return 'ECOPORTO';
  if (v.includes('SANTOS BRASIL') || v.includes('TECON SANTOS')) return 'SANTOS_BRASIL';
  throw new Error('Unsupported terminal: ' + String(input));
}
export function vesselKey(row) {
  return [canonicalTerminal(row.terminal), clean(row.ship), clean(row.voyage || '')].join('|');
}
export function normalizeRow(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid record');
  const terminal = canonicalTerminal(input.terminal);
  const ship = clean(input.ship);
  const voyage = clean(input.voyage ?? '');
  const reservation = String(input.reservation ?? '').trim();
  const client = String(input.client ?? '').trim();
  if (!ship || ship.length > 100 || !reservation || reservation.length > 100 || !client || client.length > 150) throw new Error('Missing or oversized ship/reservation/client');
  const qty20 = Number(input.qty20 ?? 0);
  const qty40 = Number(input.qty40 ?? 0);
  if (![qty20,qty40].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 100000)) throw new Error('Invalid container quantities');
  const deadline = input.deadline == null || input.deadline === '' ? null : String(input.deadline);
  if (deadline && (deadline.length > 70 || !/^\d{4}-\d{2}-\d{2}/.test(deadline))) throw new Error('Use ISO-like deadline, e.g. 2026-10-03T12:00:00-03:00');
  return {terminal,ship,voyage,reservation,client,deadline,qty20,qty40,vesselId:[terminal,ship,voyage].join('|')};
}
export function normalizeObservation(input,expected) {
  if (!input || canonicalTerminal(input.terminal) !== expected.terminal || clean(input.ship) !== expected.ship || clean(input.voyage ?? '') !== expected.voyage) return null;
  const out = {};
  for(const field of FIELDS) {
    const v = input[field] == null || input[field] === '' ? null : String(input[field]);
    if (v && (v.length > 75 || !/^\d{4}-\d{2}-\d{2}/.test(v))) throw new Error('Invalid observed timestamp '+field);
    out[field]=v;
  }
  return out;
}
export function changesBetween(previous, current, hasBaseline) {
  if(!hasBaseline) return []; // First observation establishes a baseline, not an alert.
  return FIELDS.flatMap(field => {
    const before=previous[field] ?? null, after=current[field] ?? null;
    // Absence of a field must never erase a previously observed value.
    if (after === null || before === after) return [];
    return [{field,before,after}];
  });
}
