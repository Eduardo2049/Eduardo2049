// Reads the profile numbers from the GitHub GraphQL API and reduces them to what the cards show.

const ENDPOINT = "https://api.github.com/graphql";

const PROFILE_QUERY = `
query ($login: String!, $yearFrom: DateTime!, $now: DateTime!) {
  user(login: $login) {
    login
    thisYear: contributionsCollection(from: $yearFrom, to: $now) {
      totalCommitContributions
      totalPullRequestContributions
    }
    lastYear: contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

const REPOS_QUERY = `
query ($login: String!, $cursor: String) {
  user(login: $login) {
    repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        isPrivate
        stargazerCount
        languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

async function graphql(token, query, variables) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "profile-cards",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API answered ${res.status} ${res.statusText}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`GitHub API error: ${json.errors.map((e) => e.message).join("; ")}`);
  if (!json.data?.user) throw new Error(`GitHub user not found: ${variables.login}`);
  return json.data.user;
}

// Returns the raw API payload; the same shape is used by the offline fixture.
export async function fetchGitHub(login, token, now) {
  const year = now.getUTCFullYear();
  const user = await graphql(token, PROFILE_QUERY, {
    login,
    yearFrom: `${year}-01-01T00:00:00Z`,
    now: now.toISOString(),
  });

  const repos = [];
  let cursor = null;
  do {
    const page = await graphql(token, REPOS_QUERY, { login, cursor });
    repos.push(...page.repositories.nodes);
    cursor = page.repositories.pageInfo.hasNextPage ? page.repositories.pageInfo.endCursor : null;
  } while (cursor);

  return { user, repos };
}

const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

function streaks(days) {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Today still counts as open: a streak only breaks once a whole day passes without contributions.
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i -= 1;
  let current = 0;
  while (i >= 0 && days[i].count > 0) {
    current += 1;
    i -= 1;
  }
  return { current, longest };
}

function topLanguages(repos, { max, exclude }) {
  const totals = new Map();
  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      if (exclude.includes(edge.node.name)) continue;
      const prev = totals.get(edge.node.name) ?? { name: edge.node.name, color: edge.node.color, size: 0 };
      prev.size += edge.size;
      totals.set(edge.node.name, prev);
    }
  }
  const all = [...totals.values()].sort((a, b) => b.size - a.size);
  const sum = all.reduce((acc, l) => acc + l.size, 0);
  if (sum === 0) return [];
  const top = all.slice(0, max).map((l) => ({ ...l, share: l.size / sum }));
  const otherSize = all.slice(max).reduce((acc, l) => acc + l.size, 0);
  if (otherSize > 0) top.push({ name: "Other", color: null, size: otherSize, share: otherSize / sum });
  return top;
}

export function normalize(raw, { now, includePrivate, config }) {
  const { user, repos } = raw;
  const calendar = user.lastYear.contributionCalendar;
  const weeks = calendar.weeks.map((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS.indexOf(d.contributionLevel) })),
  );
  const days = weeks.flat();
  const counted = includePrivate ? repos : repos.filter((r) => !r.isPrivate);

  return {
    login: user.login,
    now,
    year: now.getUTCFullYear(),
    includePrivate,
    contributions: calendar.totalContributions,
    commits: user.thisYear.totalCommitContributions,
    pullRequests: user.thisYear.totalPullRequestContributions,
    streak: streaks(days),
    weeks,
    repoCount: counted.length,
    stars: counted.reduce((acc, r) => acc + r.stargazerCount, 0),
    languages: topLanguages(counted, config.languages),
  };
}
