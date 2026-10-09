import { Link } from "react-router-dom";
import LegalLayout from "./LegalLayout";

export default function AboutPage() {
  return (
    <LegalLayout title="SLL Hub">
      <p>
        O SLL Hub é uma plataforma para lojistas de e-commerce aumentarem vendas e lucro. Operado por RAV Marketing e Treinamento LTDA, CNPJ 62.894.336/0001-00. Reunimos
        em um só lugar ferramentas que se integram à sua loja (Shopify, Nuvemshop, Yampi e outras)
        por meio de um script simples ou do Google Tag Manager.
      </p>
      <h2 className="text-xl font-semibold mt-8 mb-2">O que você pode fazer</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li><strong>Vidlytics:</strong> vídeos interativos, stories, carrosséis e widgets com produtos e analytics de reprodução, cliques e conversão.</li>
        <li><strong>Live Commerce:</strong> transmissões ao vivo com chat e produtos vinculados ao catálogo.</li>
        <li><strong>Métricas:</strong> painéis para acompanhar o desempenho dos vídeos e das lives na sua loja.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">Por que pedimos login com Google</h2>
      <p>
        Usamos o login com Google apenas para identificar sua conta no SLL Hub, com seu nome, e-mail
        e foto de perfil. Veja a{" "}
        <Link className="underline" to="/privacidade">Política de Privacidade</Link> e os{" "}
        <Link className="underline" to="/termos">Termos de Serviço</Link>.
      </p>
      <p>
        <Link className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground" to="/">
          Acessar minha conta
        </Link>
      </p>
    </LegalLayout>
  );
}