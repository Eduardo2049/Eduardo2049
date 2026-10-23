import { baseStyle, cardFrame, delay, esc, sansWidth, svgOpen, wrap } from "./svg.mjs";

// Positions for each layout. The narrow card stacks the name on two lines and wraps the tagline.
const GEOMETRY = {
  wide: {
    H: 320,
    blobs: [[760, 60, 270], [880, 290, 230], [600, 330, 210]],
    nameSize: 76,
    nameLines: [164],
    gradX: [330, 620],
    roleY: 206,
    roleSize: 16,
    taglineY: 242,
    taglineSize: 19,
    taglineChars: 80,
    pillY: 258,
  },
  narrow: {
    H: 384,
    blobs: [[430, 30, 230], [500, 300, 200], [250, 420, 190]],
    nameSize: 66,
    nameLines: [132, 196],
    gradX: [28, 250],
    roleY: 236,
    roleSize: 14,
    taglineY: 270,
    taglineSize: 17,
    taglineChars: 40,
    pillY: 318,
  },
};

export function renderHeader(cfg, t, L) {
  const g = GEOMETRY[L.name];
  const { W, pad } = L;
  const { H } = g;
  const [first, ...restParts] = cfg.name.split(" ");
  const rest = restParts.join(" ");
  const pillText = `Now: ${cfg.now}`;
  const pillW = Math.ceil(sansWidth(pillText, 14) + 52);
  const tx = pad + 4;

  const name =
    g.nameLines.length === 1
      ? `<text class="sans rise" ${delay(0.08)} x="${pad}" y="${g.nameLines[0]}" font-size="${g.nameSize}" font-weight="800" letter-spacing="-3"><tspan fill="${t.fg}">${esc(first)}</tspan> <tspan fill="url(#name)">${esc(rest)}</tspan></text>`
      : `<text class="sans rise" ${delay(0.08)} x="${pad}" y="${g.nameLines[0]}" font-size="${g.nameSize}" font-weight="800" letter-spacing="-2.5" fill="${t.fg}">${esc(first)}</text>
  <text class="sans rise" ${delay(0.14)} x="${pad}" y="${g.nameLines[1]}" font-size="${g.nameSize}" font-weight="800" letter-spacing="-2.5" fill="url(#name)">${esc(rest)}</text>`;

  const tagline = wrap(cfg.tagline, g.taglineChars)
    .map(
      (line, i) =>
        `<text class="sans rise" ${delay(0.26 + i * 0.04)} x="${tx}" y="${g.taglineY + i * (g.taglineSize + 7)}" font-size="${g.taglineSize}" fill="${t.muted}">${esc(line)}</text>`,
    )
    .join("\n  ");

  const blobs = g.blobs
    .map(([cx, cy, r], i) => `<g class="blob b${i + 1}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g${i + 1})"/></g>`)
    .join("\n    ");

  return `${svgOpen(W, H, `${cfg.name}, ${cfg.role}`, `${cfg.role} based in ${cfg.location}. ${cfg.tagline} ${pillText}.`)}
  <style>${baseStyle(t)}
    .blob { animation: drift 19s ease-in-out infinite alternate; }
    .b2 { animation-duration: 25s; animation-direction: alternate-reverse; }
    .b3 { animation-duration: 31s; }
    @keyframes drift { to { transform: translate(-${Math.round(W * 0.08)}px, 36px); } }
    .pulse { animation: pulse 2.6s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes pulse { from { opacity: 0.55; transform: scale(1); } to { opacity: 0; transform: scale(2.8); } }
  </style>
  <defs>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <radialGradient id="g1"><stop offset="0" stop-color="${t.accent}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2"><stop offset="0" stop-color="${t.accent2}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${t.accent2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g3"><stop offset="0" stop-color="#9f1239" stop-opacity="${(t.glow * 0.8).toFixed(2)}"/><stop offset="1" stop-color="#9f1239" stop-opacity="0"/></radialGradient>
    <linearGradient id="name" gradientUnits="userSpaceOnUse" x1="${g.gradX[0]}" y1="0" x2="${g.gradX[1]}" y2="0">
      <stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accent2}"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="${t.line}"/></pattern>
    <linearGradient id="fadeR" x1="0" x2="1"><stop offset="0.35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <mask id="dotsMask"><rect width="${W}" height="${H}" fill="url(#fadeR)"/></mask>
  </defs>

  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#dots)" mask="url(#dotsMask)"/>
    ${blobs}
  </g>
  ${cardFrame(W, H, t)}

  <text class="mono rise" x="${tx}" y="${L.narrow ? 52 : 62}" font-size="${L.narrow ? 12 : 13}" letter-spacing="2.5" fill="${t.subtle}">${esc(cfg.location.toUpperCase())}</text>
  <text class="mono rise" x="${W - tx}" y="${L.narrow ? 52 : 62}" font-size="${L.narrow ? 12 : 13}" letter-spacing="1" text-anchor="end" fill="${t.muted}">${esc(cfg.site)}</text>

  ${name}
  <text class="mono rise" ${delay(0.18)} x="${tx}" y="${g.roleY}" font-size="${g.roleSize}" letter-spacing="2.5" fill="${t.accentText}">${esc(cfg.role.toUpperCase())}</text>
  ${tagline}

  <g class="rise" ${delay(0.36)}>
    <rect x="${tx}" y="${g.pillY}" width="${pillW}" height="34" rx="17" fill="${t.surface}" fill-opacity="0.85" stroke="${t.line}"/>
    <circle class="pulse" cx="${tx + 19}" cy="${g.pillY + 17}" r="4" fill="${t.success}"/>
    <circle cx="${tx + 19}" cy="${g.pillY + 17}" r="4" fill="${t.success}"/>
    <text class="sans" x="${tx + 34}" y="${g.pillY + 22}" font-size="14" fill="${t.fg}">${esc(pillText)}</text>
  </g>
</svg>
`;
}
