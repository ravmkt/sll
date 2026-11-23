import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export const NF_XML_BUCKET = 'nf-xml';
export const NF_XML_MAX_MB = 2;
const PREFIX = `storage:${NF_XML_BUCKET}/`;

/** xml_url guarda "storage:nf-xml/<caminho>" quando o arquivo foi enviado; senão é um link externo. */
export const isStoredXml = (ref: string | null | undefined) => !!ref && ref.startsWith(PREFIX);

export interface NfeXmlInfo {
  accessKey: string;
  serie: string;
  number: string;
  issued: string;
  recipientName: string;
  recipientDocument: string;
  total: string;
}

export function validateXmlFile(file: File): string | null {
  if (!/\.xml$/i.test(file.name)) return 'Formato não aceito. Envie um arquivo .xml.';
  if (file.size === 0) return 'O arquivo está vazio.';
  if (file.size > NF_XML_MAX_MB * 1024 * 1024) return `Arquivo muito grande. O máximo é ${NF_XML_MAX_MB} MB.`;
  return null;
}

const digits = (s: string) => s.replace(/\D/g, '');

/** Lê os dados de uma NF-e. Lança erro se o XML for inválido; devolve null se não for uma NF-e reconhecível. */
export function parseNfeXml(text: string): NfeXmlInfo | null {
  const doc = new DOMParser().parseFromString(text.replace(/^\uFEFF/, ''), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('XML inválido ou corrompido.');

  const first = (root: Document | Element | undefined, tag: string) =>
    root?.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

  const inf = doc.getElementsByTagName('infNFe')[0];
  const ide = doc.getElementsByTagName('ide')[0];
  const number = first(ide, 'nNF');
  if (!inf && !number) return null;

  const fromId = digits(inf?.getAttribute('Id') ?? '');
  const fromProt = digits(first(doc, 'chNFe'));
  const accessKey = fromId.length === 44 ? fromId : fromProt.length === 44 ? fromProt : '';

  const dest = doc.getElementsByTagName('dest')[0];
  const dh = first(ide, 'dhEmi') || first(ide, 'dEmi');
  const vNF = first(doc.getElementsByTagName('ICMSTot')[0], 'vNF');

  return {
    accessKey,
    serie: first(ide, 'serie'),
    number,
    issued: /^\d{4}-\d{2}-\d{2}/.test(dh) ? dh.slice(0, 10) : '',
    recipientName: first(dest, 'xNome'),
    recipientDocument: first(dest, 'CNPJ') || first(dest, 'CPF'),
    total: vNF ? vNF.replace('.', ',') : '',
  };
}

/** Envia o XML e devolve a referência para gravar em xml_url. */
export async function uploadNfXml(storeId: string, file: File): Promise<string> {
  const path = `${storeId}/${crypto.randomUUID()}.xml`;
  const { error } = await sb.storage.from(NF_XML_BUCKET).upload(path, file, { contentType: 'application/xml', upsert: false });
  if (error) throw new Error('Falha ao enviar o XML: ' + error.message);
  return PREFIX + path;
}

/** Remove um XML enviado (usado quando o registro da nota falha depois do upload). */
export async function removeNfXml(ref: string): Promise<void> {
  if (!isStoredXml(ref)) return;
  try { await sb.storage.from(NF_XML_BUCKET).remove([ref.slice(PREFIX.length)]); } catch { /* sem efeito */ }
}

/** Link temporário (5 min) para baixar o XML guardado; links externos voltam como estão. */
export async function nfXmlDownloadUrl(ref: string): Promise<string> {
  if (!isStoredXml(ref)) return ref;
  const { data, error } = await sb.storage.from(NF_XML_BUCKET).createSignedUrl(ref.slice(PREFIX.length), 300, { download: 'nota-fiscal.xml' });
  if (error || !data?.signedUrl) throw new Error('Não foi possível gerar o link do XML.');
  return data.signedUrl as string;
}