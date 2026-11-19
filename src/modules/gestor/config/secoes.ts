import type { ElementType } from 'react';
import { BarChart3, FileText, MessageCircle, Plug, Receipt, Settings, ShoppingCart, Truck, Undo2, UserCheck, Wallet } from 'lucide-react';

export type Secao = {
  title: string;
  icon: ElementType;
  description: string;
  features: string[];
  note?: string;
};

export const SECOES: Record<string, Secao> = {
  expedicao: {
    title: 'Expedição',
    icon: Truck,
    description: 'Separação, embalagem e envio dos pedidos pagos.',
    features: ['Fila de pedidos prontos para separar', 'Etiquetas e código de rastreio', 'Status: separado, embalado, enviado', 'Baixa de estoque na saída'],
  },
  vendedores: {
    title: 'Vendedores',
    icon: UserCheck,
    description: 'Cadastro de vendedores, metas e comissões.',
    features: ['Cadastro e vínculo com a loja', 'Vendas por vendedor', 'Metas mensais', 'Comissão por venda'],
  },
  'venda-manual': {
    title: 'Venda manual',
    icon: ShoppingCart,
    description: 'Lançamento de pedidos feitos fora da loja virtual (balcão, WhatsApp, telefone).',
    features: ['Escolha do cliente cadastrado', 'Produtos e variações com estoque', 'Desconto, frete e forma de pagamento', 'Gera o pedido e baixa o estoque'],
  },
  propostas: {
    title: 'Propostas comerciais',
    icon: FileText,
    description: 'Orçamentos para enviar ao cliente e converter em pedido.',
    features: ['Proposta com validade', 'Envio por link ou PDF', 'Aprovação e conversão em pedido', 'Histórico por cliente'],
  },
  financeiro: {
    title: 'Financeiro',
    icon: Wallet,
    description: 'Contas a receber, contas a pagar e fluxo de caixa.',
    features: ['Recebimentos por pedido', 'Contas a pagar e fornecedores', 'Fluxo de caixa', 'Conciliação com o gateway'],
  },
  'notas-fiscais': {
    title: 'Notas Fiscais',
    icon: Receipt,
    description: 'Emissão e controle das notas fiscais dos pedidos.',
    features: ['Emissão a partir do pedido', 'XML e DANFE', 'Cancelamento e carta de correção', 'Acesso do contador'],
  },
  'logistica-reversa': {
    title: 'Logística reversa',
    icon: Undo2,
    description: 'Trocas, devoluções e reembolsos.',
    features: ['Solicitações de troca e devolução', 'Motivo e status', 'Retorno ao estoque', 'Reembolso vinculado ao pedido'],
  },
  relatorios: {
    title: 'Relatórios',
    icon: BarChart3,
    description: 'Vendas, produtos e clientes cruzados por período e local.',
    features: ['Vendas por cidade e UF (ex.: Rio de Janeiro no mês passado)', 'Produtos mais vendidos', 'Clientes por valor e recorrência', 'Exportação em Excel'],
  },
  integracoes: {
    title: 'Integrações',
    icon: Plug,
    description: 'Conexões com plataformas, marketplaces e meios de pagamento.',
    features: ['Yampi', 'Marketplaces', 'Gateways de pagamento', 'Status e último sincronismo'],
  },
  whatsapp: {
    title: 'WhatsApp',
    icon: MessageCircle,
    description: 'Conexão com o WhatsApp para atendimento e mensagens ao cliente.',
    features: ['Conexão com o provedor escolhido', 'Mensagens de pedido e rastreio', 'Respeita o consentimento do cliente (accepts_whatsapp)'],
    note: 'Depende de escolher o provedor: API oficial da Meta, Z-API ou Evolution.',
  },
  configuracoes: {
    title: 'Configurações',
    icon: Settings,
    description: 'Dados da empresa e preferências do Gestor.',
    features: ['Dados da empresa', 'Depósitos e estoque mínimo', 'Papéis e permissões', 'Numeração de pedidos'],
  },
};
