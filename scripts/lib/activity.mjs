import { baseStyle, cardFrame, delay, esc, fmt, svgOpen } from "./svg.mjs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GAP = 3;

// Wide: four stats in a row and the full year. Narrow: a 2×2 grid and the last 26 weeks.
const GEOMETRY = {
  wide: { headY: 56, statCols: 4, statTop: 124, statRowH: 0, numSize: 46, divider: 204, heatTop: 246, weeks: 53, maxStep: 15, langCols: 3 },
  narrow: { headY: 48, statCols: 2, statTop: 112, statRowH: 104, numSize: 40, divider: 292, heatTop: 330, weeks: 26, maxStep: 16, langCols: 2 },
};

function statBlock(x, y, g, value, label, sub, t, i) {
  return `<g class="rise" ${delay(0.06 + i * 0.07)}>
    <text class="sans" x="${x}" y="${y}" font-size="${g.numSize}" font-weight="750" letter-spacing="-1.5" fill="${t.fg}">${esc(value)}</text>
    <text class="sans" x="${x}" y="${y + 30}" font-size="16" fill="${t.muted}">${esc(label)}</text>
    <text class="mono" x="${x}" y="${y + 52}" font-size="12" letter-spacing="0.5" fill="${t.subtle}">${esc(sub)}</text>
  </g>`;
}

function heatmap(allWeeks, g, L, t) {
  const { W, pad } = L;
  const weeks = allWeeks.slice(-g.weeks);
  const inner = W - pad * 2;
  const step = Math.min(g.maxStep, Math.floor((inner + GAP) / weeks.length));
  const cell = step - GAP;
  const top = g.heatTop;
  const cols = [];
  const labels = [];
  let lastLabelCol = -10;
  let lastMonth = null;

  weeks.forEach((week, wi) => {
    const x = pad + wi * step;
    const month = new Date(`${week[0].date}T12:00:00Z`).getUTCMonth();
    // Label a column when its month starts, skipping labels that would collide with the previous one.
    if (month !== lastMonth && wi - lastLabelCol >= 3 && !(wi === 0 && new Date(`${week[0].date}T12:00:00Z`).getUTCDate() > 14)) {
      labels.push(`<text class="mono" x="${x}" y="${top - 10}" font-size="12" fill="${t.subtle}">${MONTHS[month]}</text>`);
      lastLabelCol = wi;
    }
    lastMonth = month;
    const rects = week.map((d) => {
      const dow = new Date(`${d.date}T12:00:00Z`).getUTCDay();
      const plural = d.count === 1 ? "contribution" : "contributions";
      return `<rect x="${x}" y="${top + dow * step}" width="${cell}" height="${cell}" rx="2.5" fill="${t.heat[Math.max(0, d.level)]}"><title>${d.count} ${plural} on ${d.date}</title></rect>`;
    });
    cols.push(`<g class="fade" ${delay(0.3 + wi * 0.012)}>${rects.join("")}</g>`);
  });

  const height = 7 * step - GAP;
  const legendY = top + height + 26;
  const legendX = W - pad - 5 * 15 - 40;
  const legend = [
    `<text class="mono" x="${legendX - 8}" y="${legendY}" font-size="12" text-anchor="end" fill="${t.subtle}">less</text>`,
    ...t.heat.map((c, i) => `<rect x="${legendX + i * 15}" y="${legendY - 10}" width="12" height="12" rx="2.5" fill="${c}"/>`),
    `<text class="mono" x="${legendX + 5 * 15 + 5}" y="${legendY}" font-size="12" fill="${t.subtle}">more</text>`,
  ];

  return { svg: [...labels, ...cols, ...legend].join("\n  "), bottom: legendY };
}

