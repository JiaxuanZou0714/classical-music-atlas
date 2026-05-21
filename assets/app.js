const PERIODS = [
  { id: "Renaissance", label: "文艺复兴", start: 1500, end: 1600, color: "var(--renaissance)" },
  { id: "Baroque", label: "巴洛克", start: 1600, end: 1750, color: "var(--baroque)" },
  { id: "Classical", label: "古典主义", start: 1750, end: 1820, color: "var(--classical)" },
  { id: "Romantic", label: "浪漫主义", start: 1820, end: 1910, color: "var(--romantic)" },
  { id: "Modern", label: "现代主义", start: 1910, end: 1990, color: "var(--modern)" }
];

const MIN_YEAR = 1500;
const MAX_YEAR = 1990;
const PREVIEW_IDS = [
  "palestrina",
  "byrd",
  "monteverdi",
  "bach",
  "handel",
  "haydn",
  "mozart",
  "beethoven",
  "schubert",
  "chopin",
  "wagner",
  "brahms",
  "tchaikovsky",
  "debussy",
  "mahler",
  "ravel",
  "stravinsky",
  "shostakovich"
];

let composers = [];
let composerSources = new Map();
let workSources = new Map();
let listeningGuides = new Map();
let activePeriod = "all";
let activeMood = "";
let searchValue = "";
let isInitialTimelineRender = false;

const page = document.body.dataset.page;

init();

async function init() {
  try {
    composers = await fetchJson("data/composers.json");
    hydratePublicSources(await fetchJson("data/public-sources.json", null));
    hydrateListeningGuides(await fetchJson("data/listening-guides.json", null));
    if (page === "home") initHome();
    if (page === "timeline") initTimelinePage();
  } catch (error) {
    renderLoadError();
  } finally {
    enablePageMotion();
  }
}

function enablePageMotion() {
  window.requestAnimationFrame(() => {
    document.body.classList.add("is-motion-ready");
  });
}

async function fetchJson(path, fallback) {
  const response = await fetch(path);
  if (!response.ok) {
    if (arguments.length > 1) return fallback;
    throw new Error(`${response.status} ${path}`);
  }

  return response.json();
}

function hydratePublicSources(sourceData) {
  if (!sourceData) return;

  composerSources = new Map((sourceData.composers || []).map((source) => [source.composerId, source]));
  workSources = new Map((sourceData.works || []).map((source) => [workSourceKey(source.composerId, source.title), source]));
}

function hydrateListeningGuides(guideData) {
  if (!guideData) return;

  listeningGuides = new Map((guideData.composers || []).map((guide) => [guide.composerId, guide]));
}

function initHome() {
  const preview = document.querySelector('[data-timeline="preview"]');
  const previewData = composers.filter((composer) => PREVIEW_IDS.includes(composer.id));
  renderTimeline(preview, previewData, { preview: true });
  bindTimelineNavigation("preview", { min: MIN_YEAR, max: MAX_YEAR });
  bindPreviewMapLaunch();
}

function initTimelinePage() {
  const params = new URLSearchParams(window.location.search);
  activePeriod = params.get("period") || "all";
  activeMood = params.get("mood") || "";
  searchValue = (params.get("q") || "").trim().toLowerCase();

  renderPeriodFilters();
  bindTimelineControls();
  bindTimelineNavigation("full", { min: MIN_YEAR, max: MAX_YEAR });
  isInitialTimelineRender = true;
  updateTimeline();
}

function renderPeriodFilters() {
  const target = document.querySelector("[data-period-filters]");
  if (!target) return;

  const buttons = [
    `<button class="chip" type="button" data-period="all" aria-pressed="${activePeriod === "all"}">全部</button>`,
    ...PERIODS.map((period) => {
      const pressed = activePeriod === period.id ? "true" : "false";
      return `<button class="chip" type="button" data-period="${period.id}" aria-pressed="${pressed}">${period.label}</button>`;
    })
  ];

  target.innerHTML = buttons.join("");
}

