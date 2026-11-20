import type { TeamPermissions, TeamRole } from './equipe';

export const ROLE_LABEL: Record<string, string> = {
  owner: 'Dono',
  admin: 'Administrador',
  operador: 'Operador',
  financeiro: 'Financeiro',
  vendedor: 'Vendedor',
  contador: 'Contador',
};

export const AREAS = [
  { key: 'produtos', label: 'Produtos' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'expedicao', label: 'Expedição' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'notas_fiscais', label: 'Notas fiscais' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'configuracoes', label: 'Configurações' },
];

export const ACTIONS = [
  { key: 'ver', label: 'Ver' },
  { key: 'criar', label: 'Criar' },
  { key: 'editar', label: 'Editar' },
  { key: 'excluir', label: 'Excluir' },
  { key: 'exportar', label: 'Exportar' },
];

const ALL = ['ver', 'criar', 'editar', 'excluir', 'exportar'];

export const DEFAULT_PERMISSIONS: Record<TeamRole, TeamPermissions> = {
  admin: Object.fromEntries(AREAS.map((a) => [a.key, ALL])),
  operador: {
    produtos: ['ver', 'criar', 'editar'],
    estoque: ['ver', 'criar', 'editar', 'exportar'],
    fornecedores: ['ver', 'criar', 'editar'],
    pedidos: ['ver', 'editar'],
    clientes: ['ver'],
    expedicao: ['ver', 'criar', 'editar'],
  },
  vendedor: {
    produtos: ['ver'],
    estoque: ['ver'],
    pedidos: ['ver', 'criar', 'editar'],
    clientes: ['ver', 'criar', 'editar'],
  },
  financeiro: {
    fornecedores: ['ver'],
    pedidos: ['ver', 'exportar'],
    clientes: ['ver'],
    financeiro: ['ver', 'criar', 'editar', 'exportar'],
    notas_fiscais: ['ver', 'exportar'],
    relatorios: ['ver', 'exportar'],
  },
  contador: {
    pedidos: ['ver', 'exportar'],
    financeiro: ['ver', 'exportar'],
    notas_fiscais: ['ver', 'exportar'],
    relatorios: ['ver', 'exportar'],
  },
};

export const clonePerms = (p: TeamPermissions): TeamPermissions => JSON.parse(JSON.stringify(p)) as TeamPermissions;

export function generatePassword(len = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join('');
}