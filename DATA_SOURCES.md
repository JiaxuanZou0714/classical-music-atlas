# Data Sources

This project treats the timeline as edited cultural material, not as an unsourced encyclopedia dump. Factual fields must be traceable to public data sources; listening notes remain editorial.

## Source Tiers

### Tier 1: Identity and Dates

Use these sources for composer identity, name variants, birth year, death year, and external identifiers.

- **Wikidata**: baseline open knowledge graph for entity IDs, birth/death dates, MusicBrainz IDs, VIAF IDs, and Library of Congress IDs. Wikidata data is available under CC0.
- **Library of Congress Linked Data Service**: authority data for names and identifiers. Use it to resolve ambiguous or variant names.
- **VIAF**: cross-library authority aggregation. Use it for disambiguation, not as the only proof of a date.
- **MusicBrainz**: music metadata authority for artist identities and work relationships. Respect its API identification and rate-limit guidance.

### Tier 2: Works and Scores

Use these sources to check whether a work belongs to a composer, and to add stable external links later.

- **IMSLP**: public-domain score pages and work lists. Useful for work attribution and score availability.
- **MusicBrainz Works**: useful for structured relationships between composers, works, recordings, and releases.
- **RISM Online**: especially useful for early music, manuscripts, historical sources, and source-level evidence.

### Tier 3: Convenience Sources

Use these only as secondary helpers.

- **Open Opus**: convenient public-domain classical metadata API. Good for quick composer and work lookups, but not enough as the only authority source.
- **Wikipedia / DBpedia**: useful for orientation and links, but not a primary source for this project.

## Field Rules

| Field | Source rule |
|---|---|
| `nameEn`, `nameZh` | Must map to a stable Wikidata or library authority identity. Chinese names are editorial labels and should not drive matching. |
| `birth`, `death` | Must match at least one Tier 1 source. If sources disagree or only approximate dates exist, document the ambiguity before changing the UI data. |
| `period` | Editorial taxonomy. Use conventional music-history periods, but do not claim it is a database fact. |
| `country` | Treat carefully. Many composers have birthplace, citizenship, language, career location, and tradition that do not collapse into one country. Prefer future migration to `tradition` or `activeRegion`. |
| `works` | Each listed work should be confirmable in IMSLP, MusicBrainz, Open Opus, or another reputable catalog. |
| `moods`, `vibe`, `next` | Editorial listening guidance. Keep it concise and tasteful; do not present it as objective metadata. |
| `sourceIds` | Stores stable external identifiers used for verification. First version tracks Wikidata, MusicBrainz artist ID, VIAF, and LOC. |
| `verifiedAt` | Date when identity and birth/death years were last checked by the verification script. |

## Verification Workflow

Before changing timeline data:

1. Run `node scripts/verify-composer-facts.mjs`.
2. Review any mismatched birth/death years.
3. For each mismatch, check Wikidata plus at least one authority or music catalog source.
4. Update `data/composers.json` only after the ambiguity is understood.
5. If all identity and date checks pass, run `node scripts/verify-composer-facts.mjs --write-source-ids`.
6. Run `node scripts/verify-composer-works.mjs` before changing recommended works.
7. If the work report is acceptable, run `node scripts/verify-composer-works.mjs --write-work-sources`.
8. Keep public-facing prose modest when a date is approximate.

Work verification uses MusicBrainz work search scoped to each composer's MusicBrainz artist ID. Saved reports live in `data/work-sources.json`. Treat `OK` as a strong automated match. Treat `CHECK` as a useful candidate that needs human review, often because the local title is a translated title, a short title, a suite, an opus group, or a movement-level reference. Treat `MISS` as unresolved until checked in another catalog such as IMSLP, RISM, or Open Opus.

## Official Documentation

- Wikidata data access: https://www.wikidata.org/wiki/Help:Data_access
- Wikidata Query Service: https://www.wikidata.org/wiki/Help:Queries
- MusicBrainz API: https://musicbrainz.org/doc/MusicBrainz_API
- MusicBrainz rate limiting: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- IMSLP API: https://imslp.org/wiki/IMSLP:API
- Library of Congress Linked Data Service: https://www.loc.gov/apis/additional-apis/linked-data-service/
- RISM Online API: https://rism.online/docs/
- Open Opus API: https://www.openopus.org/