function bindTimelineControls() {
  const search = document.querySelector("[data-search]");
  const periodFilters = document.querySelector("[data-period-filters]");
  const moodButtons = document.querySelectorAll("[data-mood]");

  if (search && searchValue) search.value = searchValue;

  search?.addEventListener("input", (event) => {
    searchValue = event.target.value.trim().toLowerCase();
    syncUrlState();
    updateTimeline();
  });

  periodFilters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-period]");
    if (!button) return;
    activePeriod = button.dataset.period;
    updatePressedState("[data-period]", activePeriod);
    syncUrlState();
    updateTimeline();
  });

  moodButtons.forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.mood === activeMood ? "true" : "false");
    button.addEventListener("click", () => {
      activeMood = activeMood === button.dataset.mood ? "" : button.dataset.mood;
      moodButtons.forEach((item) => item.setAttribute("aria-pressed", item.dataset.mood === activeMood ? "true" : "false"));
      syncUrlState();
      updateTimeline();
    });
  });
}

function syncUrlState() {
  if (page !== "timeline") return;

  const params = new URLSearchParams(window.location.search);
  if (activePeriod && activePeriod !== "all") params.set("period", activePeriod);
  else params.delete("period");

  if (activeMood) params.set("mood", activeMood);
  else params.delete("mood");

  if (searchValue) params.set("q", searchValue);
  else params.delete("q");

  params.delete("focus");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function updateTimeline() {
  const filtered = composers.filter((composer) => {
    const matchesPeriod = activePeriod === "all" || composer.period === activePeriod;
    const matchesMood = !activeMood || composer.moods.includes(activeMood);
    const haystack = `${composer.nameZh} ${composer.nameEn} ${composer.country} ${composer.vibe}`.toLowerCase();
    return matchesPeriod && matchesMood && haystack.includes(searchValue);
  });

  const target = document.querySelector('[data-timeline="full"]');
  const selectedComposer = getSelectedComposer(filtered);
  const instantPan = isInitialTimelineRender;
  renderTimeline(target, filtered, { preview: false, selectedId: selectedComposer?.id });
  updateResultCount(filtered.length);
  renderDetail(selectedComposer);
  panTimelineToComposer(selectedComposer, "full", { min: MIN_YEAR, max: MAX_YEAR }, { instant: instantPan });
  isInitialTimelineRender = false;
}

function renderTimeline(target, data, options) {
  if (!target) return;

  const range = { min: MIN_YEAR, max: MAX_YEAR };
  const toPercent = (year) => yearToPercent(year, range.min, range.max);

  target.classList.toggle("timeline--preview", options.preview);
  target.innerHTML = "";

  PERIODS.forEach((period) => {
    if (period.end <= range.min || period.start >= range.max) return;
    const start = Math.max(period.start, range.min);
    const end = Math.min(period.end, range.max);
    const band = document.createElement("div");
    band.className = "period-band";
    band.style.left = `${toPercent(start)}%`;
    band.style.width = `${toPercent(end) - toPercent(start)}%`;
    band.style.setProperty("--period-color", period.color);
    band.innerHTML = `<span class="period-band__label">${period.label}</span>`;
    target.append(band);
  });

  const firstTick = Math.ceil(range.min / 50) * 50;
  for (let year = firstTick; year <= range.max; year += 50) {
    const tick = document.createElement("div");
    tick.className = "year-tick";
    tick.style.left = `${toPercent(year)}%`;
    tick.innerHTML = `<span>${year}</span>`;
    target.append(tick);
  }

  if (range.max % 50 !== 0) {
    const finalTick = document.createElement("div");
    finalTick.className = "year-tick";
    finalTick.style.left = "100%";
    finalTick.innerHTML = `<span>${range.max}</span>`;
    target.append(finalTick);
  }

  if (!data.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有找到匹配的作曲家。试着清空搜索或切换筛选。";
    target.append(empty);
    return;
  }

  const lanes = assignLanes(data, options.preview ? 15 : 24);
  const selectedComposer = !options.preview && options.selectedId ? data.find((composer) => composer.id === options.selectedId) : null;
  const laneHeight = options.preview ? 24 : 22;
  const topOffset = options.preview ? 58 : 68;
  const height = topOffset + (Math.max(...lanes.map((item) => item.lane)) + 2) * laneHeight;
  target.style.minHeight = `${Math.max(options.preview ? 250 : 560, height)}px`;

  lanes.forEach(({ composer, lane }, index) => {
    const bar = document.createElement(options.preview ? "a" : "button");
    if (options.preview) {
      bar.href = `timeline.html?focus=${encodeURIComponent(composer.id)}`;
    } else {
      bar.type = "button";
    }
    bar.className = "composer-bar";
    bar.dataset.id = composer.id;
    bar.style.left = `${toPercent(composer.birth)}%`;
    bar.style.width = `${Math.max(4, toPercent(composer.death) - toPercent(composer.birth))}%`;
    bar.style.top = `${topOffset + lane * laneHeight}px`;
    bar.style.setProperty("--period-color", getPeriodColor(composer.period));
    bar.style.setProperty("--bar-delay", `${composerBarDelay(index, lane, options.preview)}ms`);
    bar.textContent = composer.nameZh;
    bar.setAttribute("aria-label", `${composer.nameZh}，${composer.birth} 至 ${composer.death}`);
    applyComposerBarState(bar, composer, selectedComposer);

    if (options.preview) {
      bar.addEventListener("mouseenter", () => renderPreviewNote(composer));
      bar.addEventListener("focus", () => renderPreviewNote(composer));
    } else {
      bar.addEventListener("click", () => selectComposer(composer.id));
      bar.addEventListener("focus", () => selectComposer(composer.id));
    }

    target.append(bar);
  });

}

function bindTimelineNavigation(mode, range) {
  const frame = document.querySelector(`[data-timeline-frame="${mode}"]`);
  if (!frame || frame.dataset.navigationReady === "true") return;

  frame.dataset.navigationReady = "true";

  frame.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    frame.scrollBy({ left: direction * frame.clientWidth * 0.5, behavior: getScrollBehavior() });
  });

  bindDragPan(frame);
}

