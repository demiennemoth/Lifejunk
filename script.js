// ---------- Состояние ----------
const S = {
  day: 1,
  hour: 8,
  money: 200,
  stats: {
    health: 70,
    energy: 60,
    mood: 55,
    hunger: 40,
    hygiene: 65,
    social: 45,
  },
  activity: null,
  speed: 1,
  paused: false,
  buffs: {
    satietyUntil: 0,
    restedUntil: 0,
  },
  hidden: {
    dust: 0,
    fog: 0,
    fragility: 0,
    deaths: 0,
  },
  counters: {
    walk: 0,
    freelance: 0,
    daysNoShower: 0,
  },
  achievements: {},
  journal: [],
};

// ---------- Действия ----------
const actions = [
  {
    key: "sleep",
    name: "Поспать (4ч)",
    dur: 4,
    apply() {
      d("Сон. Ты и одеяло подписали перемирие. Бодрость на 8 часов.");
      S.buffs.restedUntil = Math.max(S.buffs.restedUntil, worldHours() + 8);
      mod({ energy: +40, health: +5, hunger: +5 });
      S.hidden.fragility = clamp(S.hidden.fragility - 10, 0, 100);
      S.hidden.fog = clamp(S.hidden.fog - 5, 0, 100);
      pushJournal("Сон", "Ты ненадолго отпустил(а) мир и крылья.");
    },
  },
  {
    key: "ramen",
    name: "Подкормиться (0.5ч)",
    dur: 0.5,
    apply() {
      moneyDelta(-5);
      mod({ hunger: -30, mood: +3 });
      S.buffs.satietyUntil = Math.max(S.buffs.satietyUntil, worldHours() + 6);
      d("Подкормиться. Солёная химия, но душе теплее. Сытость на 6 часов.");
      pushJournal("Питание", "Немного топлива, чтобы тянуть ещё один день.");
    },
  },
  {
    key: "shower",
    name: "Смыть пыль (0.5ч)",
    dur: 0.5,
    apply() {
      mod({ hygiene: +35, energy: +5 });
      d("Смыть пыль. Мир стал на 10% терпимее.");
      S.hidden.dust = clamp(S.hidden.dust - 25, 0, 100);
      S.counters.daysNoShower = 0;
      pushJournal("Смыть пыль", "Крылья стали чуть легче.");
    },
  },
  {
    key: "walk",
    name: "Изоляция в наушниках (1ч)",
    dur: 1,
    apply() {
      mod({ mood: +12, social: +2, energy: -6 });
      d("Изоляция в наушниках. Дома не стало меньше, но воздуха больше.");
      S.counters.walk++;
      S.hidden.fog = clamp(S.hidden.fog - 3, 0, 100);
      checkAchievements();
      pushJournal("Изоляция", "Музыка держит мир на расстоянии.");
    },
  },
  {
    key: "train",
    name: "Размять крылья (1ч)",
    dur: 1,
    apply() {
      mod({ energy: -12, health: +6, mood: +3 });
      d("Размять крылья. Тело вспомнило, что оно живое.");
      S.hidden.fragility = clamp(S.hidden.fragility + 8, 0, 100);
      pushJournal("Размять крылья", "Крылья ноют, но уважают тебя.");
    },
  },
  {
    key: "create",
    name: "Плетение проекта (2ч)",
    dur: 2,
    apply() {
      mod({ energy: -10, mood: +8 });
      d("Плетение проекта. Нити хаоса складываются во что-то своё.");
      S.hidden.fog = clamp(S.hidden.fog - 7, 0, 100);
      pushJournal("Плетение", "Ты снова доказал(а), что из хаоса что-то выходит.");
    },
  },
  {
    key: "freelance",
    name: "Ночной труд (2ч)",
    dur: 2,
    apply() {
      const cash = randInt(60, 120);
      moneyDelta(+cash);
      mod({ energy: -15, mood: -5, social: -3 });
      d(`Ночной труд. Продал(а) 2 часа жизни за ${cash}₽.`);
      S.counters.freelance++;
      S.hidden.fog = clamp(S.hidden.fog + 5, 0, 100);
      S.hidden.fragility = clamp(S.hidden.fragility + 4, 0, 100);
      checkAchievements();
      pushJournal("Ночной труд", "Ты обменял(а) тьму на деньги. Никто не заметил.");
    },
  },
  {
    key: "doom",
    name: "Интернет-выход (1ч)",
    dur: 1,
    apply() {
      const swing = Math.random() < 0.5 ? +4 : -6;
      mod({ energy: -8, mood: swing });
      if (swing > 0) {
        d("Интернет-выход. Нашёл(ла) что-то, что на мгновение согрело.");
      } else {
        d("Интернет-выход. Ещё одна дырка во внимании.");
      }
      S.hidden.fog = clamp(S.hidden.fog + 10, 0, 100);
      chanceEvent();
      pushJournal("Интернет", "Экран светится, а внутри темнее.");
    },
  },
];

