# AI RULES - Sistema Loja Lucrativa (SLL)

## Tech Stack (Tecnologias Oficiais)
- **Framework Base:** Dyad (Next.js / React)
- **Banco de Dados & Autenticação:** Supabase
- **Estilização e UI:** Tailwind CSS
- **Versionamento:** GitHub
- **Hospedagem e Deploy:** Vercel

## Regras de Arquitetura e Bibliotecas
1. **Banco Centralizado:** Todos os módulos do ecossistema compartilham O MESMO banco de dados no Supabase. Nunca crie bancos isolados.
2. **Cadastro e Auth Únicos:** O gerenciamento de contas, lojas e assinaturas ocorre APENAS no Hub Central (SLL).
3. **Identidade Visual SLL:** É obrigatório o uso das cores primárias Azul (#0094eb) e Laranja (#fd8539) em todos os módulos.
4. **Escalabilidade:** O código deve ser modular. O Hub (SLL) vai hospedar dezenas de mini-apps (PDV, Checkout, Marketing, etc), todos conversando com a mesma base de dados.
5. **Variáveis de Ambiente:** Utilizar sempre .env.local para desenvolvimento e configurar as mesmas variáveis no painel da Vercel.
