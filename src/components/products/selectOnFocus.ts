import type { FocusEvent, MouseEvent } from 'react';

// Ao focar, seleciona todo o conteudo. O mouseup e bloqueado so uma vez para o navegador nao desfazer a selecao.
export const selectOnFocus = {
  onFocus: (e: FocusEvent<HTMLInputElement>) => {
    e.currentTarget.dataset.fresh = '1';
    e.currentTarget.select();
  },
  onMouseUp: (e: MouseEvent<HTMLInputElement>) => {
    if (e.currentTarget.dataset.fresh === '1') {
      e.preventDefault();
      delete e.currentTarget.dataset.fresh;
    }
  },
  onBlur: (e: FocusEvent<HTMLInputElement>) => {
    delete e.currentTarget.dataset.fresh;
  },
};