import fs from "node:fs/promises";

const WIKIDATA_SEARCH_URL = "https://www.wikidata.org/w/api.php";
const COMPOSER_QID = "Q36834";
const USER_AGENT = "classical-music-atlas/0.1 (https://github.com/JiaxuanZou0714/classical-music-atlas)";

const PROPERTY = {
  birth: "P569",
  death: "P570",
  occupation: "P106",
  musicBrainzArtist: "P434",
  viaf: "P214",
  loc: "P244"
};

const shouldWriteSourceIds = process.argv.includes("--write-source-ids");
const composers = JSON.parse(await fs.readFile("data/composers.json", "utf8"));
const searchResults = new Map();
const entityIds = new Set();
const results = [];

for (const composer of composers) {
  const candidates = await searchWikidata(composer.nameEn);
  const topCandidates = candidates.slice(0, 5);
  searchResults.set(composer.id, topCandidates);
  topCandidates.forEach((candidate) => entityIds.add(candidate.id));
}

const entities = await fetchEntities([...entityIds]);

for (const composer of composers) {
  const enriched = searchResults.get(composer.id).map((candidate) => enrichCandidate(candidate, entities[candidate.id]));

  const best = pickBestCandidate(composer, enriched);
  results.push({ composer, best, candidates: enriched });
}

printReport(results);

const failures = results.filter(({ composer, best }) => {
  if (!best) return true;
  return best.birth !== composer.birth || best.death !== composer.death;
});

if (failures.length) {
  process.exitCode = 1;
} else if (shouldWriteSourceIds) {
  await writeSourceIds(results);
}

async function searchWikidata(name) {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    language: "en",
    uselang: "en",
    type: "item",
    limit: "8",
    search: name
  });

  const data = await fetchJson(`${WIKIDATA_SEARCH_URL}?${params}`);
  return data.search || [];
}

async function fetchEntities(ids) {
  const entities = {};

  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      languages: "en",
      props: "labels|descriptions|claims",
      ids: chunk.join("|")
    });
    const data = await fetchJson(`${WIKIDATA_SEARCH_URL}?${params}`);
    Object.assign(entities, data.entities || {});
  }

  return entities;
}

function enrichCandidate(candidate, entity) {
  if (!entity || entity.missing) {
    return {
      id: candidate.id,
      label: candidate.label || candidate.id,
      description: candidate.description || "",
      birth: null,
      death: null,
      isComposer: false,
      musicBrainzArtist: "",
      viaf: "",
      loc: ""
    };
  }

  return {
    id: candidate.id,
    label: entity.labels?.en?.value || candidate.label || candidate.id,
    description: entity.descriptions?.en?.value || candidate.description || "",
    birth: yearFromTimeClaim(entity, PROPERTY.birth),
    death: yearFromTimeClaim(entity, PROPERTY.death),
    isComposer: hasEntityClaim(entity, PROPERTY.occupation, COMPOSER_QID),
    musicBrainzArtist: stringClaim(entity, PROPERTY.musicBrainzArtist),
    viaf: stringClaim(entity, PROPERTY.viaf),
    loc: stringClaim(entity, PROPERTY.loc)
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }

  return response.json();
}

function pickBestCandidate(composer, candidates) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(composer, candidate)
    }))
    .sort((a, b) => b.score - a.score)[0];
}

function scoreCandidate(composer, candidate) {
  let score = 0;
  if (candidate.isComposer) score += 3;
  if (candidate.birth === composer.birth) score += 4;
  if (candidate.death === composer.death) score += 4;
  if (sameLooseName(composer.nameEn, candidate.label)) score += 2;
  if (candidate.musicBrainzArtist) score += 1;
  return score;
}

function sameLooseName(a, b) {
  return normalizeName(a) === normalizeName(b);
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function yearFromTimeClaim(entity, property) {
  const claim = entity.claims?.[property]?.[0];
  const value = claim?.mainsnak?.datavalue?.value?.time;
  if (!value) return null;

  const match = value.match(/^[+-](\d{4,})-/);
  return match ? Number(match[1]) : null;
}

function hasEntityClaim(entity, property, targetId) {
  return Boolean(
    entity.claims?.[property]?.some((claim) => {
      const value = claim.mainsnak?.datavalue?.value;
      return value?.id === targetId;
    })
  );
}

function stringClaim(entity, property) {
  return entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value || "";
}

function printReport(rows) {
  const lines = [];
  let ok = 0;
  let mismatch = 0;
  let missing = 0;

  for (const { composer, best } of rows) {
    if (!best) {
      missing += 1;
      lines.push(`MISS | ${composer.nameEn} | no Wikidata candidate`);
      continue;
    }

    const birthOk = best.birth === composer.birth;
    const deathOk = best.death === composer.death;
    const status = birthOk && deathOk ? "OK" : "CHECK";

    if (status === "OK") ok += 1;
    else mismatch += 1;

    lines.push(
      [
        status,
        composer.nameEn,
        best.id,
        best.label,
        `local ${composer.birth}-${composer.death}`,
        `wikidata ${best.birth ?? "?"}-${best.death ?? "?"}`,
        best.musicBrainzArtist ? `mbid ${best.musicBrainzArtist}` : "mbid ?",
        best.viaf ? `viaf ${best.viaf}` : "viaf ?",
        best.loc ? `loc ${best.loc}` : "loc ?"
      ].join(" | ")
    );
  }

  console.log(`Composer fact check: ${ok} OK, ${mismatch} CHECK, ${missing} MISS`);
  console.log("");
  console.log(lines.join("\n"));
}

async function writeSourceIds(rows) {
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const byComposerId = new Map(rows.map(({ composer, best }) => [composer.id, best]));
  const updated = composers.map((composer) => {
    const best = byComposerId.get(composer.id);
    return {
      ...composer,
      sourceIds: {
        wikidata: best.id,
        musicBrainzArtist: best.musicBrainzArtist,
        viaf: best.viaf,
        loc: best.loc
      },
      verifiedAt
    };
  });

  await fs.writeFile("data/composers.json", `${JSON.stringify(updated, null, 2)}\n`);
  console.log("");
  console.log(`Wrote source IDs to data/composers.json with verifiedAt=${verifiedAt}`);
}
