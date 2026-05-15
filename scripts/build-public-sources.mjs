import fs from "node:fs/promises";

const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "classical-music-atlas/0.1 (https://github.com/JiaxuanZou0714/classical-music-atlas)";

const PROPERTY = {
  birthPlace: "P19",
  deathPlace: "P20",
  citizenship: "P27",
  occupation: "P106",
  movement: "P135",
  genre: "P136",
  instrument: "P1303",
  notableWork: "P800"
};

const FIELD_LIMITS = {
  aliases: 4,
  occupations: 4,
  genres: 4,
  movements: 4,
  instruments: 4,
  notableWorks: 5
};

const composers = JSON.parse(await fs.readFile("data/composers.json", "utf8"));
const workSources = JSON.parse(await fs.readFile("data/work-sources.json", "utf8"));

const composerQids = composers
  .map((composer) => composer.sourceIds?.wikidata)
  .filter(Boolean);

const composerEntities = await fetchEntities(composerQids, "labels|descriptions|aliases|claims");
const linkedIds = collectLinkedEntityIds(composerEntities, Object.values(PROPERTY));
const linkedEntities = await fetchEntities([...linkedIds], "labels|descriptions");

const payload = {
  verifiedAt: new Date().toISOString().slice(0, 10),
  source: "Wikidata entity API for composer facts and existing MusicBrainz work verification report for work source links",
  composerCount: composers.length,
  workCount: composers.reduce((total, composer) => total + composer.works.length, 0),
  composers: composers.map((composer) => buildComposerSource(composer, composerEntities[composer.sourceIds?.wikidata], linkedEntities)),
  works: buildWorkSourceRows()
};

await fs.writeFile("data/public-sources.json", `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote public source data for ${payload.composerCount} composers and ${payload.workCount} works.`);

async function fetchEntities(ids, props) {
  const entities = {};

  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      languages: "zh|en",
      languagefallback: "1",
      props,
      ids: chunk.join("|")
    });

    const response = await fetch(`${WIKIDATA_API_URL}?${params}`, {
      headers: {
        "accept": "application/json",
        "user-agent": USER_AGENT
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: Wikidata entity fetch failed`);
    }

    const data = await response.json();
    Object.assign(entities, data.entities || {});
  }

  return entities;
}

function collectLinkedEntityIds(entities, properties) {
  const ids = new Set();

  for (const entity of Object.values(entities)) {
    for (const property of properties) {
      for (const claim of entity.claims?.[property] || []) {
        const id = claim.mainsnak?.datavalue?.value?.id;
        if (id) ids.add(id);
      }
    }
  }

  return ids;
}

function buildComposerSource(composer, entity, linkedEntities) {
  return {
    composerId: composer.id,
    wikidataId: composer.sourceIds?.wikidata || "",
    label: labelFor(entity) || composer.nameEn,
    description: descriptionFor(entity),
    aliases: aliasesFor(entity).slice(0, FIELD_LIMITS.aliases),
    birthPlace: firstLinkedLabel(entity, PROPERTY.birthPlace, linkedEntities),
    deathPlace: firstLinkedLabel(entity, PROPERTY.deathPlace, linkedEntities),
    citizenship: linkedLabels(entity, PROPERTY.citizenship, linkedEntities).slice(0, 2),
    occupations: linkedLabels(entity, PROPERTY.occupation, linkedEntities).slice(0, FIELD_LIMITS.occupations),
    movements: linkedLabels(entity, PROPERTY.movement, linkedEntities).slice(0, FIELD_LIMITS.movements),
    genres: linkedLabels(entity, PROPERTY.genre, linkedEntities).slice(0, FIELD_LIMITS.genres),
    instruments: linkedLabels(entity, PROPERTY.instrument, linkedEntities).slice(0, FIELD_LIMITS.instruments),
    notableWorks: linkedLabels(entity, PROPERTY.notableWork, linkedEntities).slice(0, FIELD_LIMITS.notableWorks),
    sourceLinks: buildComposerLinks(composer)
  };
}

function buildComposerLinks(composer) {
  const ids = composer.sourceIds || {};
  return [
    ids.wikidata && {
      label: "Wikidata",
      url: `https://www.wikidata.org/wiki/${ids.wikidata}`
    },
    ids.musicBrainzArtist && {
      label: "MusicBrainz",
      url: `https://musicbrainz.org/artist/${ids.musicBrainzArtist}`
    },
    ids.viaf && {
      label: "VIAF",
      url: `https://viaf.org/viaf/${ids.viaf}/`
    },
    ids.loc && {
      label: "LOC",
      url: `https://id.loc.gov/authorities/names/${ids.loc}.html`
    }
  ].filter(Boolean);
}

function buildWorkSourceRows() {
  const rows = [];

  for (const composer of workSources.composers || []) {
    for (const work of composer.works || []) {
      rows.push({
        composerId: composer.composerId,
        title: work.title,
        status: work.status,
        sourceTitle: work.musicBrainzWork?.title || "",
        sourceUrl: work.musicBrainzWork?.url || "",
        sourceType: work.musicBrainzWork?.type || "",
        sourceId: work.musicBrainzWork?.id || "",
        sourceName: work.musicBrainzWork ? "MusicBrainz" : "",
        reason: work.reason
      });
    }
  }

  return rows;
}

function labelFor(entity) {
  return entity?.labels?.zh?.value || entity?.labels?.en?.value || "";
}

function descriptionFor(entity) {
  return entity?.descriptions?.zh?.value || entity?.descriptions?.en?.value || "";
}

function aliasesFor(entity) {
  const aliases = [
    ...(entity?.aliases?.zh || []).map((item) => item.value),
    ...(entity?.aliases?.en || []).map((item) => item.value)
  ];

  return unique(aliases);
}

function firstLinkedLabel(entity, property, linkedEntities) {
  return linkedLabels(entity, property, linkedEntities)[0] || "";
}

function linkedLabels(entity, property, linkedEntities) {
  const values = [];

  for (const claim of entity?.claims?.[property] || []) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    const label = id ? labelFor(linkedEntities[id]) : "";
    if (label) values.push(label);
  }

  return unique(values);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
