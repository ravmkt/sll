import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md border-t-4 border-[#fd8539]">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Painel de Controle SLL</h1>
        <p className="text-gray-600 mb-8">
          Autenticado como: <span className="font-semibold">{user?.email}</span>
        </p>
        <button
          onClick={signOut}
          className="bg-[#fd8539] hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}
