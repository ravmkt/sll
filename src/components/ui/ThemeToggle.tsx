import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_KEY = 'sll-theme';

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch {
    /* armazenamento indisponivel */
  }
}

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Alternar tema"
      title={dark ? 'Modo escuro' : 'Modo claro'}
      onClick={() => applyTheme(!dark)}
      className="relative h-7 w-14 shrink-0 cursor-pointer rounded-full bg-slate-200 transition-colors dark:bg-[#fd8539]"
    >
      <Sun className="absolute left-[7px] top-[7px] h-3.5 w-3.5 text-slate-400 dark:text-white" />
      <Moon className="absolute right-[7px] top-[7px] h-3.5 w-3.5 text-slate-400 dark:text-white" />
      <span
        className={`absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
          dark ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {dark ? (
          <Moon className="h-3 w-3 text-[#fd8539]" />
        ) : (
          <Sun className="h-3 w-3 text-[#0094eb]" />
        )}
      </span>
    </button>
  );
}