function composerBarDelay(index, lane, isPreview) {
  const indexStep = isPreview ? 8 : 4;
  const laneStep = isPreview ? 10 : 7;
  return Math.min(isPreview ? 190 : 280, index * indexStep + lane * laneStep);
}

function bindDragPan(frame) {
  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;

  frame.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a, input")) return;
    isDragging = true;
    startX = event.clientX;
    startScrollLeft = frame.scrollLeft;
    frame.classList.add("is-dragging");
    frame.setPointerCapture(event.pointerId);
  });

  frame.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    frame.scrollLeft = startScrollLeft - (event.clientX - startX);
  });

  frame.addEventListener("pointerup", (event) => {
    if (!isDragging) return;
    isDragging = false;
    frame.classList.remove("is-dragging");
    frame.releasePointerCapture(event.pointerId);
  });

  frame.addEventListener("pointercancel", () => {
    isDragging = false;
    frame.classList.remove("is-dragging");
  });
}

function renderPreviewNote(composer) {
  const target = document.querySelector("[data-preview-note]");
  if (!target || !composer) return;

  target.innerHTML = `
    <p><span class="timeline-note__name">${composer.nameZh}</span><span>${composer.birth}-${composer.death}</span><span>${composer.works[0]}</span></p>
  `;
}

function bindPreviewMapLaunch() {
  const frame = document.querySelector('[data-timeline-frame="preview"]');
  if (!frame) return;

  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;

  frame.addEventListener("pointerdown", (event) => {
    if (isInteractiveTarget(event.target)) return;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = frame.scrollLeft;
  });

  frame.addEventListener("pointerup", (event) => {
    if (isInteractiveTarget(event.target)) return;
    const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
    const panned = Math.abs(frame.scrollLeft - startScrollLeft);
    if (moved < 6 && panned < 6) window.location.href = "timeline.html";
  });
}

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest("button, a, input"));
}

