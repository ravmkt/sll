import LegalLayout, { CONTACT_EMAIL } from "./LegalLayout";

const h2 = "text-xl font-semibold mt-8 mb-2";

export default function TermsPage() {
  return (
    <LegalLayout title="Termos de Serviço">
      <p>
        Ao criar uma conta ou usar o SLL Hub (Sistema Loja Lucrativa), em app.sllhub.com.br, você
        concorda com estes termos.
      </p>

      <h2 className={h2}>1. O serviço</h2>
      <p>
        O SLL Hub oferece módulos para lojistas de e-commerce, como vídeos interativos (Vidlytics) e
        live commerce, com widgets instalados na loja via script ou Google Tag Manager, além de
        painéis de métricas.
      </p>

      <h2 className={h2}>2. Conta</h2>
      <p>
        Você é responsável pelas informações da conta, pela segurança do acesso e por toda atividade
        feita nela. Informe dados verdadeiros e mantenha-os atualizados.
      </p>

      <h2 className={h2}>3. Planos e pagamento</h2>
      <p>
        Os módulos disponíveis dependem do plano contratado. A cobrança é recorrente e feita pelo
        processador de pagamentos. A falta de pagamento pode suspender módulos ou a conta. Você pode
        cancelar a qualquer momento, e o acesso vale até o fim do período já pago.
      </p>

      <h2 className={h2}>4. Conteúdo do lojista</h2>
      <p>
        Você mantém a propriedade dos vídeos, imagens e textos que envia e nos autoriza a hospedá-los
        e exibi-los para operar o serviço. Você declara ter os direitos sobre esse conteúdo e se
        responsabiliza por ele, inclusive por material importado de redes sociais.
      </p>

      <h2 className={h2}>5. Uso proibido</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Publicar conteúdo ilegal, enganoso ou que viole direitos de terceiros.</li>
        <li>Tentar acessar dados de outras lojas ou burlar limites do plano.</li>
        <li>Prejudicar a estabilidade ou a segurança da plataforma.</li>
      </ul>

      <h2 className={h2}>6. Disponibilidade</h2>
      <p>
        Buscamos manter o serviço disponível, mas não garantimos funcionamento ininterrupto.
        Manutenções e falhas de terceiros podem causar indisponibilidade.
      </p>

      <h2 className={h2}>7. Limitação de responsabilidade</h2>
      <p>
        Na extensão permitida por lei, não respondemos por lucros cessantes ou danos indiretos
        decorrentes do uso do serviço. Os resultados de vendas dependem da operação de cada loja.
      </p>

      <h2 className={h2}>8. Privacidade</h2>
      <p>O tratamento de dados pessoais segue nossa Política de Privacidade.</p>

      <h2 className={h2}>9. Alterações e contato</h2>
      <p>
        Podemos atualizar estes termos, e o uso contínuo após a mudança indica aceitação. Dúvidas:{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Foro: Curitiba/PR.
      </p>
    </LegalLayout>
  );
}