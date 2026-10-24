export type Theme = "dark" | "dim" | "light";

export const PAGE_WIDTH = 656;

const CSS = `
:root[data-theme="dark"]{--bg:#000;--fg:#e7e9ea;--sec:#71767b;--border:#2f3336;--link:#1d9bf0;--backdrop:linear-gradient(135deg,#1a1a2e,#2d1b4e)}
:root[data-theme="dim"]{--bg:#15202b;--fg:#f7f9f9;--sec:#8b98a5;--border:#38444d;--link:#1d9bf0;--backdrop:linear-gradient(135deg,#10253f,#1f3a5f)}
:root[data-theme="light"]{--bg:#fff;--fg:#0f1419;--sec:#536471;--border:#eff3f4;--link:#1d9bf0;--backdrop:linear-gradient(135deg,#dbe6fd,#f2e3f8)}
*{box-sizing:border-box}
html,body{margin:0}
body{width:${PAGE_WIDTH}px;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.stage{padding:48px;background:var(--backdrop)}
.card{width:560px;background:var(--bg);color:var(--fg);border-radius:20px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.28),0 0 0 1px var(--border)}
.head{display:flex;align-items:center;gap:12px}
.avatar{width:48px;height:48px;flex:none;border-radius:50%;background:var(--border);object-fit:cover}
.who{min-width:0}
.name{display:flex;align-items:center;gap:4px;font-size:17px;font-weight:700;line-height:1.25}
.name svg{flex:none}
.handle{color:var(--sec);font-size:15px;line-height:1.25}
.text{margin-top:16px;font-size:23px;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere}
.link{color:var(--link)}
.media{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:2px;border-radius:16px;overflow:hidden;border:1px solid var(--border)}
.media.n1{grid-template-columns:1fr}
.m{position:relative;min-height:0;background:var(--border)}
.m img{display:block;width:100%;object-fit:cover}
.media:not(.n1) .m img{height:240px}
.media.n3 .m:first-child{grid-row:span 2}
.media.n3 .m:first-child img{height:482px}
.play{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(0,0,0,.6);border:3px solid #fff}
.play::after{content:"";position:absolute;left:25px;top:18px;border-style:solid;border-width:12px 0 12px 20px;border-color:transparent transparent transparent #fff}
.meta{margin-top:16px;color:var(--sec);font-size:15px}
.meta b{color:var(--fg);font-weight:700}
.stats{margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:6px 20px;color:var(--sec);font-size:15px}
.stats b{color:var(--fg);font-weight:700}
`;

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="11" fill="#1d9bf0"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const STATS: Record<string, string> = { reply: "Replies", retweet: "Reposts", like: "Likes", bookmark: "Bookmarks" };

