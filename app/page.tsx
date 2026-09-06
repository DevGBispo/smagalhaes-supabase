"use client";

import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ClipboardCheck, Database, History, Plus, ShipWheel, Truck, UsersRound } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase";
import { seedCalls, seedDrivers, seedLogs, seedShipments } from "@/lib/seed";
import type { AuditLog, CallSession, Driver, Shipment } from "@/lib/types";

const nav = [
  { id: "painel", label: "Painel", icon: BarChart3 },
  { id: "embarques", label: "Embarques", icon: ClipboardCheck },
  { id: "nova", label: "Nova programação", icon: Plus },
  { id: "chamada", label: "Chamada", icon: UsersRound },
  { id: "motoristas", label: "Motoristas", icon: Truck },
  { id: "logs", label: "Log de alterações", icon: History },
] as const;

type Tab = (typeof nav)[number]["id"];

function pct(shipment: Shipment) {
  if (!shipment.drivers.length) return 0;
  return Math.round((shipment.drivers.filter((driver) => driver.loaded).length / shipment.drivers.length) * 100);
}

function isComplete(shipment: Shipment) {
  return shipment.drivers.length > 0 && shipment.drivers.every((driver) => driver.loaded);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function addLog(logs: AuditLog[], entry: Omit<AuditLog, "id" | "createdAt" | "userName" | "role">) {
  return [
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      userName: "Operador Teste",
      role: "operador" as const,
      ...entry,
    },
    ...logs,
  ];
}

