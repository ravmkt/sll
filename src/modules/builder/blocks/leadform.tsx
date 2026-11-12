import type { CSSProperties } from 'react';
import type { BlockType } from '../types';
import type { BlockDef, Field } from '../registry-extra';
import { num, safeUrl } from '../styleKit';
import { Css, RCSS, rich, sec, secFields, tcss, tf } from './campaign';
import { glowFields, glowStyle } from '../bg';

const YN = [{ value: '1', label: 'Sim' }, { value: '0', label: 'N\u00e3o' }];
const yn = (key: string, label: string, def: string, group: string): Field => ({ key, label, type: 'select', options: YN, group, def });
const DARK = '#0b0a08';
const AFTER = 'Ap\u00f3s o cadastro';

export const LEADFORM_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
  leadform: {
    label: 'Formul\u00e1rio de cadastro',
    defaults: {
      title: 'Garanta seu acesso antecipado',
      sub: 'Cadastre-se e seja avisado **antes de todo mundo**.',
      btn: 'Quero acesso antecipado',
      success: 'Cadastro realizado! Voc\u00ea receber\u00e1 o aviso em primeira m\u00e3o.',
      askName: '1', askEmail: '1', askWhatsapp: '1',
      coupon: '', vip: '0', vipUrl: '', vipLabel: 'Entrar no grupo VIP',
      successColor: '#f5e6b3', couponColor: '#d4af37', couponBc: '#d4af37', couponBg: '#0b0a08', previewSuccess: '0',
      cardBg: '#14110d', cardBc: '#5c4a1f', radius: '16', cardPad: '24', maxW: '480',
      inputBg: DARK, inputBc: '#5c4a1f', inputColor: '#ffffff',
      btnBg: '#d4af37', btnColor: '#0b0a08', bg: DARK, pad: '16',
    },
    fields: [
      { key: 'title', label: 'T\u00edtulo' },
      { key: 'sub', label: 'Texto de apoio (use **texto** para negrito)', multiline: true },
      { key: 'btn', label: 'Texto do bot\u00e3o' },
      { key: 'success', label: 'Mensagem ap\u00f3s o cadastro', multiline: true },
      yn('askName', 'Pedir nome', '1', 'Campos'),
      yn('askEmail', 'Pedir e-mail', '1', 'Campos'),
      yn('askWhatsapp', 'Pedir WhatsApp', '1', 'Campos'),
      { key: 'coupon', label: 'Cupom exibido ap\u00f3s o cadastro (opcional)', group: AFTER },
      yn('vip', 'Mostrar bot\u00e3o do grupo VIP ap\u00f3s o cadastro', '0', AFTER),
      { key: 'vipUrl', label: 'Link do grupo VIP', group: AFTER },
      { key: 'vipLabel', label: 'Texto do bot\u00e3o do grupo', group: AFTER, def: 'Entrar no grupo VIP' },
      { key: 'successColor', label: 'Sucesso: cor da mensagem', type: 'color', group: AFTER, def: '#f5e6b3' },
      { key: 'couponColor', label: 'Cupom: cor do texto', type: 'color', group: AFTER, def: '#d4af37' },
      { key: 'couponBc', label: 'Cupom: cor da borda', type: 'color', group: AFTER, def: '#d4af37' },
      { key: 'couponBg', label: 'Cupom: cor de fundo', type: 'color', group: AFTER, def: '#0b0a08' },
      yn('previewSuccess', 'Pr\u00e9-visualizar sucesso (s\u00f3 no editor, n\u00e3o aparece publicado)', '0', AFTER),
      { key: 'cardBg', label: 'Card: cor de fundo', type: 'color', group: 'Card', def: '#14110d' },
      { key: 'cardBc', label: 'Card: cor da borda', type: 'color', group: 'Card', def: '#5c4a1f' },
      { key: 'radius', label: 'Card: arredondamento (px)', type: 'number', min: 0, max: 60, group: 'Card', def: '16' },
      { key: 'cardPad', label: 'Card: espa\u00e7o interno (px)', type: 'number', min: 0, max: 80, group: 'Card', def: '24' },
      { key: 'maxW', label: 'Card: largura m\u00e1xima (px)', type: 'number', min: 240, max: 900, group: 'Card', def: '480' },
      { key: 'inputBg', label: 'Campos: cor de fundo', type: 'color', group: 'Campos', def: DARK },
      { key: 'inputBc', label: 'Campos: cor da borda', type: 'color', group: 'Campos', def: '#5c4a1f' },
      { key: 'inputColor', label: 'Campos: cor do texto', type: 'color', group: 'Campos', def: '#ffffff' },
      { key: 'btnBg', label: 'Bot\u00e3o: cor de fundo', type: 'color', group: 'Bot\u00e3o', def: '#d4af37' },
      { key: 'btnColor', label: 'Bot\u00e3o: cor do texto', type: 'color', group: 'Bot\u00e3o', def: '#0b0a08' },
      ...tf('title', 'T\u00edtulo', 22, 19, '#d4af37', 'bold'),
      ...tf('sub', 'Texto de apoio', 15, 14, '#e5e7eb'),
      ...glowFields('Brilho do card'),
      ...secFields('16'),
    ],
    render: (p) => {
      const hasWa = p.askWhatsapp !== '0';
      const hasEmail = p.askEmail !== '0' || !hasWa;
      const hasName = p.askName !== '0';
      const vipUrl = p.vip === '1' && p.vipUrl ? safeUrl(p.vipUrl) : undefined;
      const sc = p.successColor || '#f5e6b3';
      const cc = p.couponColor || '#d4af37';
      const cbc = p.couponBc || '#d4af37';
      const cbg = p.couponBg || '#0b0a08';
      const inp: CSSProperties = {
        width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 10, fontSize: 16, fontFamily: 'inherit',
        border: `1px solid ${p.inputBc || '#5c4a1f'}`, background: p.inputBg || DARK, color: p.inputColor || '#ffffff',
      };
      const btnBg = p.btnBg || '#d4af37';
      const btnColor = p.btnColor || '#0b0a08';
      return (
        <section style={sec(p, 16)}>
          <Css s={RCSS} />
          <div
            style={{
              maxWidth: num(p.maxW, 480), margin: '0 auto', padding: num(p.cardPad, 24), boxSizing: 'border-box', textAlign: 'center',
              background: p.cardBg || '#14110d', border: `1px solid ${p.cardBc || '#5c4a1f'}`, borderRadius: num(p.radius, 16), ...glowStyle(p),
            }}
          >
            {p.title ? (
              <h2 className="sll-r" style={{ margin: '0 0 8px', ...tcss(p, 'title', { s: 22, m: 19, c: '#d4af37', st: 'bold' }) }}>{p.title}</h2>
            ) : null}
            {p.sub ? (
              <p className="sll-r" style={{ margin: '0 0 16px', lineHeight: 1.5, whiteSpace: 'pre-line', ...tcss(p, 'sub', { s: 15, m: 14, c: '#e5e7eb' }) }}>{rich(p.sub)}</p>
            ) : null}
            <form
              data-sll-form="1"
              data-success={p.success || 'Cadastro realizado!'}
              data-sc={sc}
              data-coupon={p.coupon || undefined}
              data-cc={cc}
              data-cbc={cbc}
              data-cbg={cbg}
              data-vip={vipUrl}
              data-vip-label={p.vipLabel || 'Entrar no grupo VIP'}
              onSubmit={(e) => e.preventDefault()}
              style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}
            >
              {hasName ? <input name="name" type="text" placeholder="Seu nome" autoComplete="name" style={inp} /> : null}
              {hasEmail ? <input name="email" type="email" placeholder="Seu e-mail" autoComplete="email" required={!hasWa} style={inp} /> : null}
              {hasWa ? <input name="whatsapp" type="tel" placeholder="Seu WhatsApp" autoComplete="tel" required={!hasEmail} style={inp} /> : null}
              <button
                type="submit"
                style={{ border: 0, cursor: 'pointer', padding: '14px 20px', borderRadius: 10, fontSize: 16, fontWeight: 700, backgroundColor: btnBg, color: btnColor }}
              >
                {p.btn || 'Enviar'}
              </button>
            </form>
            {p.previewSuccess === '1' ? (
              <div data-sll-preview="1" style={{ marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${p.cardBc || '#5c4a1f'}`, textAlign: 'center' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 17, lineHeight: 1.4, color: sc }}>{p.success || 'Cadastro realizado!'}</p>
                {p.coupon ? (
                  <p
                    style={{
                      display: 'inline-block', margin: '0 0 12px', padding: '10px 18px', borderRadius: 10, fontSize: 22, fontWeight: 800,
                      letterSpacing: '.08em', color: cc, background: cbg, border: `2px dashed ${cbc}`,
                    }}
                  >
                    {p.coupon}
                  </p>
                ) : null}
                {vipUrl ? (
                  <span style={{ display: 'block', padding: '14px 20px', borderRadius: 10, fontWeight: 700, background: btnBg, color: btnColor }}>
                    {p.vipLabel || 'Entrar no grupo VIP'}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      );
    },
  },
};