// Runs inside the headless browser: parses the captured post HTML structurally
// (X's class names are generated; avatar alt, handle links, the pre-wrap text
// block and data-engagement-action are the stable hooks) and builds the card.
const CLIENT = `
(function () {
  try {
  var SRC = __SRC__;
  var STATS = __STATS__;
  var CHECK = __CHECK__;
  var doc = new DOMParser().parseFromString(SRC, "text/html");
  var art = doc.querySelector("article") || doc.body;
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function attr(n, a) { return n.getAttribute(a) || ""; }

  var avatar = Array.prototype.find.call(art.querySelectorAll("img"), function (i) { return /profile_images/.test(attr(i, "src")); });
  var handle = "";
  if (avatar && attr(avatar, "alt").charAt(0) === "@") handle = attr(avatar, "alt").slice(1);
  if (!handle) {
    var first = art.querySelector('a[href^="/"]');
    handle = first ? attr(first, "href").split("/")[1] : "";
  }
  var name = "";
  Array.prototype.forEach.call(art.querySelectorAll("a"), function (a) {
    var t = a.textContent.trim();
    if (!name && attr(a, "href") === "/" + handle && t && t.charAt(0) !== "@") name = t;
  });
  if (!handle || !name) throw new Error("author not found");

  var card = document.getElementById("card");
  var head = el("div", "head");
  if (avatar) {
    var av = el("img", "avatar");
    av.src = attr(avatar, "src").replace(/_(normal|x96|bigger|reasonably_small|mini)\\./, "_400x400.");
    av.onerror = function () { av.removeAttribute("src"); };
    head.appendChild(av);
  }
  var who = el("div", "who");
  var nm = el("div", "name");
  nm.appendChild(el("span", "", name));
  if (art.querySelector('[aria-label*="erified" i], [data-testid="icon-verified"]')) {
    var badge = el("span");
    badge.innerHTML = CHECK;
    nm.appendChild(badge);
  }
  who.appendChild(nm);
  who.appendChild(el("div", "handle", "@" + handle));
  head.appendChild(who);
  card.appendChild(head);

  var body = art.querySelector('[data-testid="tweetText"], .whitespace-pre-wrap');
  if (body) {
    var text = el("div", "text");
    (function walk(n, parent) {
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.nodeType === 3) parent.append(c.textContent);
        else if (c.nodeName === "BR") parent.append("\\n");
        else if (c.nodeName === "IMG") parent.append(attr(c, "alt"));
        else if (c.nodeName === "A") { var s = el("span", "link"); walk(c, s); parent.append(s); }
        else walk(c, parent);
      });
    })(body, text);
    card.appendChild(text);
  }

  var seen = {};
  var media = [];
  Array.prototype.forEach.call(art.querySelectorAll("img, video"), function (m) {
    var video = m.nodeName === "VIDEO";
    var src = video ? attr(m, "poster") : attr(m, "src");
    if (!/^https:\\/\\/pbs\\.twimg\\.com\\/(media|card_img|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)\\//.test(src) || seen[src]) return;
    seen[src] = true;
    media.push({ src: src.replace(/name=[a-z0-9]+/, "name=large"), video: video || /video_thumb/.test(src) });
  });
  if (media.length) {
    var grid = el("div", "media n" + Math.min(media.length, 4));
    media.slice(0, 4).forEach(function (m) {
      var cell = el("div", "m");
      var img = el("img");
      img.src = m.src;
      cell.appendChild(img);
      if (m.video) cell.appendChild(el("div", "play"));
      grid.appendChild(cell);
    });
    card.appendChild(grid);
  }

  var links = Array.prototype.filter.call(art.querySelectorAll('a[href*="/status/"]'), function (a) { return a.textContent.trim(); });
  var when = links.find(function (a) { return !/Views?\\s*$/.test(a.textContent); });
  var views = links.find(function (a) { return /Views?\\s*$/.test(a.textContent); });
  if (when || views) {
    var meta = el("div", "meta");
    if (when) meta.append(when.textContent.trim());
    if (views) {
      var parts = Array.prototype.map.call(views.querySelectorAll("div"), function (d) { return d.textContent.trim(); });
      var label = parts.length ? parts : [views.textContent.trim()];
      if (when) meta.append(" \\u00b7 ");
      var b = el("b", "", label[0]);
      meta.appendChild(b);
      if (label[1]) meta.append(" " + label[1]);
    }
    card.appendChild(meta);
  }

  var stats = el("div", "stats");
  Array.prototype.forEach.call(art.querySelectorAll("[data-engagement-action]"), function (a) {
    var label = STATS[attr(a, "data-engagement-action")];
    var count = a.querySelector(".x-animated-count-visual");
    if (label && count && count.textContent.trim()) {
      var s = el("span");
      s.appendChild(el("b", "", count.textContent.trim()));
      s.append(" " + label);
      stats.appendChild(s);
    }
  });
  if (!stats.children.length) {
    var group = art.querySelector('[role="group"][aria-label]');
    if (group) attr(group, "aria-label").split(/,\\s*/).forEach(function (part) {
      var m = /^([\\d.,KM]+)\\s+(.+)$/.exec(part);
      if (!m) return;
      var s = el("span");
      s.appendChild(el("b", "", m[1]));
      s.append(" " + m[2].charAt(0).toUpperCase() + m[2].slice(1));
      stats.appendChild(s);
    });
  }
  if (stats.children.length) card.appendChild(stats);

  var imgs = Array.prototype.slice.call(document.images);
  Promise.all(imgs.map(function (i) {
    return i.complete ? null : new Promise(function (r) { i.addEventListener("load", r); i.addEventListener("error", r); });
  })).then(function () {
    document.body.setAttribute("data-h", String(document.querySelector(".stage").offsetHeight));
  });
  } catch (e) {
    document.body.setAttribute("data-err", String((e && e.message) || e));
  }
})();
`;

export function buildCardPage(postHtml: string, theme: Theme): string {
  const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
  const script = CLIENT.replace("__SRC__", () => json(postHtml))
    .replace("__STATS__", () => json(STATS))
    .replace("__CHECK__", () => json(CHECK_SVG));
  return `<!doctype html>
<html data-theme="${theme}"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>${CSS}</style></head>
<body><div class="stage"><div class="card" id="card"></div></div>
<script>${script}</script></body></html>`;
}
