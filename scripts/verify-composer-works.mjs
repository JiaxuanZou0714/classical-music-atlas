import fs from "node:fs/promises";

const MUSICBRAINZ_WORK_URL = "https://musicbrainz.org/ws/2/work";
const USER_AGENT = "classical-music-atlas/0.1 (https://github.com/JiaxuanZou0714/classical-music-atlas)";
const REQUEST_DELAY_MS = 1100;
const CACHE_PATH = "tmp/musicbrainz-work-cache.json";

const shouldWriteWorkSources = process.argv.includes("--write-work-sources");
const composers = JSON.parse(await fs.readFile("data/composers.json", "utf8"));
const cache = await readCache();
const results = [];
let checked = 0;
const totalWorks = composers.reduce((total, composer) => total + composer.works.length, 0);

for (const composer of composers) {
  const musicBrainzArtist = composer.sourceIds?.musicBrainzArtist;
  const works = [];

  for (const title of composer.works) {
    if (!musicBrainzArtist) {
      works.push({
        title,
        status: "MISS",
        reason: "missing MusicBrainz artist ID",
        musicBrainzWork: null
      });
      continue;
    }

    const candidates = await searchMusicBrainzWork(title, musicBrainzArtist);
    const best = candidates[0] || null;
    works.push(classifyWork(title, best, candidates.length));
    checked += 1;
    console.error(`[${checked}/${totalWorks}] ${composer.nameEn}: ${title}`);
  }

  results.push({
    composerId: composer.id,
    composerName: composer.nameEn,
    musicBrainzArtist,
    works
  });
}

printReport(results);

if (shouldWriteWorkSources) {
  await writeWorkSources(results);
}

function classifyWork(localTitle, best, candidateCount) {
  if (!best) {
    return {
      title: localTitle,
      status: "MISS",
      reason: "no MusicBrainz work candidate found for this composer",
      candidateCount,
      musicBrainzWork: null
    };
  }

  const score = Number(best.score || 0);
  const similarity = titleSimilarity(localTitle, best.title);
  const isMovementCandidate = isLikelyMovementTitle(best.title, localTitle);
  const status = score >= 90 && similarity >= 0.65 && !isMovementCandidate ? "OK" : "CHECK";

  return {
    title: localTitle,
    status,
    reason: status === "OK" ? "high-confidence MusicBrainz work match" : "review title variant, movement match, or work grouping",
    candidateCount,
    musicBrainzWork: {
      id: best.id,
      url: `https://musicbrainz.org/work/${best.id}`,
      title: best.title,
      score,
      type: best.type || "",
      disambiguation: best.disambiguation || ""
    }
  };
}

function isLikelyMovementTitle(candidateTitle, localTitle) {
  if (localTitle.includes(":")) return false;
  return candidateTitle.includes(":");
}

async function searchMusicBrainzWork(title, artistId) {
  const query = `work:"${escapeQuery(title)}" AND arid:${artistId}`;
  const cacheKey = `${artistId}::${title}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const params = new URLSearchParams({
    query,
    fmt: "json",
    limit: "5"
  });

  const response = await fetch(`${MUSICBRAINZ_WORK_URL}?${params}`, {
    headers: {
      "accept": "application/json",
      "user-agent": USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: MusicBrainz work search failed for ${title}`);
  }

  const data = await response.json();
  const works = data.works || [];
  cache[cacheKey] = works;
  await writeCache(cache);
  await sleep(REQUEST_DELAY_MS);
  return works;
}

function escapeQuery(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function titleSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;

  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }

  return shared / Math.max(left.size, right.size);
}

function tokenSet(value) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return new Set(normalized.split(/\s+/).filter((token) => token.length > 1));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function writeCache(payload) {
  await fs.mkdir("tmp", { recursive: true });
  await fs.writeFile(CACHE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function printReport(rows) {
  const flat = rows.flatMap((composer) => composer.works.map((work) => ({ composer, work })));
  const counts = countStatuses(flat.map(({ work }) => work.status));

  console.log(`Composer work check: ${counts.OK || 0} OK, ${counts.CHECK || 0} CHECK, ${counts.MISS || 0} MISS`);
  console.log("");

  for (const { composer, work } of flat) {
    const candidate = work.musicBrainzWork
      ? `${work.musicBrainzWork.id} | ${work.musicBrainzWork.score} | ${work.musicBrainzWork.title}`
      : work.reason;
    console.log(`${work.status} | ${composer.composerName} | ${work.title} | ${candidate}`);
  }
}

function countStatuses(statuses) {
  return statuses.reduce((counts, status) => {
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

async function writeWorkSources(rows) {
  const flat = rows.flatMap((composer) => composer.works);
  const summary = countStatuses(flat.map((work) => work.status));
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const payload = {
    verifiedAt,
    source: "MusicBrainz work search by work title and composer artist ID",
    totalWorks: flat.length,
    summary,
    composers: rows
  };

  await fs.writeFile("data/work-sources.json", `${JSON.stringify(payload, null, 2)}\n`);
  console.log("");
  console.log(`Wrote work source report to data/work-sources.json with verifiedAt=${verifiedAt}`);
}
