import { baseStyle, cardFrame, delay, esc, monoWidth, svgOpen } from "./svg.mjs";

const CHIP_H = 34;
const CHIP_FONT = 14;
const CHIP_PAD_X = 13;
const GAP_X = 8;
const GAP_Y = 10;
const LEARNING_SUFFIX = " · learning";

// Wide cards put the group label in a left column; narrow cards put it above the chips.
const GEOMETRY = {
  wide: { labelW: 196, top: 40, groupGap: 40, labelGap: 0 },
  narrow: { labelW: 0, top: 30, groupGap: 34, labelGap: 18 },
};

// Places chips left to right and wraps them inside [x0, maxX].
function layoutChips(chips, x0, maxX) {
  const placed = [];
  let x = x0;
  let row = 0;
  for (const chip of chips) {
    const w = Math.ceil(monoWidth(chip.label, CHIP_FONT) + CHIP_PAD_X * 2);
    if (x > x0 && x + w > maxX) {
      x = x0;
      row += 1;
    }
    placed.push({ ...chip, x, row, w });
    x += w + GAP_X;
  }
  return { placed, rows: row + 1 };
}

function chipSvg(chip, cy, t) {
  const textX = chip.x + chip.w / 2;
  const textY = cy + CHIP_H / 2 + 5;
  if (chip.learning) {
    return `<rect x="${chip.x + 0.5}" y="${cy + 0.5}" width="${chip.w - 1}" height="${CHIP_H - 1}" rx="${CHIP_H / 2}" fill="none" stroke="${t.subtle}" stroke-opacity="0.6" stroke-dasharray="4 4"/>
      <text class="mono" x="${textX}" y="${textY}" font-size="${CHIP_FONT}" text-anchor="middle" fill="${t.muted}">${esc(chip.name)}<tspan fill="${t.subtle}">${esc(LEARNING_SUFFIX)}</tspan></text>`;
  }
  return `<rect x="${chip.x + 0.5}" y="${cy + 0.5}" width="${chip.w - 1}" height="${CHIP_H - 1}" rx="${CHIP_H / 2}" fill="${t.surface2}" stroke="${t.line}"/>
      <text class="mono" x="${textX}" y="${textY}" font-size="${CHIP_FONT}" text-anchor="middle" fill="${t.fg}">${esc(chip.label)}</text>`;
}

export function renderStack(cfg, t, L) {
  const g = GEOMETRY[L.name];
  const { W, pad } = L;
  const x0 = pad + g.labelW;
  const maxX = W - pad;
  let y = g.top;
  let n = 0;
  const parts = [];

  cfg.stack.forEach((group, gi) => {
    const chips = [
      ...group.items.map((label) => ({ label, learning: false })),
      ...(group.learning ?? []).map((name) => ({ label: name + LEARNING_SUFFIX, name, learning: true })),
    ];
    const { placed, rows } = layoutChips(chips, x0, maxX);
    const label = esc(group.title.toUpperCase());

    if (L.narrow) {
      parts.push(`<text class="mono fade" ${delay(gi * 0.06)} x="${pad}" y="${y + 4}" font-size="12" letter-spacing="2" fill="${t.subtle}">${label}</text>`);
      y += g.labelGap;
    } else {
      parts.push(`<text class="mono fade" ${delay(gi * 0.06)} x="${pad}" y="${y + CHIP_H / 2 + 4.5}" font-size="12.5" letter-spacing="2" fill="${t.subtle}">${label}</text>`);
    }

    for (const chip of placed) {
      parts.push(`<g class="rise" ${delay(0.05 + n * 0.022)}>
      ${chipSvg(chip, y + chip.row * (CHIP_H + GAP_Y), t)}
    </g>`);
      n += 1;
    }

    y += rows * CHIP_H + (rows - 1) * GAP_Y;
    if (gi < cfg.stack.length - 1) {
      parts.push(`<rect x="${pad}" y="${y + g.groupGap / 2}" width="${W - pad * 2}" height="1" fill="${t.line}"/>`);
      y += g.groupGap;
    }
  });

  const H = y + g.top;
  const summary = cfg.stack
    .map((grp) => `${grp.title}: ${[...grp.items, ...(grp.learning ?? []).map((l) => `${l} (learning)`)].join(", ")}`)
    .join(". ");

  return `${svgOpen(W, H, "Tech stack", summary)}
  <style>${baseStyle(t)}
  </style>
  <rect width="${W}" height="${H}" rx="18" fill="${t.bg}"/>
  ${cardFrame(W, H, t)}
  ${parts.join("\n  ")}
</svg>
`;
}
