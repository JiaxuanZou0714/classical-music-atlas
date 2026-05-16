import fs from "node:fs/promises";

const composers = JSON.parse(await fs.readFile("data/composers.json", "utf8"));
const publicSources = JSON.parse(await fs.readFile("data/public-sources.json", "utf8"));
const workSources = JSON.parse(await fs.readFile("data/work-sources.json", "utf8"));

const PERIOD_GUIDES = {
  Renaissance: {
    label: "文艺复兴",
    short: "先听声部之间的平衡，而不是寻找一个绝对主角。",
    listenFor: [
      "声部彼此模仿、错开、汇合，形成缓慢移动的空间感。",
      "终止式往往像光线落定，情绪克制但不冷。",
      "文字、礼仪和和声秩序比个人表情更重要。"
    ]
  },
  Baroque: {
    label: "巴洛克",
    short: "抓住低音、律动和装饰，戏剧性会自然显出来。",
    listenFor: [
      "持续低音和节奏型像骨架，推动乐句向前。",
      "装饰音不是炫技，而是语气、呼吸和强调。",
      "协奏、舞曲和声乐常把清晰结构变成舞台动作。"
    ]
  },
  Classical: {
    label: "古典主义",
    short: "先听比例和句法，再听作曲家如何打破平衡。",
    listenFor: [
      "乐句常成对出现，像问答、停顿和回应。",
      "主题清楚，发展部把熟悉材料推向陌生区域。",
      "幽默、惊讶和紧张往往藏在整齐结构里。"
    ]
  },
  Romantic: {
    label: "浪漫主义",
    short: "听主题如何带着记忆、欲望和音色不断变形。",
    listenFor: [
      "旋律更像叙事线，常被和声拖长或突然改写。",
      "管弦乐音色、钢琴触键和歌唱性承担大量情绪。",
      "个人声音更强，但仍要听它和传统结构的关系。"
    ]
  },
  Modern: {
    label: "现代主义",
    short: "先接受新的音色秩序，再寻找作品内部的重复和逻辑。",
    listenFor: [
      "调性、节奏和音色可能不再服务于传统终止感。",
      "小动机、配器和节拍重组常比长旋律更关键。",
      "不要急着判断好不好听，先听它如何组织时间。"
    ]
  }
};

const MOOD_GUIDES = {
  庄严: "注意留白、和声归宿和声部秩序，庄严感常来自克制。",
  戏剧性: "听冲突如何被推上前台，尤其是转调、强弱和声部对抗。",
  田园: "留意木管、舞曲节奏和开阔音区，它们常制造风景感。",
  水光: "把注意力放在泛音、踏板、配器边缘和模糊的和声轮廓。"
};

const PERIOD_ENTRY_CUES = {
  Renaissance: "声部怎样进入、模仿和收束",
  Baroque: "低音和节奏怎样支撑整首作品",
  Classical: "主题怎样被提出、回答和发展",
  Romantic: "旋律和音色怎样拉长情绪",
  Modern: "音色、节奏和动机怎样组织时间"
};

const sourceByComposer = new Map((publicSources.composers || []).map((source) => [source.composerId, source]));
const workByComposer = new Map();

for (const composer of workSources.composers || []) {
  workByComposer.set(composer.composerId, new Map((composer.works || []).map((work) => [work.title, work])));
}

const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source: "Generated from data/composers.json, data/public-sources.json, and data/work-sources.json. Public facts are source-backed; listening guidance is editorial.",
  composerCount: composers.length,
  periods: Object.entries(PERIOD_GUIDES).map(([id, guide]) => ({ id, ...guide })),
  composers: composers.map((composer) => buildComposerGuide(composer, sourceByComposer.get(composer.id)))
};

await fs.writeFile("data/listening-guides.json", `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote listening guides for ${payload.composerCount} composers.`);

function buildComposerGuide(composer, source) {
  const periodGuide = PERIOD_GUIDES[composer.period];
  const moodCues = composer.moods.map((mood) => MOOD_GUIDES[mood]).filter(Boolean);
  const sourceCue = buildSourceCue(source);
  const listenFor = unique([
    periodGuide?.listenFor?.[0],
    ...moodCues,
    sourceCue
  ]).slice(0, 3);

  return {
    composerId: composer.id,
    context: buildContext(composer, source),
    listenFor,
    entry: `入口可以从《${composer.works[0]}》开始，先抓${PERIOD_ENTRY_CUES[composer.period] || "作品如何组织时间"}，再回到整体气质。`,
    compare: composer.next,
    works: composer.works.map((title) => buildWorkGuide(composer, title))
  };
}

function buildContext(composer, source) {
  const parts = [];
  if (source?.description) parts.push(source.description);

  const publicDetail = [
    source?.citizenship?.length && `${source.citizenship.slice(0, 2).join(" / ")}传统或身份背景`,
    source?.genres?.length && `资料中关联到${source.genres.slice(0, 2).join(" / ")}`,
    source?.movements?.length && `常被放在${source.movements.slice(0, 2).join(" / ")}脉络中`
  ].filter(Boolean);

  if (publicDetail.length) parts.push(publicDetail[0]);
  if (!parts.length) parts.push(`${composer.period}时期作曲家，本站以时间线和代表作品作为入口。`);
  return `${parts.join("；")}。`;
}

function buildSourceCue(source) {
  if (source?.instruments?.length) {
    return `如果资料里出现${source.instruments.slice(0, 2).join(" / ")}，可以特别留意这些音色或键盘写法。`;
  }

  if (source?.genres?.length) {
    return `把${source.genres.slice(0, 2).join(" / ")}当作入口，先听体裁习惯，再听个人笔触。`;
  }

  return "";
}

function buildWorkGuide(composer, title) {
  const source = workByComposer.get(composer.id)?.get(title);
  return {
    title,
    note: workNote(title, composer.period, composer.moods),
    sourceStatus: source?.status || "UNSOURCED",
    sourceName: source?.musicBrainzWork ? "MusicBrainz" : "",
    sourceTitle: source?.musicBrainzWork?.title || "",
    sourceUrl: source?.musicBrainzWork?.url || ""
  };
}

function workNote(title, period, moods) {
  const lower = title.toLowerCase();

  if (/missa|mass|requiem|stabat|ave|te deum|cantata|motet/.test(lower)) {
    return "先听文字和声部怎样互相托住，别急着追旋律主线。";
  }

  if (/symphony|sinfonia/.test(lower)) {
    return "先抓主题轮廓和乐章之间的重量分配。";
  }

  if (/concerto|concerti|concert/.test(lower)) {
    return "注意独奏与合奏之间的距离、回应和推动。";
  }

  if (/sonata|quartet|quintet|suite|partita/.test(lower)) {
    return "把它当作室内对话，听材料怎样被拆开再组合。";
  }

  if (/opera|orfeo|armide|atys|carmen|tristan|falstaff|dido/.test(lower)) {
    return "先听人物语气和乐队色彩如何推动戏剧。";
  }

  if (moods.includes("水光")) return "留意音色边缘、踏板感和模糊的和声转向。";
  if (moods.includes("田园")) return "先听舞曲感、风景感和木管色彩。";
  if (period === "Modern") return "先听音色、节奏和短动机怎样建立秩序。";
  if (period === "Romantic") return "先听旋律如何被延长、回忆或突然改写。";

  return "先记住最清楚的主题，再听它下一次出现时变了什么。";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
