// Dibujos del Ahorcado: cada diseño recibe la fase (0 = sin fallos … 8 = último fallo) y devuelve un SVG 200×200.
const L = (x1, y1, x2, y2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
const grupo = (n, fase, actual, html) => (fase >= n ? `<g class="${fase === n && actual ? 'nuevo' : ''}">${html}</g>` : '');
export const TOTAL = 8;
const envolver = html => `<svg viewBox="0 0 200 200" class="ahd" role="img" aria-label="Dibujo del ahorcado">${html}</svg>`;

const clasico = (f, nuevo) => envolver(`<g fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  ${grupo(1, f, nuevo, L(20, 185, 110, 185))}${grupo(2, f, nuevo, L(45, 185, 45, 20))}${grupo(3, f, nuevo, L(45, 20, 140, 20) + L(45, 48, 73, 20))}
  ${grupo(4, f, nuevo, L(140, 20, 140, 52, 'stroke-width="3"'))}
  ${grupo(5, f, nuevo, `<circle cx="140" cy="68" r="16" fill="var(--card)"/>` + (f >= 8 ? '<path d="M133 64l5 5m0-5l-5 5M142 64l5 5m0-5l-5 5M133 78q7-6 14 0" stroke-width="2.5"/>' : '<circle cx="135" cy="65" r="1.6" fill="var(--ink)" stroke="none"/><circle cx="145" cy="65" r="1.6" fill="var(--ink)" stroke="none"/>'))}
  ${grupo(6, f, nuevo, L(140, 84, 140, 130))}${grupo(7, f, nuevo, L(140, 95, 118, 118) + L(140, 95, 162, 118))}${grupo(8, f, nuevo, L(140, 130, 122, 162) + L(140, 130, 158, 162))}</g>`);

const robot = (f, nuevo) => envolver(`<g stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
  ${grupo(1, f, nuevo, `<rect x="55" y="165" width="90" height="16" rx="8" fill="#8A93B8"/><circle cx="72" cy="181" r="9" fill="var(--ink)"/><circle cx="128" cy="181" r="9" fill="var(--ink)"/>`)}
  ${grupo(2, f, nuevo, `<rect x="65" y="100" width="70" height="65" rx="10" fill="var(--tb-acc)"/><circle cx="100" cy="132" r="9" fill="var(--yel)"/>`)}
  ${grupo(3, f, nuevo, `<rect x="70" y="52" width="60" height="46" rx="12" fill="#C9D3F0"/>`)}
  ${grupo(4, f, nuevo, f >= 8 ? '<path d="M82 66l10 10m0-10l-10 10M108 66l10 10m0-10l-10 10" stroke="var(--red)" fill="none"/>' : '<circle cx="87" cy="72" r="7" fill="var(--card)"/><circle cx="113" cy="72" r="7" fill="var(--card)"/><circle cx="87" cy="72" r="3" fill="var(--ink)"/><circle cx="113" cy="72" r="3" fill="var(--ink)"/>')}
  ${grupo(5, f, nuevo, `<line x1="100" y1="52" x2="100" y2="30" fill="none"/><circle cx="100" cy="26" r="6" fill="var(--red)"/>`)}
  ${grupo(6, f, nuevo, `<rect x="36" y="104" width="22" height="44" rx="8" fill="#8A93B8"/><rect x="142" y="104" width="22" height="44" rx="8" fill="#8A93B8"/>`)}
  ${grupo(7, f, nuevo, `<path d="M84 90h32" fill="none"/>`)}
  ${grupo(8, f, nuevo, `<path d="M95 112l-8 12h12l-8 14M130 36l8-10M70 36l-8-10M100 8v-6" fill="none" stroke="var(--yel)" stroke-width="5"/>`)}</g>`);

const COLORES = ['#FF4757', '#FF9F1C', '#FFD60A', '#2ED573', '#12CBC4', '#2F6BFF', '#8B5CF6', '#FF4FA3'];
const globos = (f, nuevo) => {
  const restantes = TOTAL - f; let h = '';
  for (let k = 0; k < TOTAL; k++) if (k < restantes) { const x = 30 + k * 20, y = 38 + (k % 2) * 16; h += `<g><line x1="${x}" y1="${y + 20}" x2="100" y2="${f >= TOTAL ? 150 : 120}" stroke="var(--mut)" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="13" ry="17" fill="${COLORES[k]}" stroke="var(--ink)" stroke-width="2.5"/></g>`; }
  const baja = f >= TOTAL ? 40 : 0;
  return envolver(`${h}<g transform="translate(0 ${baja})" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="78" y="120" width="44" height="30" rx="6" fill="#C98F53"/><circle cx="100" cy="106" r="11" fill="var(--card)"/>${f >= TOTAL ? '<path d="M95 104l4 4m0-4l-4 4M101 104l4 4m0-4l-4 4" stroke-width="2" fill="none"/>' : '<circle cx="96" cy="104" r="1.5" fill="var(--ink)" stroke="none"/><circle cx="104" cy="104" r="1.5" fill="var(--ink)" stroke="none"/><path d="M96 111q4 3 8 0" fill="none" stroke-width="2"/>'}</g>${f >= TOTAL ? '<text x="100" y="190" text-anchor="middle" font-size="16" fill="var(--ink)">¡Plof!</text>' : ''}`);
};
const flor = (f, nuevo) => {
  const restantes = TOTAL - f; let h = '';
  for (let k = 0; k < restantes; k++) { const a = k * Math.PI * 2 / TOTAL; h += `<ellipse cx="${100 + Math.cos(a) * 30}" cy="${70 + Math.sin(a) * 30}" rx="17" ry="11" transform="rotate(${a * 180 / Math.PI} ${100 + Math.cos(a) * 30} ${70 + Math.sin(a) * 30})" fill="${f >= 6 ? '#B79BFF' : '#FF8FD0'}" stroke="var(--ink)" stroke-width="2.5"/>`; }
  const caida = []; for (let k = restantes; k < TOTAL; k++) caida.push(`<ellipse cx="${40 + (k - restantes) * 22}" cy="${184 - (k % 2) * 5}" rx="12" ry="7" fill="#FF8FD0" stroke="var(--ink)" stroke-width="2" opacity=".7"/>`);
  return envolver(`<path d="M100 100 Q96 140 100 188" stroke="#2E9E5B" stroke-width="7" fill="none" stroke-linecap="round" ${f >= 7 ? 'transform="rotate(8 100 188)"' : ''}/><path d="M100 150q-28-4-36-26q26 0 36 26z" fill="#2E9E5B" stroke="var(--ink)" stroke-width="2.5"/>${h}<circle cx="100" cy="70" r="16" fill="#FFC21A" stroke="var(--ink)" stroke-width="3"/>${f >= TOTAL ? '<path d="M93 66l5 5m0-5l-5 5M102 66l5 5m0-5l-5 5" stroke="var(--ink)" stroke-width="2" fill="none"/>' : '<circle cx="95" cy="67" r="2" fill="var(--ink)"/><circle cx="105" cy="67" r="2" fill="var(--ink)"/><path d="M94 75q6 5 12 0" stroke="var(--ink)" stroke-width="2" fill="none"/>'}${caida.join('')}`);
};
export const DISENOS = { clasico: { nombre: 'Clásico', svg: clasico }, robot: { nombre: 'Robot', svg: robot }, globos: { nombre: 'Globos', svg: globos }, flor: { nombre: 'Flor', svg: flor } };