// ---------- Хелперы UI ----------
function $(sel) {
  return document.querySelector(sel);
}

const dayEl = $("#day");
const clockEl = $("#clock");
const moneyEl = $("#money");
const actionsEl = $("#actions");
const logEl = $("#log");

function d(text) {
  const p = document.createElement("div");
  const ts = `[Д${S.day} ${fmtTime(S.hour)}]`;
  p.textContent = ts + " " + text;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function fmtTime(h) {
  const hh = Math.floor(h)
    .toString()
    .padStart(2, "0");
  const mm = Math.round((h % 1) * 60)
    .toString()
    .padStart(2, "0");
  return `${hh}:${mm}`;
}

function moneyDelta(delta) {
  S.money += delta;
  if (S.money < 0) S.money = 0;
}

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function mod(delta) {
  for (const k in delta) {
    S.stats[k] = clamp((S.stats[k] ?? 0) + delta[k]);
  }
  renderStats();
  checkCollapse();
}

// ---------- Статы ----------
function makeStatRow(container, label, key, invert) {
  const tpl = document.getElementById("stat-row");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector(".label").textContent = label;
  node.dataset.key = key;
  node.dataset.invert = invert ? "1" : "0";
  container.appendChild(node);
}

function renderStats() {
  moneyEl.textContent = S.money;
  dayEl.textContent = S.day;
  clockEl.textContent = fmtTime(S.hour);

  document.querySelectorAll("[data-key]").forEach((node) => {
    const key = node.dataset.key;
    const invert = node.dataset.invert === "1";
    const v = clamp(S.stats[key]);
    const shown = invert ? 100 - v : v;
    node.querySelector(".value").textContent = Math.round(shown) + "%";
  const bar = node.querySelector(".bar-inner");
  bar.style.width = shown + "%";
  bar.className =
    "bar-inner " +
    (shown <= 25
      ? "bg-red-500"
      : shown >= 70
      ? "bg-green-500"
      : "bg-blue-500");
  });

  updateMoodVisuals();
}

// ---------- UI init ----------
(function initUI() {
  const leftCol = document.querySelector('[data-stats-column="left"]');
  const rightCol = document.querySelector('[data-stats-column="right"]');

  makeStatRow(leftCol, "Энергия", "energy", false);
  makeStatRow(leftCol, "Здоровье", "health", false);
  makeStatRow(leftCol, "Настроение", "mood", false);

  makeStatRow(rightCol, "Голод", "hunger", true);
  makeStatRow(rightCol, "Гигиена", "hygiene", false);
  makeStatRow(rightCol, "Социальность", "social", false);

  actions.forEach((a) => {
    const btn = document.createElement("button");
    btn.className =
      "text-left px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800";
    btn.textContent = a.name;
    btn.onclick = () => startActivity(a);
    actionsEl.appendChild(btn);
  });

  document.querySelectorAll(".speed").forEach((b) => {
    b.onclick = () => {
      S.speed = Number(b.dataset.speed) || 1;
      d(`Скорость ${S.speed}×.`);
    };
  });

  document.getElementById("btn-pause").onclick = () => {
    S.paused = !S.paused;
    d(S.paused ? "Пауза. Жизнь подождёт." : "Продолжаем.");
  };

  document.getElementById("btn-save").onclick = saveGame;
  document.getElementById("btn-load").onclick = loadGame;
  document.getElementById("btn-new").onclick = () => {
    if (confirm("Начать новую жизнь? Текущий прогресс будет стёрт.")) {
      newGame();
    }
  };

  renderStats();
  d("Начало симуляции. День 1, 08:00.");
})();

// ---------- Время / ночь / новый день ----------
function worldHours() {
  return S.day * 24 + S.hour;
}

function isNight() {
  return S.hour >= 23 || S.hour < 5;
}

function onNewDay() {
  S.counters.daysNoShower++;
  const quotes = [
    "День начинается. Крылья всё ещё с тобой.",
    "Новый день. Туман никуда не делся, но ты тоже.",
    "Проснуться — уже достижение.",
    "Свет за окном не гарантирует света внутри.",
    "День снова начался без твоего согласия.",
  ];
  const q = quotes[(S.day - 1) % quotes.length];
  d(q);
  pushJournal("Новый день", q);
}

// ---------- Активности ----------
function startActivity(a) {
  if (S.activity) {
    d("Занят(а). Сначала закончи текущее.");
    return;
  }
  S.activity = { key: a.key, name: a.name, left: a.dur, apply: a.apply };
  d("Начал(а): " + a.name);
}

function tick(dt) {
  if (S.paused) return;

  S.hour += dt;
  while (S.hour >= 24) {
    S.hour -= 24;
    S.day++;
    onNewDay();
  }

  const wh = worldHours();

  const hungerRate = wh < S.buffs.satietyUntil ? 0.05 : 0.15;
  const energyRate = wh < S.buffs.restedUntil ? 0.05 : 0.2;
  const moodRate = 0.02;

  mod({
    energy: -energyRate * dt,
    hunger: +hungerRate * dt,
    mood: -moodRate * dt,
  });

  if (S.stats.hygiene < 60) {
    S.hidden.dust = clamp(S.hidden.dust + 0.3 * dt, 0, 100);
  } else {
    S.hidden.dust = clamp(S.hidden.dust - 0.1 * dt, 0, 100);
  }

  S.hidden.fog = clamp(S.hidden.fog - 0.05 * dt, 0, 100);

  if (S.hidden.dust > 70) {
    mod({ mood: -0.05 * dt });
  }

  if (S.hidden.fragility > 70) {
    mod({ health: -0.05 * dt });
  }

  if (S.activity) {
    S.activity.left -= dt;
    if (S.activity.left <= 0) {
      S.activity.apply();
      S.activity = null;
    }
  }

  if (isNight()) {
    const nightChance = 0.01 * dt + (S.hidden.fog / 2000) * dt;
    if (Math.random() < nightChance) {
      nightEvent();
    }
  }

  renderStats();
}

// ---------- Игровой цикл ----------
const TIME_SCALE = 2;
let lastTs = performance.now();

setInterval(() => {
  if (S.paused) {
    lastTs = performance.now();
    return;
  }
  const now = performance.now();
  const realHours = (now - lastTs) / 3_600_000;
  lastTs = now;
  const dt = realHours * TIME_SCALE * (S.speed || 1);
  tick(dt);
}, 1000);

// ---------- Ночные события / тень ----------
function nightEvent() {
  const roll = Math.random();
  if (roll < 0.4) {
    talkWithShadow();
  } else if (roll < 0.7) {
    windowKnock();
  } else {
    lampEvent();
  }
}

function talkWithShadow() {
  const phrases = [
    "Тень присела рядом: «Ты держишься лучше, чем думаешь».",
    "Тень шепчет: «Если бы ты был(а) слабее, тебя бы уже не было».",
    "Тень смотрит с интересом: «Опять выжил(а). Забавно».",
    "Тень: «Я не против, что ты устал(а). Я просто сижу здесь».",
  ];
  const text = phrases[randInt(0, phrases.length - 1)];
  d(text);
  pushJournal("Тень", text);
  mod({ mood: +3 });
}

function windowKnock() {
  const phrases = [
    "Стук в окно. Оказалось — ветер. Или нет.",
    "Что-то коснулось стекла. Ты решил(а) не уточнять, что.",
  ];
  const text = phrases[randInt(0, phrases.length - 1)];
  d(text);
  pushJournal("Окно", text);
  mod({ mood: -2, energy: -2 });
}

function lampEvent() {
  const phrases = [
    "Лампа моргнула. Крылья внутри тоже.",
    "Свет мигнул, и на секунду стало страшно, что он не вернётся.",
  ];
  const text = phrases[randInt(0, phrases.length - 1)];
  d(text);
  pushJournal("Лампа", text);
  S.hidden.fog = clamp(S.hidden.fog + 3, 0, 100);
}

// ---------- Случайные события ----------
function chanceEvent() {
  if (Math.random() < 0.25) {
    const roll = Math.random();
    if (roll < 0.5) {
      moneyDelta(+20);
      const txt = "Случай: на улице подобрал(а) 20₽. Карма в плюсе.";
      d(txt);
      pushJournal("Случай", txt);
    } else {
      moneyDelta(-20);
      const txt = "Случай: доставка взяла «непредвиденную комиссию» −20₽.";
      d(txt);
      pushJournal("Случай", txt);
    }
  }
}

// ---------- Достижения ----------
function unlockAchievement(key, title, desc) {
  if (S.achievements[key]) return;
  S.achievements[key] = true;
  d(`Достижение: ${title}. ${desc}`);
  pushJournal("Достижение", `${title}: ${desc}`);
}

function checkAchievements() {
  if (S.counters.walk >= 3) {
    unlockAchievement(
      "music_isolation",
      "Тёплый шум",
      "Трижды ушёл(ла) в изоляцию в наушниках."
    );
  }
  if (S.counters.freelance >= 5) {
    unlockAchievement(
      "night_worker",
      "Ночная смена",
      "Пять раз выходил(а) на ночной труд."
    );
  }
  if (S.counters.daysNoShower >= 4) {
    unlockAchievement(
      "dust",
      "Собранная пыль",
      "Четыре дня подряд не смывал(а) пыль."
    );
  }
}

// ---------- Сейвы локальные ----------
function saveGame() {
  const data = JSON.stringify(S);
  localStorage.setItem("lifesim.save.v1", data);
  d("Сейв выполнен.");
}

function loadGame() {
  const raw = localStorage.getItem("lifesim.save.v1");
  if (!raw) {
    d("Сейва нет.");
    return;
  }
  try {
    const s = JSON.parse(raw);
    Object.assign(S, s);
    renderStats();
    d("Сейв загружен.");
  } catch (e) {
    d("Не удалось загрузить сейв.");
  }
}

// ---------- Новая жизнь / смерть ----------
function newGame(keepMeta = true) {
  const deaths = keepMeta ? S.hidden.deaths : 0;

  S.day = 1;
  S.hour = 8;
  S.money = 200;
  S.speed = 1;
  S.paused = false;
  S.activity = null;
  S.stats = {
    health: 70,
    energy: 60,
    mood: 55,
    hunger: 40,
    hygiene: 65,
    social: 45,
  };
  S.buffs = {
    satietyUntil: 0,
    restedUntil: 0,
  };
  S.hidden = {
    dust: 0,
    fog: 0,
    fragility: 0,
    deaths: deaths,
  };
  S.counters = {
    walk: 0,
    freelance: 0,
    daysNoShower: 0,
  };
  S.achievements = S.achievements || {};
  S.journal = S.journal || [];
  renderStats();
  logEl.innerHTML = "";
  d("Новая жизнь. Пустой инвентарь, полная неопределённость.");
  if (deaths > 0) {
    d(`Крылья были сломаны уже ${deaths} раз.`);
  }
}

function checkCollapse() {
  const { health, energy, mood } = S.stats;
  if (health <= 1 || energy <= 1 || mood <= 1) {
    S.hidden.deaths = (S.hidden.deaths || 0) + 1;
    d("Крылья устали. Но туман держит.");
    pushJournal("Срыв", "Тело сдалось, но история продолжается.");
    setTimeout(() => {
      newGame(true);
    }, 50);
  }
}

// ---------- Журнал / визуал ----------
function pushJournal(title, text) {
  S.journal.push({
    day: S.day,
    hour: fmtTime(S.hour),
    title,
    text,
  });
}

function updateMoodVisuals() {
  const body = document.body;
  if (!body) return;

  body.dataset.time = isNight() ? "night" : "day";

  const { mood, energy, health } = S.stats;

  if (mood <= 30) body.dataset.mood = "low";
  else if (mood >= 70) body.dataset.mood = "high";
  else body.dataset.mood = "mid";

  if (energy <= 30) body.dataset.energy = "low";
  else body.dataset.energy = "ok";

  if (health <= 30) body.dataset.health = "fragile";
  else body.dataset.health = "normal";
}

// ---------- Утилиты ----------
function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

window.tick = tick;
window.S = S;
