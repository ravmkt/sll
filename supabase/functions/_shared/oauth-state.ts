const enc = new TextEncoder();

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

export type OAuthState = { s: string; u: string; exp: number; n: string };

export async function createState(storeId: string, userId: string, secret: string, ttlMs = 10 * 60 * 1000): Promise<string> {
  const payload: OAuthState = { s: storeId, u: userId, exp: Date.now() + ttlMs, n: crypto.randomUUID() };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${await sign(body, secret)}`;
}

export async function verifyState(state: string, secret: string): Promise<OAuthState> {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("State inválido.");
  const expected = await sign(body, secret);
  if (expected.length !== sig.length) throw new Error("Assinatura do state inválida.");
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) throw new Error("Assinatura do state inválida.");
  const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as OAuthState;
  if (!payload.exp || Date.now() > payload.exp) throw new Error("State expirado. Tente conectar novamente.");
  return payload;
}
