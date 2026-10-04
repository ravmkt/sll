export function AppFooter() {
  return (
    <footer className="mt-auto w-full py-4 px-6 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 bg-white">
      <span>&copy; {new Date().getFullYear()} SLL. Todos os direitos reservados.</span>
      <div className="flex items-center gap-1.5">
        <span>DESENVOLVIDO POR:</span>
        <span className="font-bold text-slate-600">RAV Marketing e Treinamento LTDA</span>
      </div>
    </footer>
  );
}

export default AppFooter;