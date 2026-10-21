export const TERMS_VERSION = '2026-10-v1';

export type ClubeSettings = {
  grace_days: number;
  payout_day: number;
  min_withdrawal: number;
};

export type RuleSection = { id: string; title: string; items: string[] };

const brl = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function buildClubeRules(s: ClubeSettings): RuleSection[] {
  return [
    {
      id: 'programa',
      title: 'Como funciona o Clube SLL',
      items: [
        'O Clube SLL é o programa de indicação do SLL Hub. Você indica lojas pelo seu link exclusivo e recebe 10% de comissão recorrente sobre cada pagamento confirmado da assinatura da loja indicada.',
        'Não há limite de lojas indicadas.',
        'A comissão continua enquanto a loja indicada mantiver a assinatura ativa e em dia.',
      ],
    },
    {
      id: 'indicacao',
      title: 'Indicação válida',
      items: [
        'Vale a loja que se cadastra pela primeira vez usando o seu link ou código e que ainda não tinha conta no SLL Hub.',
        'O período de teste gratuito não gera comissão. A comissão nasce no primeiro pagamento confirmado depois do teste.',
        'Autoindicação não é permitida. Lojas, CPFs, CNPJs ou e-mails do mesmo titular, ou de pessoas ligadas a você, não geram comissão.',
      ],
    },
    {
      id: 'carencia',
      title: 'Carência e liberação',
      items: [
        `Cada comissão fica em "Saldo a liberar" por ${s.grace_days} dias após o pagamento que a originou. Passado esse prazo, ela passa para "Saldo disponível".`,
        'Cada mensalidade paga tem a sua própria carência.',
      ],
    },
    {
      id: 'saques',
      title: 'Saques e pagamentos',
      items: [
        `Valor mínimo por saque: ${brl(s.min_withdrawal)}.`,
        `Os pagamentos são feitos por PIX todo dia ${s.payout_day} de cada mês, para os saques solicitados até o dia anterior.`,
        'A chave PIX deve pertencer ao titular da conta no SLL Hub. Podemos recusar saques para chaves de terceiros.',
        'Você acompanha o status de cada saque e o comprovante em "Meus saques".',
      ],
    },
    {
      id: 'estornos',
      title: 'Estornos e chargebacks',
      items: [
        'A comissão é devida apenas sobre pagamentos efetivamente concluídos e não revertidos.',
        'Se o pagamento que originou a comissão for reembolsado, cancelado ou contestado (chargeback), a comissão correspondente será cancelada.',
        'Se a comissão já tiver sido sacada, o valor será registrado como saldo devedor e descontado das próximas comissões. Enquanto houver saldo devedor, novos saques ficam bloqueados.',
      ],
    },
    {
      id: 'condutas',
      title: 'Condutas proibidas',
      items: [
        'Spam e mensagens em massa não solicitadas.',
        'Propaganda enganosa, promessa falsa de resultado ou se passar pelo SLL Hub.',
        'Usar as marcas do SLL Hub como palavra-chave em anúncios pagos.',
        'Cadastros falsos, fraudes ou pagamentos feitos com meios de terceiros sem autorização.',
        'A violação pode levar ao cancelamento de comissões, ao bloqueio de saques e à exclusão do programa.',
      ],
    },
    {
      id: 'impostos',
      title: 'Impostos e dados',
      items: [
        'Você é responsável pelos tributos incidentes sobre as comissões que receber.',
        'Podemos solicitar dados cadastrais e fiscais, inclusive nota fiscal, para efetuar o pagamento.',
        'Registramos a data, a versão e o dispositivo do seu aceite como comprovação.',
      ],
    },
    {
      id: 'mudancas',
      title: 'Alterações e encerramento',
      items: [
        'Podemos alterar estas regras. Mudanças relevantes exigem um novo aceite, e as comissões já geradas seguem a regra vigente na data do pagamento que as originou.',
        'Você pode deixar de participar quando quiser. O saldo já liberado continua disponível para saque, observadas as regras de estorno.',
        'O SLL Hub (RAV Marketing e Treinamento LTDA) pode encerrar o programa com aviso prévio. As comissões já liberadas serão pagas.',
      ],
    },
  ];
}