export default function Page() {
  const [tab, setTab] = useState<Tab>("painel");
  const [shipments, setShipments] = useState<Shipment[]>(seedShipments);
  const [drivers, setDrivers] = useState<Driver[]>(seedDrivers);
  const [calls, setCalls] = useState<CallSession[]>(seedCalls);
  const [logs, setLogs] = useState<AuditLog[]>(seedLogs);

  const stats = useMemo(() => {
    const totalShipments = shipments.length;
    const completedShipments = shipments.filter(isComplete).length;
    const totalVehicles = shipments.reduce((sum, item) => sum + item.drivers.length, 0);
    const loadedVehicles = shipments.reduce((sum, item) => sum + item.drivers.filter((driver) => driver.loaded).length, 0);
    return { totalShipments, completedShipments, totalVehicles, loadedVehicles };
  }, [shipments]);

  function toggleLoaded(shipmentId: string, driverId: string) {
    const shipment = shipments.find((item) => item.id === shipmentId);
    const driver = shipment?.drivers.find((item) => item.driverId === driverId);
    setShipments((current) =>
      current.map((item) =>
        item.id === shipmentId
          ? {
              ...item,
              drivers: item.drivers.map((entry) =>
                entry.driverId === driverId ? { ...entry, loaded: !entry.loaded } : entry,
              ),
            }
          : item,
      ),
    );
    if (shipment && driver) {
      setLogs((current) =>
        addLog(current, {
          area: "Embarques",
          action: driver.loaded ? "Carregamento desfeito" : "Motorista marcado como carregado",
          target: `${shipment.terminal} · ${shipment.horario} · Chapeira ${driver.chapeira}`,
          before: driver.loaded ? "Carregado" : "Pendente",
          after: driver.loaded ? "Pendente" : "Carregado",
        }),
      );
    }
  }

  function startShipment(id: string) {
    const shipment = shipments.find((item) => item.id === id);
    setShipments((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "iniciado", startedAt: new Date().toISOString() } : item,
      ),
    );
    if (shipment) {
      setLogs((current) =>
        addLog(current, {
          area: "Embarques",
          action: "Embarque iniciado",
          target: `${shipment.terminal} · ${shipment.horario} · ${shipment.patio}`,
          after: "Status iniciado",
        }),
      );
    }
  }

  function addTestShipment() {
    const activeDrivers = drivers.filter((driver) => driver.status === "disponivel").slice(0, 4);
    const shipment: Shipment = {
      id: crypto.randomUUID(),
      terminal: "Santos Brasil",
      patio: "Pátio 3",
      horario: "03:00",
      destino: "Exportação",
      imo: false,
      status: "programado",
      createdBy: "Operador Teste",
      drivers: activeDrivers.map((driver) => ({ driverId: driver.id, chapeira: driver.chapeira, nome: driver.nome, loaded: false })),
    };
    setShipments((current) => [shipment, ...current]);
    setLogs((current) =>
      addLog(current, {
        area: "Embarques",
        action: "Embarque criado",
        target: `${shipment.terminal} · ${shipment.horario} · ${shipment.patio}`,
        after: `${shipment.drivers.length} motorista(s) vinculados`,
      }),
    );
    setTab("embarques");
  }

  function updateDriverStatus(driverId: string, status: Driver["status"]) {
    const driver = drivers.find((item) => item.id === driverId);
    setDrivers((current) => current.map((item) => (item.id === driverId ? { ...item, status } : item)));
    if (driver) {
      setLogs((current) =>
        addLog(current, {
          area: "Motoristas",
          action: "Status do motorista alterado",
          target: `${driver.chapeira} · ${driver.nome}`,
          before: driver.status,
          after: status,
        }),
      );
    }
  }

  function toggleCallOk(callId: string, chapeira: string) {
    const call = calls.find((item) => item.id === callId);
    const entry = call?.entries.find((item) => item.chapeira === chapeira);
    setCalls((current) =>
      current.map((item) =>
        item.id === callId
          ? {
              ...item,
              entries: item.entries.map((callEntry) =>
                callEntry.chapeira === chapeira ? { ...callEntry, ok: !callEntry.ok } : callEntry,
              ),
            }
          : item,
      ),
    );
    if (call && entry) {
      setLogs((current) =>
        addLog(current, {
          area: "Chamada",
          action: entry.ok ? "Confirmação da chamada desfeita" : "Motorista confirmado na chamada",
          target: `${call.categoria} · Chapeira ${entry.chapeira}`,
          before: entry.ok ? "OK" : "Pendente",
          after: entry.ok ? "Pendente" : "OK",
        }),
      );
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SM</span>
          <div>
            <strong>Smagalhães</strong>
            <small>Teste Supabase</small>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="db-card">
          <Database size={18} />
          <span>{hasSupabaseConfig ? "Supabase configurado" : "Modo simulação local"}</span>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Ambiente de teste</p>
            <h1>Controle de Embarque</h1>
            <p>Protótipo isolado para validar Supabase, realtime, logs e fluxo operacional.</p>
          </div>
          <button className="primary" onClick={addTestShipment}>Criar embarque teste</button>
        </header>

        {tab === "painel" && (
          <section className="grid">
            <article className="metric"><span>Programações</span><strong>{stats.totalShipments}</strong><small>{stats.completedShipments} concluída(s)</small></article>
            <article className="metric"><span>Veículos</span><strong>{stats.loadedVehicles}/{stats.totalVehicles}</strong><small>confirmados</small></article>
            <article className="metric"><span>Motoristas</span><strong>{drivers.length}</strong><small>base de teste</small></article>
            <article className="metric"><span>Logs</span><strong>{logs.length}</strong><small>alterações registradas</small></article>
            <article className="panel wide">
              <h2>Programação de hoje</h2>
              <div className="shipment-list compact">
                {shipments.map((shipment) => (
                  <div key={shipment.id} className={`shipment-card ${isComplete(shipment) ? "complete" : ""}`}>
                    <strong>{shipment.terminal} · {shipment.horario}</strong>
                    <span>{shipment.patio} · {shipment.drivers.length} veículos</span>
                    <div className="progress"><i style={{ width: `${pct(shipment)}%` }} /></div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {(tab === "embarques" || tab === "nova") && (
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>{tab === "nova" ? "Nova programação" : "Controle de embarques"}</h2>
                <p>Teste de criação, início, confirmação e conclusão de embarques.</p>
              </div>
              <button className="primary" onClick={addTestShipment}>Adicionar programação</button>
            </div>
            <div className="shipment-list">
              {shipments.map((shipment) => (
                <article key={shipment.id} className={`shipment-detail ${isComplete(shipment) ? "complete" : ""}`}>
                  <div className="shipment-title">
                    <div>
                      <strong>{shipment.terminal} · {shipment.horario}</strong>
                      <small>{shipment.patio} · {shipment.destino} {shipment.imo ? "· IMO" : ""}</small>
                    </div>
                    <span>{shipment.drivers.filter((driver) => driver.loaded).length}/{shipment.drivers.length} confirmados</span>
                  </div>
                  <div className="progress"><i style={{ width: `${pct(shipment)}%` }} /></div>
                  <div className="driver-grid">
                    {shipment.drivers.map((driver) => (
                      <button key={driver.driverId} className={driver.loaded ? "loaded" : ""} onClick={() => toggleLoaded(shipment.id, driver.driverId)}>
                        <CheckCircle2 size={16} /> {driver.chapeira} · {driver.nome}
                      </button>
                    ))}
                  </div>
                  {shipment.status === "programado" && <button className="ghost" onClick={() => startShipment(shipment.id)}>Iniciar embarque</button>}
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "chamada" && (
          <section className="panel">
            <h2>Chamada de motoristas</h2>
            {calls.map((call) => (
              <article key={call.id} className="call-card">
                <div className="shipment-title"><strong>{call.categoria}</strong><span>{call.status}</span></div>
                <div className="driver-grid">
                  {call.entries.map((entry) => (
                    <button key={entry.chapeira} className={entry.ok ? "loaded" : ""} onClick={() => toggleCallOk(call.id, entry.chapeira)}>
                      {entry.chapeira} · {entry.nome}{entry.troca ? ` → ${entry.troca}` : ""}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "motoristas" && (
          <section className="panel">
            <h2>Motoristas</h2>
            <div className="driver-table">
              {drivers.map((driver) => (
                <article key={driver.id}>
                  <strong>{driver.chapeira}</strong>
                  <span>{driver.nome}</span>
                  <span>{driver.cavalo}</span>
                  <span>{driver.reboque}</span>
                  <select value={driver.status} onChange={(event) => updateDriverStatus(driver.id, event.target.value as Driver["status"])}>
                    <option value="disponivel">Disponível</option>
                    <option value="bloqueado">Bloqueado</option>
                    <option value="gancho">Gancho</option>
                  </select>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "logs" && (
          <section className="panel">
            <h2>Log de alterações</h2>
            <p className="muted">Neste protótipo, operador e gestor geram registros; administrador/desenvolvedor visualizam.</p>
            <div className="log-list">
              {logs.map((log) => (
                <article key={log.id}>
                  <small>{formatTime(log.createdAt)} · {log.userName} · {log.role}</small>
                  <strong>{log.area} — {log.action}</strong>
                  <span>{log.target}</span>
                  {(log.before || log.after) && <em>{log.before ?? "—"} → {log.after ?? "—"}</em>}
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
