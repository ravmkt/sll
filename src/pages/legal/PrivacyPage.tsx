import LegalLayout, { CONTACT_EMAIL } from "./LegalLayout";

const h2 = "text-xl font-semibold mt-8 mb-2";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidade">
      <p>
        O SLL Hub, acessível em app.sllhub.com.br, é uma plataforma da RAV Marketing e Treinamento LTDA (CNPJ 62.894.336/0001-00), controladora dos dados nos termos da LGPD, para
        lojistas de e-commerce. Esta política explica quais dados coletamos, para que usamos e como
        você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2 className={h2}>1. Dados que coletamos</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li><strong>Conta:</strong> nome, e-mail e foto de perfil, quando você entra com e-mail ou com a conta Google.</li>
        <li><strong>Loja:</strong> nome, URL, catálogo de produtos e configurações informadas por você.</li>
        <li><strong>Conteúdo:</strong> vídeos, stories e mídias que você envia ou importa, inclusive do Instagram quando você autoriza a conexão.</li>
        <li><strong>Uso e métricas:</strong> visualizações, reproduções, cliques e conversões gerados pelos widgets instalados na loja.</li>
        <li><strong>Pagamento:</strong> status da assinatura. Os dados do cartão são tratados pelo processador de pagamentos (Asaas) e não ficam conosco.</li>
      </ul>

      <h2 className={h2}>2. Como usamos os dados</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Autenticar você e manter sua conta.</li>
        <li>Fornecer os módulos contratados (vídeos interativos, live commerce e analytics).</li>
        <li>Cobrar a assinatura e dar suporte.</li>
        <li>Melhorar o desempenho e a segurança da plataforma.</li>
      </ul>
      <p>Não vendemos dados pessoais.</p>

      <h2 className={h2}>3. Login com Google</h2>
      <p>
        Ao entrar com o Google, recebemos apenas seu nome, e-mail e foto de perfil. Usamos essas
        informações somente para criar e identificar sua conta. O uso dessas informações segue a
        Política de Dados de Usuário dos Serviços de API do Google, incluindo os requisitos de uso limitado.
      </p>

      <h2 className={h2}>4. Integração com o Instagram</h2>
      <p>
        Quando você conecta sua conta do Instagram, acessamos apenas as mídias que você escolhe
        importar para a sua loja. Você pode desconectar a qualquer momento na tela de Integração.
      </p>

      <h2 className={h2}>5. Compartilhamento</h2>
      <p>
        Compartilhamos dados apenas com prestadores necessários à operação: hospedagem e banco de
        dados (Supabase e Vercel), pagamentos (Asaas) e as plataformas que você conecta (Instagram/Meta, Google).
      </p>

      <h2 className={h2}>6. Armazenamento e segurança</h2>
      <p>
        Os dados ficam em banco com controle de acesso por loja e criptografia em trânsito. Mantemos
        os dados enquanto sua conta estiver ativa e pelo prazo exigido por lei após o cancelamento.
      </p>

      <h2 className={h2}>7. Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção, portabilidade, anonimização ou exclusão dos seus dados,
        e revogar consentimentos. Escreva para{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 className={h2}>8. Cookies e armazenamento local</h2>
      <p>
        Usamos armazenamento local do navegador para manter sua sessão e preferências. Os widgets
        instalados nas lojas registram eventos de uso para gerar as métricas do lojista.
      </p>

      <h2 className={h2}>9. Alterações</h2>
      <p>Podemos atualizar esta política. A data da última atualização fica no topo da página.</p>
    </LegalLayout>
  );
}