import type { AuditLog, CallSession, Driver, Shipment } from "./types";

export const seedDrivers: Driver[] = [
  { id: "d-01", chapeira: "01", nome: "Motorista 01", cavalo: "ABC1D23", reboque: "REB001", status: "disponivel" },
  { id: "d-02", chapeira: "02", nome: "Motorista 02", cavalo: "BCD2E34", reboque: "REB002", status: "disponivel" },
  { id: "d-03", chapeira: "03", nome: "Motorista 03", cavalo: "CDE3F45", reboque: "REB003", status: "gancho" },
  { id: "d-04", chapeira: "04", nome: "Motorista 04", cavalo: "DEF4G56", reboque: "REB004", status: "disponivel" },
  { id: "d-05", chapeira: "05", nome: "Motorista 05", cavalo: "EFG5H67", reboque: "REB005", status: "bloqueado" },
  { id: "d-06", chapeira: "06", nome: "Motorista 06", cavalo: "FGH6I78", reboque: "REB006", status: "disponivel" },
];

export const seedShipments: Shipment[] = [
  {
    id: "e-0000",
    terminal: "Brasil Terminais",
    patio: "Pátio 2",
    horario: "00:00",
    destino: "Exportação",
    imo: false,
    status: "iniciado",
    createdBy: "Operador Teste",
    startedAt: new Date().toISOString(),
    drivers: seedDrivers.slice(0, 3).map((driver) => ({ driverId: driver.id, chapeira: driver.chapeira, nome: driver.nome, loaded: true })),
  },
  {
    id: "e-0100",
    terminal: "DP World",
    patio: "Pátio 1",
    horario: "01:00",
    destino: "Exportação",
    imo: true,
    status: "iniciado",
    createdBy: "Operador Teste",
    startedAt: new Date().toISOString(),
    drivers: seedDrivers.slice(3, 6).map((driver, index) => ({ driverId: driver.id, chapeira: driver.chapeira, nome: driver.nome, loaded: index < 1 })),
  },
];

export const seedCalls: CallSession[] = [
  {
    id: "c-santos",
    categoria: "Santos · IMO",
    status: "ativa",
    startedBy: "Gestor Teste",
    startedAt: new Date().toISOString(),
    entries: seedDrivers.slice(0, 4).map((driver, index) => ({
      chapeira: driver.chapeira,
      nome: driver.nome,
      ok: index < 2,
      troca: index === 3 ? "50B" : "",
    })),
  },
];

export const seedLogs: AuditLog[] = [
  {
    id: "log-1",
    createdAt: new Date().toISOString(),
    userName: "Operador Teste",
    role: "operador",
    area: "Embarques",
    action: "Embarque iniciado",
    target: "Brasil Terminais · 00:00 · Pátio 2",
    after: "3 motorista(s) vinculados",
  },
  {
    id: "log-2",
    createdAt: new Date().toISOString(),
    userName: "Gestor Teste",
    role: "gestor",
    area: "Chamada",
    action: "Troca informada na chamada",
    target: "Santos · IMO · Chapeira 04",
    before: "—",
    after: "50B",
  },
];