function getSelectedComposer(filtered) {
  const focusId = new URLSearchParams(window.location.search).get("focus");
  return filtered.find((composer) => composer.id === focusId) || filtered[0];
}

function panTimelineToComposer(composer, mode, range, options = {}) {
  const frame = document.querySelector(`[data-timeline-frame="${mode}"]`);
  if (!frame || !composer) return;

  window.requestAnimationFrame(() => {
    scrollFrameToYear(frame, composer.birth, range, 0.32, options.instant ? "auto" : getScrollBehavior());
  });
}

function scrollFrameToYear(frame, year, range, alignRatio, behavior = getScrollBehavior()) {
  const percent = yearToPercent(year, range.min, range.max) / 100;
  const maxScroll = frame.scrollWidth - frame.clientWidth;
  const targetLeft = frame.scrollWidth * percent - frame.clientWidth * alignRatio;
  frame.scrollTo({
    left: Math.min(maxScroll, Math.max(0, targetLeft)),
    behavior
  });
}

function getScrollBehavior() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function assignLanes(data, maxLanes) {
  const sorted = [...data].sort((a, b) => a.birth - b.birth || a.death - b.death);
  const laneEnds = [];

  return sorted.map((composer) => {
    let lane = laneEnds.findIndex((end) => composer.birth > end + 6);
    if (lane === -1 || lane >= maxLanes) {
      lane = laneEnds.length < maxLanes ? laneEnds.length : shortestLane(laneEnds);
    }
    laneEnds[lane] = composer.death;
    return { composer, lane };
  });
}

function shortestLane(laneEnds) {
  return laneEnds.reduce((bestIndex, end, index, list) => (end < list[bestIndex] ? index : bestIndex), 0);
}

function selectComposer(id, options = {}) {
  const composer = composers.find((item) => item.id === id);
  if (!composer) return;

  updateTimelineFocus(composer);
  renderDetail(composer);
  if (options.pan) {
    panTimelineToComposer(composer, "full", { min: MIN_YEAR, max: MAX_YEAR });
  }
}

function renderDetail(composer) {
  const target = document.querySelector("[data-detail]");
  if (!target || !composer) return;
  const source = composerSources.get(composer.id);

  target.classList.remove("is-detail-entering");
  target.innerHTML = `
    <h2>${escapeHtml(composer.nameZh)}</h2>
    <p class="detail-meta">
      <span>${escapeHtml(composer.nameEn)}</span>
      <span>${composer.birth}-${composer.death}</span>
      <span>${escapeHtml(composer.country)}</span>
    </p>
    <p class="detail-vibe">${escapeHtml(composer.vibe)}</p>
    ${renderPublicFacts(source)}
    ${renderListeningGuide(composer)}
    ${renderWorkGuides(composer)}
    ${renderListeningPath(composer)}
    ${renderSourceDrawer(source)}
  `;
  animateDetail(target);
  bindDetailActions(target);
}

function animateDetail(target) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!document.body.classList.contains("is-motion-ready")) return;
  window.requestAnimationFrame(() => {
    target.classList.add("is-detail-entering");
  });
}

