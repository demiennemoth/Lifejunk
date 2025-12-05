// ---------- Состояние ----------
const S = {
  day: 1,
  hour: 8,
  money: 200,
  stats: { health: 70, energy: 60, mood: 55, hunger: 40, hygiene: 65, social: 45 },
  activity: null,
  speed: 1,
  paused: false,
  buffs: { satietyUntil: 0, restedUntil: 0 },
};

const actions = [
  {
    key: "sleep",
    name: "Поспать (4ч)",
    dur: 4,
    apply() {
      d("Сон. Ты и одеяло подписали перемирие. Бодрость на 8 часов.");
      S.buffs.restedUntil = Math.max(S.buffs.restedUntil, worldHours() + 8);
      mod({ energy: +40, health: +5, hunger: +5 });
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
    },
  },
  {
    key: "shower",
    name: "Смыть пыль (0.5ч)",
    dur: 0.5,
    apply() {
      mod({ hygiene: +35, energy: +5 });
      d("Смыть пыль. Мир стал на 10% терпимее.");
    },
  },
  {
    key: "walk",
    name: "Изоляция в наушниках (1ч)",
    dur: 1,
    apply() {
      mod({ mood: +12, social: +2, energy: -6 });
      d("Изоляция в наушниках. Дома не стало меньше, но воздуха больше.");
    },
  },
  {
    key: "train",
    name: "Размять крылья (1ч)",
    dur: 1,
    apply() {
      mod({ energy: -12, health: +6, mood: +3 });
      d("Размять крылья. Тело вспомнило, что оно живое.");
    },
  },
  {
    key: "create",
    name: "Плетение проекта (2ч)",
    dur: 2,
    apply() {
      mod({ energy: -10, mood: +8 });
      d("Плетение проекта. Нити хаоса складываются во что-то своё.");
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
    },
  },
  {
    key: "doom",
    name: "Интернет-выход (1ч)",
    dur: 1,
    apply() {
      const swing = Math.random() < 0.5 ? +4 : -6;
      mod({ energy: -8, mood: swing });
      d(
        swing > 0
          ? "Интернет-выход. Нашёл(ла) что-то, что на мгновение согрело."
          : "Интернет-выход. Ещё одна дырка во внимании."
      );
      chanceEvent();
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
}

// ---------- Статы ----------
const statKeys = [
  { k: "energy", label: "Энергия", invert: false },
  { k: "health", label: "Здоровье", invert: false },
  { k: "mood", label: "Настроение", invert: false },
  { k: "hunger", label: "Голод", invert: true },
  { k: "hygiene", label: "Гигиена", invert: false },
  { k: "social", label: "Социальность", invert: false },
];

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
}

// ---------- UI init ----------
(function initUI() {
  const leftCol = document.querySelector('[data-stats-column="left"]');
  const rightCol = document.querySelector('[data-stats-column="right"]');

  // Левая колонка
  makeStatRow(leftCol, "Энергия", "energy", false);
  makeStatRow(leftCol, "Здоровье", "health", false);
  makeStatRow(leftCol, "Настроение", "mood", false);

  // Правая колонка
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

// ---------- Время ----------
function worldHours() {
  return S.day * 24 + S.hour;
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

  // время
  S.hour += dt;
  while (S.hour >= 24) {
    S.hour -= 24;
    S.day++;
  }

  // пассивный дрейн с учётом баффов
  const wh = worldHours();
  const hungerRate = wh < S.buffs.satietyUntil ? 0.05 : 0.15;
  const energyRate = wh < S.buffs.restedUntil ? 0.05 : 0.2;
  const moodRate = 0.02;

  mod({
    energy: -energyRate * dt,
    hunger: +hungerRate * dt,
    mood: -moodRate * dt,
  });

  // активность
  if (S.activity) {
    S.activity.left -= dt;
    if (S.activity.left <= 0) {
      S.activity.apply();
      S.activity = null;
    }
  }

  renderStats();
}

// ---------- Игровой цикл ----------
// 12 реальных часов = 24 игровых (TIME_SCALE = 2)
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

// ---------- События ----------
function chanceEvent() {
  if (Math.random() < 0.25) {
    const roll = Math.random();
    if (roll < 0.5) {
      moneyDelta(+20);
      d("Случай: на улице подобрал(а) 20₽. Карма в плюсе.");
    } else {
      moneyDelta(-20);
      d("Случай: доставка взяла «непредвиденную комиссию» −20₽.");
    }
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

function newGame() {
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
  renderStats();
  logEl.innerHTML = "";
  d("Новая жизнь. Пустой инвентарь, полная неопределённость.");
}

// ---------- Утилиты ----------
function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// Делаем tick глобальным для firebase.js
window.tick = tick;
window.S = S;