function languages(langs, top, repoLabel, g, L, t) {
  const { W, pad } = L;
  const inner = W - pad * 2;
  const parts = [
    `<text class="mono fade" ${delay(0.5)} x="${pad}" y="${top}" font-size="12.5" letter-spacing="2" fill="${t.subtle}">LANGUAGES</text>`,
    `<text class="mono fade" ${delay(0.5)} x="${W - pad}" y="${top}" font-size="12" text-anchor="end" fill="${t.subtle}">${esc(repoLabel)}</text>`,
  ];
  if (langs.length === 0) return { svg: parts.join("\n  "), bottom: top };

  const barY = top + 18;
  const segGap = 3;
  const usable = inner - segGap * (langs.length - 1);
  let x = pad;
  const segs = langs.map((l) => {
    const w = Math.max(2, l.share * usable);
    const r = `<rect x="${x.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="10" rx="3" fill="${l.color ?? t.subtle}"/>`;
    x += w + segGap;
    return r;
  });
  parts.push(`<g class="grow" ${delay(0.55)}>${segs.join("")}</g>`);

  const colW = inner / g.langCols;
  langs.forEach((l, i) => {
    const cx = pad + (i % g.langCols) * colW;
    const cy = barY + 48 + Math.floor(i / g.langCols) * 28;
    parts.push(`<g class="rise" ${delay(0.65 + i * 0.05)}>
    <circle cx="${cx + 5}" cy="${cy - 5}" r="5" fill="${l.color ?? t.subtle}"/>
    <text class="sans" x="${cx + 18}" y="${cy}" font-size="15" fill="${t.fg}">${esc(l.name)} <tspan class="mono" font-size="13" fill="${t.subtle}">${(l.share * 100).toFixed(1)}%</tspan></text>
  </g>`);
  });
  const rows = Math.ceil(langs.length / g.langCols);
  return { svg: parts.join("\n  "), bottom: barY + 48 + (rows - 1) * 28 };
}

export function renderActivity(data, cfg, t, L) {
  const g = GEOMETRY[L.name];
  const { W, pad } = L;
  const updated = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: cfg.timezone }).format(data.now);
  const colW = (W - pad * 2) / g.statCols;
  const longest = data.streak.longest === 1 ? "1 day" : `${fmt(data.streak.longest)} days`;

  const stats = [
    [fmt(data.contributions), "contributions", "last 12 months"],
    [fmt(data.commits), "commits", `in ${data.year}`],
    [fmt(data.pullRequests), "pull requests", `in ${data.year}`],
    [fmt(data.streak.current), "day streak", `longest ${longest}`],
  ].map(([value, label, sub], i) => {
    const x = pad + (i % g.statCols) * colW;
    const y = g.statTop + Math.floor(i / g.statCols) * g.statRowH;
    return statBlock(x, y, g, value, label, sub, t, i);
  });

  const heat = heatmap(data.weeks, g, L, t);
  const scope = data.includePrivate ? "repositories" : "public repositories";
  const repos = `${data.repoCount} ${data.repoCount === 1 ? scope.replace(/ies$/, "y") : scope}`;
  const repoLabel = L.narrow ? repos : `by code size · ${repos}`;
  const langs = languages(data.languages, heat.bottom + 54, repoLabel, g, L, t);
  const H = langs.bottom + 44;

  const desc = [
    `${data.contributions} contributions in the last 12 months`,
    `${data.commits} commits and ${data.pullRequests} pull requests in ${data.year}`,
    `current streak ${data.streak.current} ${data.streak.current === 1 ? "day" : "days"}, longest ${longest}`,
    `top languages: ${data.languages.map((l) => `${l.name} ${(l.share * 100).toFixed(1)}%`).join(", ")}`,
    `updated ${updated}`,
  ].join("; ");

  const handle = L.narrow ? `@${data.login.toUpperCase()}` : `ACTIVITY · @${data.login.toUpperCase()}`;

  return `${svgOpen(W, H, `GitHub activity of @${data.login}`, desc)}
  <style>${baseStyle(t)}
    .grow { animation: grow 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both; transform-origin: ${pad}px 0; }
    @keyframes grow { from { transform: scaleX(0); } }
  </style>
  <rect width="${W}" height="${H}" rx="18" fill="${t.bg}"/>
  ${cardFrame(W, H, t)}

  <text class="mono fade" x="${pad}" y="${g.headY}" font-size="12.5" letter-spacing="2" fill="${t.subtle}">${esc(handle)}</text>
  <text class="mono fade" x="${W - pad}" y="${g.headY}" font-size="12" text-anchor="end" fill="${t.subtle}">updated ${esc(updated)}</text>

  ${stats.join("\n  ")}

  <rect x="${pad}" y="${g.divider}" width="${W - pad * 2}" height="1" fill="${t.line}"/>

  ${heat.svg}

  ${langs.svg}
</svg>
`;
}