function renderPublicFacts(source) {
  if (!source) return "";

  const facts = [
    source.birthPlace && ["生于", source.birthPlace],
    source.deathPlace && ["卒于", source.deathPlace],
    source.citizenship?.length && ["归属", source.citizenship.slice(0, 2).join(" / ")],
    source.occupations?.length && ["身份", source.occupations.slice(0, 3).join(" / ")]
  ].filter(Boolean);

  if (!facts.length) return "";

  return `
    <dl class="detail-facts">
      ${facts.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function renderSourceDrawer(source) {
  if (!source) return "";

  const extraFacts = [
    source.description && ["资料", source.description],
    source.movements?.length && ["流派", source.movements.slice(0, 2).join(" / ")],
    !source.movements?.length && source.genres?.length && ["体裁", source.genres.slice(0, 2).join(" / ")],
    source.instruments?.length && ["乐器", source.instruments.slice(0, 3).join(" / ")],
    source.notableWorks?.length && ["名作", source.notableWorks.slice(0, 2).join(" / ")]
  ].filter(Boolean);
  const links = source.sourceLinks || [];

  if (!extraFacts.length && !links.length) return "";

  return `
    <details class="source-drawer">
      <summary>资料来源</summary>
      ${extraFacts.length ? `
        <dl class="source-extra-facts">
          ${extraFacts.map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join("")}
        </dl>
      ` : ""}
      ${renderSourceLinks(source)}
    </details>
  `;
}

function renderListeningGuide(composer) {
  const guide = listeningGuides.get(composer.id) || buildFallbackGuide(composer);
  const listenFor = (guide.listenFor?.length ? guide.listenFor : [composer.vibe]).slice(0, 2);

  return `
    <section class="listening-guide" aria-label="鉴赏指南">
      <p class="detail-section-label">鉴赏指南</p>
      <ul class="guide-list">
        ${listenFor.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderWorkGuides(composer) {
  const guide = listeningGuides.get(composer.id);
  const workGuides = guide?.works?.length
    ? guide.works.slice(0, 3)
    : composer.works.slice(0, 3).map((title) => ({ title, note: "先记住最清楚的主题，再听它下一次出现时变了什么。" }));

  return `
    <div class="detail-works" aria-label="先听这三首">
      <p class="detail-section-label">先听</p>
      <ol class="work-guide-list">
        ${workGuides.map((work) => `
          <li>
            ${renderWorkLink(composer.id, work.title)}
            <span>${escapeHtml(work.note)}</span>
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}

function renderListeningPath(composer) {
  const path = buildListeningPath(composer);
  if (path.length < 2) return "";

  return `
    <nav class="listening-path" aria-label="聆听路径">
      <p class="detail-section-label">路径</p>
      <div>
        ${path.map((item, index) => {
          const label = escapeHtml(item.nameZh);
          if (index === 0) return `<span class="path-node is-current" aria-current="true">${label}</span>`;
          return `<button class="path-node" type="button" data-path-id="${escapeHtml(item.id)}">${label}</button>`;
        }).join('<span class="path-arrow" aria-hidden="true">→</span>')}
      </div>
    </nav>
  `;
}

function buildListeningPath(composer) {
  const path = [composer];
  let current = composer;

  while (path.length < 3) {
    const nextComposer = findMentionedComposer(current.next, path);
    if (!nextComposer) break;
    path.push(nextComposer);
    current = nextComposer;
  }

  if (path.length === 1) {
    const neighbor = composers
      .filter((candidate) => candidate.id !== composer.id && candidate.birth >= composer.birth)
      .sort((a, b) => a.birth - b.birth)[0];
    if (neighbor) path.push(neighbor);
  }

  return path;
}

function findMentionedComposer(text, excluded) {
  const haystack = String(text || "").toLowerCase();
  if (!haystack) return null;
  const excludedIds = new Set(excluded.map((composer) => composer.id));

  return composers
    .filter((composer) => !excludedIds.has(composer.id))
    .map((composer) => ({ composer, index: mentionIndex(haystack, composer) }))
    .filter((item) => item.index !== -1)
    .sort((a, b) => a.index - b.index || a.composer.birth - b.composer.birth)[0]?.composer || null;
}

function mentionIndex(haystack, composer) {
  const names = [
    composer.nameZh,
    composer.nameEn,
    composer.nameEn.split(/\s+/).at(-1)
  ].filter(Boolean);
  const indexes = names
    .map((name) => haystack.indexOf(name.toLowerCase()))
    .filter((index) => index !== -1);
  return indexes.length ? Math.min(...indexes) : -1;
}

function bindDetailActions(target) {
  target.querySelectorAll("[data-path-id]").forEach((button) => {
    button.addEventListener("click", () => {
      ensureComposerVisible(button.dataset.pathId);
      selectComposer(button.dataset.pathId, { pan: true });
    });
  });
}

function ensureComposerVisible(id) {
  const isVisible = [...document.querySelectorAll('[data-timeline="full"] .composer-bar')].some((bar) => bar.dataset.id === id);
  if (isVisible) return;

  activePeriod = "all";
  activeMood = "";
  searchValue = "";

  const search = document.querySelector("[data-search]");
  if (search) search.value = "";
  updatePressedState("[data-period]", activePeriod);
  document.querySelectorAll("[data-mood]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
  updateTimeline();
}

function buildFallbackGuide(composer) {
  return {
    listenFor: [composer.vibe],
    entry: `入口可以从《${composer.works[0]}》开始。`,
    compare: composer.next
  };
}

function renderWorkLink(composerId, title) {
  const source = workSources.get(workSourceKey(composerId, title));
  const label = escapeHtml(title);

  if (!source?.sourceUrl) {
    const titleText = source?.reason || "待补充公开来源";
    return `<span class="work-link" title="${escapeHtml(titleText)}">${label}</span>`;
  }

  const sourceTitle = source.sourceTitle && source.sourceTitle !== title ? `：${source.sourceTitle}` : "";
  const titleText = `${source.sourceName}${sourceTitle} (${source.status})`;
  return `<a class="work-link work-link--source" href="${escapeHtml(source.sourceUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(titleText)}">${label}</a>`;
}

function renderSourceLinks(source) {
  const links = source?.sourceLinks || [];
  if (!links.length) return "";

  return `
    <div class="source-links" aria-label="公开资料入口">
      ${links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}
    </div>
  `;
}

function updateTimelineFocus(selectedComposer) {
  document.querySelectorAll('[data-timeline="full"] .composer-bar').forEach((bar) => {
    const composer = composers.find((item) => item.id === bar.dataset.id);
    if (composer) applyComposerBarState(bar, composer, selectedComposer);
  });
}

function applyComposerBarState(bar, composer, selectedComposer) {
  const isActive = composer.id === selectedComposer?.id;
  const isRelated = Boolean(selectedComposer) && isRelatedComposer(composer, selectedComposer);

  bar.classList.toggle("is-active", isActive);
  bar.classList.toggle("is-related", isRelated && !isActive);
  bar.classList.toggle("is-muted", Boolean(selectedComposer) && !isActive && !isRelated);
  bar.toggleAttribute("aria-current", isActive);
}

function isRelatedComposer(composer, selectedComposer) {
  return composer.period === selectedComposer.period || (composer.birth <= selectedComposer.death && composer.death >= selectedComposer.birth);
}

function workSourceKey(composerId, title) {
  return `${composerId}::${title}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function updatePressedState(selector, activeValue) {
  document.querySelectorAll(selector).forEach((button) => {
    const value = button.dataset.period;
    button.setAttribute("aria-pressed", value === activeValue ? "true" : "false");
  });
}

function updateResultCount(count) {
  const target = document.querySelector("[data-result-count]");
  if (!target) return;
  target.textContent = `${count} 位作曲家`;
}

function yearToPercent(year, minYear = MIN_YEAR, maxYear = MAX_YEAR) {
  const bounded = Math.min(maxYear, Math.max(minYear, year));
  return ((bounded - minYear) / (maxYear - minYear)) * 100;
}

function getPeriodColor(periodId) {
  return PERIODS.find((period) => period.id === periodId)?.color || "var(--paper-lift)";
}

function renderLoadError() {
  const timelines = document.querySelectorAll("[data-timeline]");
  timelines.forEach((target) => {
    target.innerHTML = '<p class="empty-state">数据没有加载成功。请确认 data/composers.json 存在后刷新页面。</p>';
  });
}
