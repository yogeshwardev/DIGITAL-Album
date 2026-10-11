(() => {
"use strict";

const SITE = window.SITE, PHOTOS = window.PHOTOS || {}, STILLS = window.STILLS || {};
const FILMS = SITE.films;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const isTouch = matchMedia("(hover: none)").matches;
const isPhone = isTouch && Math.min(screen.width, screen.height) < 820;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem("wed-" + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("wed-" + k, JSON.stringify(v)); } catch {} },
};
const fmt = s => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`;
};
const mins = s => { const m = Math.max(1, Math.round(s / 60)); return `${m} నిమి`; };
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
};

/* ---------- text from config ---------- */
$$("[data-text]").forEach(el => { el.textContent = SITE[el.dataset.text] || ""; });

/* ---------- chapters ---------- */
FILMS.forEach((f, fi) => f.chapters.forEach((c, ci) => {
  c.film = fi; c.i = ci;
  c.end = ci < f.chapters.length - 1 ? f.chapters[ci + 1].t : f.duration;
}));
function chapterAt(film, t) {
  const ch = film.chapters; let k = 0;
  while (k < ch.length - 1 && t >= ch[k + 1].t - 0.5) k++;
  return k;
}
/* sprite thumbnails: one frame every 10s, 10x10 frames per sheet */
function spriteCss(film, t) {
  const idx = Math.min(Math.floor(t / 10), Math.floor((film.duration - 1) / 10));
  const sheet = Math.floor(idx / 100), within = idx % 100, col = within % 10, row = Math.floor(within / 10);
  return `background-image:url(media/previews/${film.id}-${sheet}.jpg);background-size:1000% 1000%;background-position:${col / 9 * 100}% ${row / 9 * 100}%`;
}
const thumbT = c => c.thumb ?? Math.min(c.t + Math.min(30, (c.end - c.t) / 2), c.end - 1);

/* ---------- back button closes overlays instead of leaving the site ---------- */
const overlays = [];
let skipPop = 0;
function pushOverlay(close) { overlays.push(close); history.pushState({ ov: overlays.length }, ""); }
function popOverlay(close) { const k = overlays.lastIndexOf(close); if (k >= 0) { overlays.splice(k, 1); skipPop++; history.back(); } }
addEventListener("popstate", () => { if (skipPop) { skipPop--; return; } const close = overlays.pop(); if (close) close(true); });

/* ======================================================================
   Music
   ====================================================================== */
const music = (() => {
  const audio = $("#audio"), title = $("#musicTitle"), sheet = $("#musicSheet"), bg = $("#sheetBg");
  const list = (window.PLAYLIST || []).slice();
  let i = 0, wanted = false, fadeTimer;
  for (let k = list.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [list[k], list[j]] = [list[j], list[k]]; }
  function label() { title.textContent = list.length ? "♪ " + list[i].title : "పాటలు లేవు — క్రింద బటన్‌తో జోడించండి"; }
  function load(n) { if (!list.length) return; i = (n + list.length) % list.length; audio.src = list[i].src; label(); }
  function fade(to, ms, done) {
    clearInterval(fadeTimer);
    const from = audio.volume, steps = 20; let k = 0;
    fadeTimer = setInterval(() => { k++; audio.volume = Math.max(0, Math.min(1, from + (to - from) * k / steps)); if (k >= steps) { clearInterval(fadeTimer); done && done(); } }, ms / steps);
  }
  function play() {
    if (!list.length) return;
    if (!audio.src) load(i);
    wanted = true; audio.volume = 0;
    audio.play().then(() => fade(0.85, 1200)).catch(() => {});
  }
  function pause(keepWanted) { if (!keepWanted) wanted = false; fade(0, 500, () => audio.pause()); }
  function sync() { const on = !audio.paused; document.body.classList.toggle("music-on", on); $("#musicToggle").innerHTML = on ? ICON.pause : ICON.play; }
  audio.onplay = audio.onpause = sync;
  audio.onended = () => { load(i + 1); audio.play().catch(() => {}); };
  audio.onerror = () => { if (list.length > 1) { list.splice(i, 1); load(i); if (wanted) audio.play().catch(() => {}); } };
  $("#musicToggle").onclick = () => (audio.paused ? (list.length ? play() : $("#musicAdd").click()) : pause());
  $("#musicNext").onclick = () => { if (!list.length) return; load(i + 1); wanted = true; audio.volume = .85; audio.play().catch(() => {}); };
  $("#musicPrev").onclick = () => { if (!list.length) return; load(i - 1); wanted = true; audio.volume = .85; audio.play().catch(() => {}); };
  $("#musicAdd").onchange = e => {
    const files = [...e.target.files]; if (!files.length) return;
    const start = list.length;
    files.forEach(f => list.push({ src: URL.createObjectURL(f), title: f.name.replace(/\.[^.]+$/, "") }));
    load(start); wanted = true; audio.volume = .85; audio.play().catch(() => {});
    e.target.value = "";
  };
  function openSheet() { sheet.classList.add("on"); bg.classList.add("on"); sheet.setAttribute("aria-hidden", "false"); pushOverlay(closeSheet); }
  function closeSheet(fromHistory) { sheet.classList.remove("on"); bg.classList.remove("on"); sheet.setAttribute("aria-hidden", "true"); if (!fromHistory) popOverlay(closeSheet); }
  $("#musicTab").onclick = openSheet;
  bg.onclick = () => closeSheet();
  let y0 = null;
  sheet.addEventListener("touchstart", e => { y0 = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener("touchend", e => { if (y0 != null && e.changedTouches[0].clientY - y0 > 60) closeSheet(); y0 = null; });
  label(); sync();
  return {
    ensure() { if (list.length && audio.paused) play(); },
    duck() { const was = !audio.paused; if (was) pause(true); return was; },
    resume(was) { if (was && wanted) play(); },
  };
})();

/* ======================================================================
   Curtain, hero, tabs
   ====================================================================== */
function start() {
  $("#curtain").classList.add("open");
  document.body.classList.add("started");
  document.body.classList.remove("locked");
  setTimeout(() => $("#curtain").classList.add("gone"), 1900);
}
$("#begin").onclick = () => { start(); music.ensure(); petals.burst(); };
if (location.hash.startsWith("#nointro")) {
  $("#curtain").classList.add("gone"); document.body.classList.add("started"); document.body.classList.remove("locked");
  const to = location.hash.split(":")[1]; if (to) setTimeout(() => document.getElementById(to)?.scrollIntoView(), 300);
}

(function hero() {
  const box = $("#heroSlides"), list = STILLS.hero || [];
  if (!list.length) return;
  const els = list.map(src => { const d = document.createElement("div"); d.style.backgroundImage = `url("${src}")`; box.appendChild(d); return d; });
  let n = 0; els[0].classList.add("on");
  if (els.length > 1) setInterval(() => { els[n].classList.remove("on"); n = (n + 1) % els.length; void els[n].offsetWidth; els[n].classList.add("on"); }, 7000);
})();
$("#watchBtn").onclick = () => player.open(0);

const tabIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const id = e.target.id === "moments" || e.target.id === "invite" ? "home" : e.target.id;
  $$(".tabbar [data-tab]").forEach(a => a.classList.toggle("on", a.dataset.tab === id));
}), { rootMargin: "-45% 0px -50% 0px" });
["home", "moments", "invite", "videos", "photos"].forEach(id => tabIO.observe(document.getElementById(id)));

/* ======================================================================
   Key moments, invitation, video lists
   ====================================================================== */
(function keyMoments() {
  const keys = FILMS.flatMap(f => f.chapters.filter(c => c.key)).sort((a, b) => a.key - b.key);
  $("#keyMoments").innerHTML = keys.map(c => {
    const f = FILMS[c.film];
    return `<button class="moment" data-f="${c.film}" data-c="${c.i}">
      <div class="thumb" style="${spriteCss(f, thumbT(c))}"><span class="num">${f.title}</span><span class="play">${ICON.play}</span></div>
      <div class="txt"><h3>${c.te}</h3><p>${c.en}</p></div></button>`;
  }).join("");
  $$("#keyMoments .moment").forEach(b => (b.onclick = () => { const c = FILMS[+b.dataset.f].chapters[+b.dataset.c]; player.open(c.film, c.t); }));
})();

(function invite() {
  const v = SITE.invite; if (!v) { $("#invite").remove(); return; }
  $("#inviteCard").innerHTML = `
    <p class="ttl">శుభలేఖ</p>
    <p class="sri">${v.hosts}<br>${v.line}</p>
    <p class="person">${v.groomLine}</p><p class="of">${v.groomOf}</p>
    <p class="weds">weds</p>
    <p class="person">${v.brideLine}</p><p class="of">${v.brideOf}</p>
    <div class="box"><b>శుభ ముహూర్తం:</b> ${v.muhurtham}<br><b>వేదిక:</b> ${SITE.venue}<br>${v.dinner}</div>`;
})();

let shownPart = 0;
function renderPart(fi) {
  shownPart = fi;
  const f = FILMS[fi], saved = store.get("pos-" + f.id) || 0, cur = saved ? chapterAt(f, saved) : -1;
  $$("#partTabs button").forEach((b, j) => b.classList.toggle("on", j === fi));
  $("#partBody").innerHTML = `
    <button class="part-banner" id="partBanner">
      <img src="${f.poster}" alt="" onerror="this.style.visibility='hidden'">
      <span class="badge"><span class="hd">HD</span><span>${fmt(f.duration)}</span></span>
      <div class="pb-txt"><div><h3>${f.title} · మొత్తం చూడండి</h3><p>${f.subtitle}</p></div><span class="pb-play">${ICON.play}</span></div>
      <div class="part-progress"><i style="width:${saved / f.duration * 100}%"></i></div>
    </button>
    <div class="chapters">${f.chapters.map((c, k) => `
      <button class="chap${c.key ? " key" : ""}${k === cur ? " now" : ""}" data-c="${k}">
        <div class="thumb" style="${spriteCss(f, thumbT(c))}"><b>${fmt(c.t)}</b>${k === cur ? `<i style="width:${(saved - c.t) / (c.end - c.t) * 100}%"></i>` : ""}</div>
        <div class="info"><span class="no">${String(k + 1).padStart(2, "0")} · ${mins(c.end - c.t)}</span><h4>${c.te}</h4><p>${c.en}</p></div>
      </button>`).join("")}</div>`;
  $("#partBanner").onclick = () => player.open(fi);
  $$("#partBody .chap").forEach(b => (b.onclick = () => player.open(fi, f.chapters[+b.dataset.c].t)));
}
$("#partTabs").innerHTML = FILMS.map(f => `<button role="tab">${f.title}<small>${f.subtitleEn}</small></button>`).join("");
$$("#partTabs button").forEach((b, j) => (b.onclick = () => renderPart(j)));
renderPart(0);

/* blessings */
(function () {
  const items = PHOTOS.blessings || [];
  if (!items.length) { $("#blessings").remove(); return; }
  $("#blessTrack").innerHTML = [...items, ...items].map(p => `<img src="${p.thumb}" alt="" loading="lazy">`).join("");
})();

/* galleries + reveal */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, delay = el.parentElement.classList.contains("masonry") ? (Number(el.dataset.k) % 2) * 80 : 0;
  setTimeout(() => el.classList.add("in"), delay); io.unobserve(el);
}), { threshold: .1, rootMargin: "0px 0px -30px 0px" });
function gallery(album) {
  const box = document.getElementById("gallery-" + album), items = PHOTOS[album] || [];
  box.innerHTML = items.map((p, k) => `<button data-k="${k}" aria-label="ఫోటో ${k + 1}"><img src="${p.thumb}" alt="" loading="lazy" width="640" height="${Math.round(640 / p.ratio)}"></button>`).join("");
  $$("button", box).forEach(b => { b.onclick = () => slideshow.open(album, +b.dataset.k); io.observe(b); });
}
gallery("little"); gallery("birthday");
$$(".reveal").forEach(el => io.observe(el));
$$("[data-slideshow]").forEach(b => (b.onclick = () => slideshow.open(b.dataset.slideshow, 0)));

/* ======================================================================
   Video player
   ====================================================================== */
const player = (() => {
  const wrap = $("#player"), stage = $("#stage"), v = $("#video"), seek = $("#seek"), panel = $("#panel");
  let fi = -1, ci = -1, uiTimer, musicWas = false, lastTap = 0, tapTimer, nextTimer, dragging = false, quality;
  quality = store.get("quality") || (isPhone ? "sd" : "hd");

  const film = () => FILMS[fi];
  const srcFor = f => (quality === "sd" && f.mobile ? f.mobile : f.src);

  function open(idx, t) {
    if (!wrap.classList.contains("open")) {
      wrap.classList.add("open"); wrap.setAttribute("aria-hidden", "false");
      document.body.classList.add("watching", "locked");
      musicWas = music.duck(); petals.pause();
      pushOverlay(close);
    }
    load(idx, t);
  }
  function close(fromHistory) {
    save(); v.pause();
    $("#nextUp").classList.remove("show"); clearInterval(nextTimer); panel.classList.remove("open");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    wrap.classList.remove("open"); wrap.setAttribute("aria-hidden", "true");
    document.body.classList.remove("watching", "locked");
    petals.resume(); music.resume(musicWas);
    renderPart(shownPart);
    if (!fromHistory) popOverlay(close);
  }
  function load(idx, t) {
    if (idx < 0 || idx >= FILMS.length) return;
    if (fi >= 0) save();
    const switching = idx !== fi; fi = idx;
    const f = film();
    let start = t, resumed = false;
    if (start == null) { const p = store.get("pos-" + f.id); if (p && p < f.duration - 20) { start = p; resumed = true; } }
    if (switching || !v.src) {
      v.poster = f.poster; v.src = srcFor(f);
      buildList(); buildTicks(); ci = -1;
      v.addEventListener("loadedmetadata", () => { if (start) v.currentTime = start; }, { once: true });
    } else if (start != null) v.currentTime = start;
    $("#pPart").textContent = `${f.title} · ${f.subtitle}`;
    $("#pQuality").textContent = quality === "sd" ? "SD" : "HD";
    $("#pQuality").classList.toggle("sd", quality === "sd");
    if (resumed) toast(`${fmt(start)} నుండి కొనసాగుతోంది <button id="restart">మొదటి నుండి</button>`, 5000);
    updateChapter(start || 0, true);
    v.play().catch(() => {});
    showUI();
  }
  /* if the phone version is missing, fall back to HD */
  v.addEventListener("error", () => {
    const f = film(); if (!f) return;
    if (v.currentSrc.includes("-mobile") && quality === "sd") { const t = v.currentTime; quality = "hd"; v.src = f.src; v.addEventListener("loadedmetadata", () => { v.currentTime = t; }, { once: true }); v.play().catch(() => {}); $("#pQuality").textContent = "HD"; }
  });
  function save() {
    const f = film(); if (!f || !v.currentTime) return;
    store.set("pos-" + f.id, v.currentTime > f.duration - 20 ? 0 : v.currentTime);
  }
  function toggle() { v.paused ? v.play() : v.pause(); }
  function skip(s) { v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + s)); showUI(); }
  function toast(html, ms = 2200) {
    const t = $("#toast"); t.innerHTML = html; t.classList.add("show");
    t.style.pointerEvents = t.querySelector("button") ? "auto" : "none";
    const r = $("#restart", t); if (r) r.onclick = () => { v.currentTime = 0; t.classList.remove("show"); };
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), ms);
  }
  function showUI() {
    stage.classList.remove("hide-ui"); clearTimeout(uiTimer);
    uiTimer = setTimeout(() => { if (!v.paused && !dragging) stage.classList.add("hide-ui"); }, 3500);
  }

  /* chapter tracking */
  function updateChapter(t, force) {
    const f = film(), k = chapterAt(f, t);
    if (k === ci && !force) return;
    ci = k; const c = f.chapters[k];
    $("#pChap").textContent = c.te; $("#nowTe").textContent = c.te; $("#nowEn").textContent = c.en;
    $$("#chapList .chap").forEach((b, j) => b.classList.toggle("now", j === k));
    const el = $$("#chapList .chap")[k];
    if (el) el.scrollIntoView({ block: "nearest", behavior: force ? "auto" : "smooth" });
  }
  function buildList() {
    const f = film();
    $("#chapList").innerHTML = f.chapters.map((c, k) => `
      <button class="chap${c.key ? " key" : ""}" data-c="${k}">
        <div class="thumb" style="${spriteCss(f, thumbT(c))}"><b>${fmt(c.t)}</b></div>
        <div class="info"><span class="no">${String(k + 1).padStart(2, "0")} · ${mins(c.end - c.t)}</span><h4>${c.te}</h4><p>${c.en}</p></div>
      </button>`).join("");
    $$("#chapList .chap").forEach(b => (b.onclick = () => { goChapter(+b.dataset.c); panel.classList.remove("open"); }));
    $$("#pPartTabs button").forEach((b, j) => b.classList.toggle("on", j === fi));
  }
  function buildTicks() { const f = film(); $("#ticks").innerHTML = f.chapters.slice(1).map(c => `<i style="left:${c.t / f.duration * 100}%"></i>`).join(""); }
  function goChapter(k) {
    const f = film();
    if (k < 0) { if (fi > 0) { const p = FILMS[fi - 1]; load(fi - 1, p.chapters[p.chapters.length - 1].t); } else v.currentTime = 0; return; }
    if (k >= f.chapters.length) { if (fi < FILMS.length - 1) load(fi + 1, 0); return; }
    v.currentTime = f.chapters[k].t; updateChapter(f.chapters[k].t, true); v.play().catch(() => {}); showUI();
    toast(f.chapters[k].te, 1600);
  }
  $("#chPrev").onclick = () => { const c = film().chapters[ci]; goChapter(v.currentTime - c.t > 6 ? ci : ci - 1); };
  $("#chNext").onclick = () => goChapter(ci + 1);
  $("#pPartTabs").innerHTML = FILMS.map(f => `<button>${f.title}<small>${f.subtitleEn}</small></button>`).join("");
  $$("#pPartTabs button").forEach((b, j) => (b.onclick = () => { if (j !== fi) load(j); }));

  /* video events */
  v.addEventListener("play", () => { $("#pPlay").innerHTML = ICON.pause; showUI(); });
  v.addEventListener("pause", () => { $("#pPlay").innerHTML = ICON.play; showUI(); save(); });
  ["waiting", "seeking"].forEach(e => v.addEventListener(e, () => stage.classList.add("waiting")));
  ["playing", "canplay", "seeked", "pause"].forEach(e => v.addEventListener(e, () => stage.classList.remove("waiting")));
  let lastSave = 0;
  v.addEventListener("timeupdate", () => {
    if (!dragging) paintBar(v.currentTime);
    updateChapter(v.currentTime);
    if (Date.now() - lastSave > 5000) { lastSave = Date.now(); save(); }
  });
  v.addEventListener("progress", () => {
    const b = v.buffered; if (!b.length || !v.duration) return;
    for (let k = 0; k < b.length; k++) if (b.start(k) <= v.currentTime + 1 && b.end(k) >= v.currentTime) { $("#seekBuf").style.width = b.end(k) / v.duration * 100 + "%"; break; }
  });
  v.addEventListener("ended", () => {
    store.set("pos-" + film().id, 0);
    if (fi < FILMS.length - 1) upNext(); else { toast("శుభం · ధన్యవాదాలు ❤", 4000); showUI(); }
  });
  $("#pPlay").innerHTML = ICON.play;

  function paintBar(t) {
    const d = v.duration || film().duration, p = t / d * 100;
    $("#seekFill").style.width = p + "%"; $("#seekKnob").style.left = p + "%";
    $("#pTime").textContent = `${fmt(t)} / ${fmt(d)}`;
  }

  /* seek bar with picture + chapter preview (touch and mouse) */
  const ratio = e => { const r = seek.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  function preview(r) {
    const f = film(), t = r * (v.duration || f.duration), sp = $("#seekPreview"), w = sp.offsetWidth || 150, sw = seek.offsetWidth;
    sp.style.left = Math.min(sw - w / 2, Math.max(w / 2, r * sw)) + "px";
    $("#spImg").setAttribute("style", spriteCss(f, t));
    $("#spChap").textContent = f.chapters[chapterAt(f, t)].te;
    $("#spTime").textContent = fmt(t);
    return t;
  }
  seek.addEventListener("pointerdown", e => { dragging = true; seek.setPointerCapture(e.pointerId); seek.classList.add("drag", "show-preview"); paintBar(preview(ratio(e))); showUI(); });
  seek.addEventListener("pointermove", e => {
    if (dragging) { paintBar(preview(ratio(e))); return; }
    if (e.pointerType === "mouse") { seek.classList.add("show-preview"); preview(ratio(e)); }
  });
  seek.addEventListener("pointerup", e => {
    if (!dragging) return;
    dragging = false; seek.classList.remove("drag", "show-preview");
    v.currentTime = ratio(e) * (v.duration || film().duration); showUI();
  });
  seek.addEventListener("pointercancel", () => { dragging = false; seek.classList.remove("drag", "show-preview"); });
  seek.addEventListener("pointerleave", e => { if (!dragging && e.pointerType === "mouse") seek.classList.remove("show-preview"); });

  /* taps on the picture: touch = show/hide controls, double-tap sides = skip 10s; mouse = play/pause */
  stage.addEventListener("pointerup", e => {
    if (e.target.closest("button,.seek,.next-up,.toast")) return;
    if (e.pointerType === "mouse") { toggle(); showUI(); return; }
    const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    const side = x < .35 ? -10 : x > .65 ? 10 : 0, now = Date.now();
    if (now - lastTap < 320 && side) {
      clearTimeout(tapTimer); skip(side);
      const z = $(side < 0 ? ".tap-zone.left" : ".tap-zone.right"); z.classList.remove("ripple"); void z.offsetWidth; z.classList.add("ripple");
      lastTap = now; return;
    }
    lastTap = now; clearTimeout(tapTimer);
    tapTimer = setTimeout(() => (stage.classList.contains("hide-ui") ? showUI() : (!v.paused && stage.classList.add("hide-ui"))), 300);
  });
  stage.addEventListener("dblclick", e => { if (!isTouch && !e.target.closest("button,.seek")) fullscreen(); });
  stage.addEventListener("mousemove", showUI);

  $("#pPlay").onclick = () => { toggle(); };
  $("#pBack").onclick = () => skip(-10);
  $("#pFwd").onclick = () => skip(10);
  const speeds = [1, 1.25, 1.5, 2, .75];
  $("#pSpeed").onclick = () => { const n = speeds[(speeds.indexOf(v.playbackRate) + 1) % speeds.length]; v.playbackRate = n; $("#pSpeed").textContent = n + "×"; showUI(); };
  $("#pQuality").onclick = () => {
    const f = film(); if (!f.mobile) return;
    quality = quality === "sd" ? "hd" : "sd"; store.set("quality", quality);
    const t = v.currentTime, playing = !v.paused;
    v.src = srcFor(f); v.addEventListener("loadedmetadata", () => { v.currentTime = t; if (playing) v.play().catch(() => {}); }, { once: true });
    $("#pQuality").textContent = quality === "sd" ? "SD" : "HD"; $("#pQuality").classList.toggle("sd", quality === "sd");
    toast(quality === "sd" ? "SD · తక్కువ డేటా (Data saver)" : "HD · అత్యుత్తమ నాణ్యత (Best quality)"); showUI();
  };
  $("#pClose").onclick = () => close();
  $("#pList").onclick = () => { panel.classList.add("open"); showUI(); };
  $("#panelClose").onclick = () => panel.classList.remove("open");
  function fullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (stage.requestFullscreen) stage.requestFullscreen().then(() => screen.orientation?.lock?.("landscape").catch(() => {})).catch(() => {});
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  }
  $("#pFull").onclick = fullscreen;

  function upNext() {
    const box = $("#nextUp"), f = FILMS[fi + 1];
    $("#nextTitle").textContent = `${f.title} · ${f.subtitle}`;
    let n = 5; $("#nextCount").textContent = n; box.classList.add("show");
    clearInterval(nextTimer);
    nextTimer = setInterval(() => { n--; $("#nextCount").textContent = n; if (n <= 0) go(); }, 1000);
    function go() { clearInterval(nextTimer); box.classList.remove("show"); load(fi + 1, 0); }
    $("#nextNow").onclick = go;
    $("#nextCancel").onclick = () => { clearInterval(nextTimer); box.classList.remove("show"); showUI(); };
  }

  document.addEventListener("keydown", e => {
    if (!wrap.classList.contains("open")) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") { e.preventDefault(); toggle(); }
    else if (k === "arrowright") skip(10);
    else if (k === "arrowleft") skip(-10);
    else if (k === "arrowup") { e.preventDefault(); v.volume = Math.min(1, v.volume + .1); }
    else if (k === "arrowdown") { e.preventDefault(); v.volume = Math.max(0, v.volume - .1); }
    else if (k === "f") fullscreen();
    else if (k === "m") v.muted = !v.muted;
    else if (k === "n") $("#chNext").click();
    else if (k === "p") $("#chPrev").click();
    else if (k === "escape" && !document.fullscreenElement) close();
    showUI();
  });
  addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  return { open };
})();

/* ======================================================================
   Photo slideshow
   ====================================================================== */
const slideshow = (() => {
  const box = $("#show"), A = $("#showA"), B = $("#showB");
  let items = [], i = 0, front = A, timer, playing = true, idleT, x0 = null;
  const DUR = 6000;
  function open(album, startAt) {
    items = PHOTOS[album] || []; if (!items.length) return;
    box.classList.add("open"); box.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked"); petals.pause(); music.ensure();
    playing = true; $("#showPlay").innerHTML = ICON.pause;
    i = startAt; show(true); wake();
    pushOverlay(close);
  }
  function close(fromHistory) {
    clearTimeout(timer);
    box.classList.remove("open"); box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked"); petals.resume();
    if (!fromHistory) popOverlay(close);
  }
  function show(first) {
    const p = items[i], back = front === A ? B : A, img = first ? front : back;
    $("#showCount").textContent = `${i + 1} / ${items.length}`;
    img.onload = () => {
      img.className = "on kb" + (1 + Math.floor(Math.random() * 3));
      if (!first) { front.className = ""; front = img; }
      $("#showBg").style.backgroundImage = `url("${p.thumb}")`;
      new Image().src = items[(i + 1) % items.length].src;
    };
    img.src = p.src;
    if (img.complete && img.naturalWidth) img.onload();
    bar(); clearTimeout(timer);
    if (playing) timer = setTimeout(() => go(1), DUR);
  }
  function bar() {
    const el = $("#showBar"); el.style.transition = "none"; el.style.width = "0";
    if (!playing) return;
    void el.offsetWidth; el.style.transition = `width ${DUR}ms linear`; el.style.width = "100%";
  }
  function go(d) { i = (i + d + items.length) % items.length; show(false); wake(); }
  function togglePlay() { playing = !playing; $("#showPlay").innerHTML = playing ? ICON.pause : ICON.play; if (playing) go(1); else { clearTimeout(timer); bar(); } }
  function wake() { box.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => box.classList.add("idle"), 2800); }
  $("#showClose").onclick = () => close();
  $("#showPrev").onclick = () => go(-1);
  $("#showNext").onclick = () => go(1);
  $("#showPlay").onclick = togglePlay;
  box.addEventListener("pointermove", wake);
  box.addEventListener("pointerdown", e => { x0 = e.clientX; wake(); });
  box.addEventListener("pointerup", e => { if (x0 != null && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1); x0 = null; });
  document.addEventListener("keydown", e => {
    if (!box.classList.contains("open")) return;
    if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === " ") { e.preventDefault(); togglePlay(); } else if (e.key === "Escape") close();
    wake();
  });
  return { open };
})();

/* ======================================================================
   Marigold petals
   ====================================================================== */
var petals = (() => {
  const cv = $("#petals"), cx = cv.getContext("2d");
  const COLORS = ["#ff9f1c", "#ffbf3c", "#ff7a00", "#ffd166", "#e2577a", "#f4a259"];
  let W, H, dpr, list = [], running = true, raf;
  function size() { dpr = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; }
  size(); addEventListener("resize", size);
  const base = innerWidth < 640 ? 12 : 24;
  function make(top) {
    return { x: Math.random() * W, y: top ? -Math.random() * H * .3 : Math.random() * H, r: (5 + Math.random() * 7) * dpr,
      vy: (.4 + Math.random() * .9) * dpr, vx: (Math.random() - .5) * .6 * dpr, a: Math.random() * 6.28, va: (Math.random() - .5) * .04,
      sw: Math.random() * 6.28, c: COLORS[Math.floor(Math.random() * COLORS.length)], life: Infinity };
  }
  for (let k = 0; k < base; k++) list.push(make(false));
  function draw() {
    cx.clearRect(0, 0, W, H);
    for (let k = list.length - 1; k >= 0; k--) {
      const p = list[k];
      p.sw += .02; p.y += p.vy; p.x += p.vx + Math.sin(p.sw) * .6 * dpr; p.a += p.va;
      if (p.y > H + 20) { if (p.life !== Infinity) { list.splice(k, 1); continue; } Object.assign(p, make(true)); }
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.scale(1, .55 + .45 * Math.sin(p.sw * 2));
      cx.fillStyle = p.c; cx.globalAlpha = .85;
      cx.beginPath(); cx.ellipse(0, 0, p.r, p.r * .6, 0, 0, 6.28); cx.fill();
      cx.globalAlpha = .35; cx.fillStyle = "#fff"; cx.beginPath(); cx.ellipse(-p.r * .25, -p.r * .15, p.r * .35, p.r * .18, 0, 0, 6.28); cx.fill();
      cx.restore();
    }
    if (running) raf = requestAnimationFrame(draw);
  }
  if (!reduced) draw();
  return {
    burst() { if (reduced) return; const n = innerWidth < 640 ? 45 : 100; for (let k = 0; k < n; k++) { const p = make(true); p.vy *= 2.2; p.life = 1; list.push(p); } },
    pause() { running = false; cancelAnimationFrame(raf); cx.clearRect(0, 0, W, H); },
    resume() { if (!running && !reduced) { running = true; draw(); } },
  };
})();

})();
