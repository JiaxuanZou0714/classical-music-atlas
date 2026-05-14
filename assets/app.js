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
let activePeriod = "all";
let activeMood = "";
let searchValue = "";

const page = document.body.dataset.page;

init();

async function init() {
  try {
    const response = await fetch("data/composers.json");
    composers = await response.json();
    if (page === "home") initHome();
    if (page === "timeline") initTimelinePage();
  } catch (error) {
    renderLoadError();
  }
}

function initHome() {
  const preview = document.querySelector('[data-timeline="preview"]');
  const previewData = composers.filter((composer) => PREVIEW_IDS.includes(composer.id));
  renderTimeline(preview, previewData, { preview: true });
  bindTimelineNavigation("preview", { min: 1600, max: 1950 });
}

function initTimelinePage() {
  const params = new URLSearchParams(window.location.search);
  activePeriod = params.get("period") || "all";
  activeMood = params.get("mood") || "";

  renderPeriodFilters();
  bindTimelineControls();
  bindTimelineNavigation("full", { min: MIN_YEAR, max: MAX_YEAR });
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

  search?.addEventListener("input", (event) => {
    searchValue = event.target.value.trim().toLowerCase();
    updateTimeline();
  });

  periodFilters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-period]");
    if (!button) return;
    activePeriod = button.dataset.period;
    updatePressedState("[data-period]", activePeriod);
    updateTimeline();
  });

  moodButtons.forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.mood === activeMood ? "true" : "false");
    button.addEventListener("click", () => {
      activeMood = activeMood === button.dataset.mood ? "" : button.dataset.mood;
      moodButtons.forEach((item) => item.setAttribute("aria-pressed", item.dataset.mood === activeMood ? "true" : "false"));
      updateTimeline();
    });
  });
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
  renderTimeline(target, filtered, { preview: false, selectedId: selectedComposer?.id });
  updateResultCount(filtered.length);
  renderDetail(selectedComposer);
  panTimelineToComposer(selectedComposer, "full", { min: MIN_YEAR, max: MAX_YEAR });
}

function renderTimeline(target, data, options) {
  if (!target) return;

  const range = options.preview ? { min: 1600, max: 1950 } : { min: MIN_YEAR, max: MAX_YEAR };
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
  const laneHeight = options.preview ? 24 : 22;
  const topOffset = options.preview ? 58 : 68;
  const height = topOffset + (Math.max(...lanes.map((item) => item.lane)) + 2) * laneHeight;
  target.style.minHeight = `${Math.max(options.preview ? 250 : 560, height)}px`;

  lanes.forEach(({ composer, lane }) => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "composer-bar";
    bar.dataset.id = composer.id;
    bar.style.left = `${toPercent(composer.birth)}%`;
    bar.style.width = `${Math.max(4, toPercent(composer.death) - toPercent(composer.birth))}%`;
    bar.style.top = `${topOffset + lane * laneHeight}px`;
    bar.style.setProperty("--period-color", getPeriodColor(composer.period));
    bar.textContent = composer.nameZh;
    bar.setAttribute("aria-label", `${composer.nameZh}，${composer.birth} 至 ${composer.death}`);
    bar.classList.toggle("is-active", composer.id === options.selectedId);

    if (options.preview) {
      bar.addEventListener("mouseenter", () => renderPreviewNote(composer));
      bar.addEventListener("focus", () => renderPreviewNote(composer));
      bar.addEventListener("click", () => {
        window.location.href = `timeline.html?focus=${encodeURIComponent(composer.id)}`;
      });
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

function getSelectedComposer(filtered) {
  const focusId = new URLSearchParams(window.location.search).get("focus");
  return filtered.find((composer) => composer.id === focusId) || filtered[0];
}

function panTimelineToComposer(composer, mode, range) {
  const frame = document.querySelector(`[data-timeline-frame="${mode}"]`);
  if (!frame || !composer) return;

  window.requestAnimationFrame(() => {
    scrollFrameToYear(frame, composer.birth, range, 0.32);
  });
}

function scrollFrameToYear(frame, year, range, alignRatio) {
  const percent = yearToPercent(year, range.min, range.max) / 100;
  const maxScroll = frame.scrollWidth - frame.clientWidth;
  const targetLeft = frame.scrollWidth * percent - frame.clientWidth * alignRatio;
  frame.scrollTo({
    left: Math.min(maxScroll, Math.max(0, targetLeft)),
    behavior: getScrollBehavior()
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

function selectComposer(id) {
  const composer = composers.find((item) => item.id === id);
  if (!composer) return;

  document.querySelectorAll(".composer-bar").forEach((bar) => {
    bar.classList.toggle("is-active", bar.dataset.id === id);
  });
  renderDetail(composer);
}

function renderDetail(composer) {
  const target = document.querySelector("[data-detail]");
  if (!target || !composer) return;

  target.innerHTML = `
    <h2>${composer.nameZh}</h2>
    <p class="detail-meta">
      <span>${composer.nameEn}</span>
      <span>${composer.birth}-${composer.death}</span>
      <span>${composer.country}</span>
    </p>
    <p class="detail-vibe">${composer.vibe}</p>
    <div class="detail-works" aria-label="先听这三首">
      ${composer.works.map((work) => `<span>${work}</span>`).join("")}
    </div>
    <p class="detail-next">${composer.next}</p>
  `;
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
