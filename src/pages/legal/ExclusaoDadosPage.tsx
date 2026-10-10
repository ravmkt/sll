import LegalLayout, { CONTACT_EMAIL } from "./LegalLayout";

const h2 = "text-xl font-semibold mt-8 mb-2";

export default function ExclusaoDadosPage() {
  return (
    <LegalLayout title="Exclusão de dados">
      <p>
        Você pode pedir a exclusão dos seus dados no SLL Hub a qualquer momento, inclusive dos dados obtidos pelas
        integrações com Instagram (Meta) e TikTok. Veja abaixo como fazer.
      </p>

      <h2 className={h2}>1. Desconectar o Instagram ou o TikTok</h2>
      <p>
        Entre na plataforma, abra a tela de Integração (ou o Passo 1 do onboarding) e use a opção de desconectar. Você também
        pode revogar a permissão direto na plataforma de origem:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li><strong>Instagram:</strong> Configurações &gt; Apps e sites &gt; remova o app do SLL Hub.</li>
        <li><strong>TikTok:</strong> Configurações e privacidade &gt; Segurança e permissões &gt; Permissões de apps &gt; remova o SLL Hub.</li>
      </ul>

      <h2 className={h2}>2. Pedir a exclusão dos seus dados</h2>
      <p>
        Envie um e-mail para{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> com o assunto{" "}
        <strong>"Exclusão de dados"</strong>, a partir do e-mail cadastrado na sua conta. Informe o nome da loja e se deseja
        excluir somente os dados das integrações (Instagram/TikTok) ou a conta inteira. Podemos pedir uma confirmação de
        identidade para proteger a sua conta.
      </p>

      <h2 className={h2}>3. O que será excluído</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Tokens de acesso e identificadores das contas conectadas (Instagram e TikTok).</li>
        <li>Dados de perfil e conteúdos importados dessas plataformas.</li>
        <li>Em caso de exclusão da conta: cadastro, vídeos, stories, configurações e métricas da loja.</li>
      </ul>

      <h2 className={h2}>4. Prazo e exceções</h2>
      <p>
        Atendemos o pedido em até 15 dias úteis e confirmamos por e-mail. Podemos manter apenas os dados que a lei nos obriga
        a guardar, como registros fiscais e financeiros de cobrança, pelo prazo legal e sem outra finalidade, conforme a LGPD
        (Lei 13.709/2018).
      </p>

      <p className="mt-8 text-sm">
        Veja também a <a className="underline" href="/privacidade">Política de Privacidade</a> e os{" "}
        <a className="underline" href="/termos">Termos de Serviço</a>.
      </p>
    </LegalLayout>
  );
}