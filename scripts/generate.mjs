#!/usr/bin/env node
// Regenerates the profile cards in assets/ (dark and light variants).
//
//   node scripts/generate.mjs                                  live data; needs GITHUB_TOKEN or PROFILE_TOKEN
//   node scripts/generate.mjs --fixture scripts/fixtures/sample.json   offline preview with sample data
//
// PROFILE_TOKEN (a personal token with read:user and repo) makes the numbers include private repositories.
// Without it, GITHUB_TOKEN is used and only public data is counted.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGitHub, normalize } from "./lib/github.mjs";
import { renderActivity } from "./lib/activity.mjs";
import { renderHeader } from "./lib/header.mjs";
import { renderStack } from "./lib/stack.mjs";
import { layouts, themes } from "./lib/svg.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "assets");

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

async function main() {
  const config = JSON.parse(await readFile(join(root, "profile.config.json"), "utf8"));
  const fixture = argValue("--fixture");
  const now = argValue("--now") ? new Date(argValue("--now")) : new Date();

  let raw;
  let includePrivate = false;
  if (fixture) {
    raw = JSON.parse(await readFile(join(root, fixture), "utf8"));
  } else {
    const token = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) throw new Error("Set GITHUB_TOKEN (or PROFILE_TOKEN) to read live data, or pass --fixture.");
    includePrivate = Boolean(process.env.PROFILE_TOKEN);
    raw = await fetchGitHub(config.login, token, now);
  }

  const data = normalize(raw, { now, includePrivate, config });

  await mkdir(outDir, { recursive: true });
  // assets/<card>-<wide|narrow>-<dark|light>.svg
  for (const layout of Object.values(layouts)) {
    for (const [themeName, theme] of Object.entries(themes)) {
      const suffix = `${layout.name}-${themeName}.svg`;
      await writeFile(join(outDir, `header-${suffix}`), renderHeader(config, theme, layout));
      await writeFile(join(outDir, `stack-${suffix}`), renderStack(config, theme, layout));
      await writeFile(join(outDir, `activity-${suffix}`), renderActivity(data, config, theme, layout));
    }
  }

  console.log(
    `Cards written to assets/ — ${data.contributions} contributions, ${data.commits} commits, ` +
      `${data.pullRequests} PRs, streak ${data.streak.current}/${data.streak.longest}, ` +
      `${data.repoCount} repos, languages: ${data.languages.map((l) => l.name).join(", ") || "none"}` +
      (includePrivate ? " (private included)" : " (public only)"),
  );
}

main().catch((err) => {
  // ::error:: shows the message as an annotation on the workflow run.
  console.error(process.env.GITHUB_ACTIONS ? `::error::${err.message}` : err);
  process.exit(1);
});
