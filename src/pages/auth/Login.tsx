import { useState, type FormEvent } from 'react';
// TODO: Em breve importaremos o useAuth do Supabase aqui

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulação temporária - Integraremos com o Supabase na próxima etapa
    console.log('Tentativa de autenticação:', { email, password, isLogin });
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border-t-4 border-[#0094eb]">
        
        {/* Cabeçalho e Logo */}
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
            <span className="text-[#0094eb]">Sistema</span> Loja Lucrativa
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Acesse o seu Hub Central' : 'Crie sua conta de Lojista'}
          </p>
        </div>
        
        {/* Formulário */}
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-mail profissional
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#0094eb] focus:border-[#0094eb] sm:text-sm"
                placeholder="voce@sualoja.com.br"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#0094eb] focus:border-[#0094eb] sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0094eb] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0094eb] transition-colors disabled:opacity-70"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar no SLL' : 'Criar minha conta')}
            </button>
          </div>
        </form>

        {/* Alternador de Modo (Login/Cadastro) */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-semibold text-[#fd8539] hover:text-orange-600 transition-colors"
          >
            {isLogin 
              ? 'Ainda não é cliente? Cadastre-se' 
              : 'Já possui uma conta? Faça login'}
          </button>
        </div>

      </div>
    </div>
  );
}
