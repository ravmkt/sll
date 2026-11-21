import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baselineFile = path.join(root, "scripts", "visual-baseline.json");
const update = process.argv.includes("--update");

const IGNORAR = [/styles[\\/]tokens\.css$/, /components[\\/]sll[\\/]/, /[\\/]index\.css$/];

const REGRAS = [
  { nome: "cor hex fixa (use var(--sll-*))", re: /#[0-9a-fA-F]{6}\b/g },
  { nome: "azul/sky do Tailwind (use var(--sll-primary))", re: /\b(?:bg|text|border|ring|from|to)-(?:sky|blue)-\d{2,3}\b/g },
  {
    nome: "logo fora do padrao (use <SllLogo />)",
    re: /<img\b[^>]*>/gs,
    filtro: (t) => /logo/i.test(t) && /\b(?:h|w|max-w|min-w)-(?:\d|\[)/.test(t),
  },
];

function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listar(p);
    return /\.(tsx?|css)$/.test(e.name) ? [p] : [];
  });
}

const atual = {};
for (const f of listar(path.join(root, "src"))) {
  if (IGNORAR.some((r) => r.test(f))) continue;
  const txt = fs.readFileSync(f, "utf8");
  const rel = path.relative(root, f).replace(/\\/g, "/");
  for (const r of REGRAS) {
    let n = 0;
    for (const m of txt.matchAll(r.re)) if (!r.filtro || r.filtro(m[0])) n++;
    if (n > 0) atual[`${rel}|${r.nome}`] = n;
  }
}

if (update || !fs.existsSync(baselineFile)) {
  fs.writeFileSync(baselineFile, JSON.stringify(atual, null, 2));
  console.log(`check:visual - linha de base gravada (${Object.keys(atual).length} itens legados).`);
  process.exit(0);
}

const base = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
const erros = Object.entries(atual).filter(([k, n]) => n > (base[k] ?? 0));
const total = Object.values(atual).reduce((a, b) => a + b, 0);
const totalBase = Object.values(base).reduce((a, b) => a + b, 0);

if (erros.length) {
  console.error("check:visual FALHOU - violacoes novas de identidade visual:");
  for (const [k, n] of erros) {
    const [arq, regra] = k.split("|");
    console.error(`  ${arq}: ${regra} (${base[k] ?? 0} -> ${n})`);
  }
  process.exit(1);
}
console.log(`check:visual OK - legado: ${total} (linha de base: ${totalBase}). Meta: levar a 0.`);