export type Role = "desenvolvedor" | "administrador" | "gestor" | "operador" | "consulta";

export type Driver = {
  id: string;
  chapeira: string;
  nome: string;
  cavalo: string;
  reboque: string;
  cpf?: string;
  cnh?: string;
  status: "disponivel" | "bloqueado" | "gancho";
};

export type ShipmentDriver = {
  driverId: string;
  chapeira: string;
  nome: string;
  loaded: boolean;
};

export type Shipment = {
  id: string;
  terminal: string;
  patio: string;
  horario: string;
  destino: string;
  imo: boolean;
  status: "programado" | "iniciado" | "concluido";
  createdBy: string;
  startedAt?: string;
  drivers: ShipmentDriver[];
};

export type CallEntry = {
  chapeira: string;
  nome: string;
  ok: boolean;
  troca?: string;
};

export type CallSession = {
  id: string;
  categoria: string;
  status: "ativa" | "encerrada";
  startedBy: string;
  startedAt: string;
  entries: CallEntry[];
};

export type AuditLog = {
  id: string;
  createdAt: string;
  userName: string;
  role: Role;
  area: "Embarques" | "Motoristas" | "Chamada" | "Usuários" | "Sistema";
  action: string;
  target: string;
  before?: string;
  after?: string;
};
