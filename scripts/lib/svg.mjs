// Shared tokens and helpers for the profile cards. Palette mirrors eduardof.dev.

// Each card is drawn twice: "wide" for desktop and "narrow" for phones (picked in the README with <picture media>).
export const layouts = {
  wide: { name: "wide", W: 880, pad: 44, narrow: false },
  narrow: { name: "narrow", W: 480, pad: 28, narrow: true },
};

export const themes = {
  dark: {
    bg: "#0b0b0e",
    surface: "#121218",
    surface2: "#1a1a22",
    line: "#262630",
    fg: "#f2f2f6",
    muted: "#b4b4c3",
    subtle: "#8e8ea0",
    accent: "#ef4444",
    accent2: "#f59e0b",
    accentText: "#f87171",
    success: "#6ee7b7",
    // Contribution levels NONE → FOURTH_QUARTILE, as an ember ramp
    heat: ["#1a1a22", "#4a1a1a", "#8c2a1c", "#d1471f", "#f59e0b"],
    glow: 0.5,
  },
  light: {
    bg: "#ffffff",
    surface: "#f6f6f8",
    surface2: "#f0f0f4",
    line: "#e3e3ea",
    fg: "#0b0b0e",
    muted: "#4a4a5a",
    subtle: "#6b6b7d",
    accent: "#dc2626",
    accent2: "#d97706",
    accentText: "#dc2626",
    success: "#059669",
    heat: ["#ececf1", "#fcd5c2", "#f8a17a", "#ea6435", "#c2410c"],
    glow: 0.28,
  },
};

// Images in a README can't load web fonts, so both stacks fall back to the viewer's system fonts.
const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`;

// Monospace glyphs are ~0.6em wide in every common mono font; 0.62 leaves room for the widest ones.
export const monoWidth = (text, size) => text.length * size * 0.62;
// Rough upper bound for proportional text, used only to size containers generously.
export const sansWidth = (text, size) => text.length * size * 0.56;

export const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const fmt = (n) => new Intl.NumberFormat("en-US").format(n);

// Base styles shared by every card. Elements are visible by default; animations only add an entrance,
// so a renderer without CSS animation support still shows the final state.
export const baseStyle = (t) => `
    .sans { font-family: ${SANS}; }
    .mono { font-family: ${MONO}; }
    .rise { animation: rise 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    .fade { animation: fade 0.8s ease-out both; }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } }
    @keyframes fade { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; }
    }`;

export const svgOpen = (w, h, title, desc) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-labelledby="t d">
  <title id="t">${esc(title)}</title>
  <desc id="d">${esc(desc)}</desc>`;

export const cardFrame = (w, h, t) =>
  `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="17.5" fill="none" stroke="${t.line}"/>`;

export const delay = (seconds) => `style="animation-delay:${seconds.toFixed(2)}s"`;

// Greedy word wrap by character count, for short copy on the narrow cards.
export function wrap(text, maxChars) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
