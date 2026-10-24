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
.media.n1 .m img{max-height:520px}
.media:not(.n1) .m img{height:240px}
.media.n3 .m:first-child{grid-row:span 2}
.media.n3 .m:first-child img{height:482px}
.play{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(0,0,0,.6);border:3px solid #fff}
.play::after{content:"";position:absolute;left:25px;top:18px;border-style:solid;border-width:12px 0 12px 20px;border-color:transparent transparent transparent #fff}
.parent{display:flex;gap:12px}
.pcol{display:flex;flex-direction:column;align-items:center;flex:none}
.line{flex:1;width:2px;margin:4px 0;background:var(--border)}
.pbody{min-width:0;flex:1;padding-bottom:20px}
.ptop{display:flex;align-items:baseline;gap:6px;font-size:15px;white-space:nowrap}
.pname{font-size:16px}
.parent .text{margin-top:4px;font-size:18px}
.parent .media{margin-top:10px}
.quote{margin-top:14px;padding:12px 14px;border:1px solid var(--border);border-radius:16px}
.qhead{display:flex;align-items:center;gap:6px;font-size:15px;white-space:nowrap}
.qavatar{width:22px;height:22px;border-radius:50%;background:var(--border);object-fit:cover}
.qname{display:flex;align-items:center;gap:3px;font-weight:700}
.qname svg{width:15px;height:15px}
.qhandle{color:var(--sec)}
.quote .text{margin-top:6px;font-size:17px}
.quote .media{margin-top:10px;border-radius:12px}
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
  var FOCAL = __FOCAL__;
  var STATS = __STATS__;
  var CHECK = __CHECK__;
  var MAX_PARENTS = 4;
  var doc = new DOMParser().parseFromString(SRC, "text/html");
  Array.prototype.forEach.call(doc.querySelectorAll("script, style"), function (n) { n.remove(); });
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function attr(n, a) { return n.getAttribute(a) || ""; }
  function imgSrc(i) {
    var src = attr(i, "src");
    return /^https:/.test(src) ? src : attr(i, "srcset").split(/\\s+/)[0];
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function own(art, sel) {
    return Array.prototype.filter.call(art.querySelectorAll(sel), function (e) { return e.closest("article") === art; });
  }
  function inCard(n, art) {
    var r = n.parentElement && n.parentElement.closest('[role="link"]');
    return !!r && r !== art && art.contains(r);
  }

  function info(art) {
    var profiles = own(art, "img").filter(function (i) { return /profile_images/.test(imgSrc(i)); });
    var avatar = profiles.find(function (i) { return attr(i, "alt").charAt(0) === "@"; }) || profiles[0];
    var handle = avatar && attr(avatar, "alt").charAt(0) === "@" ? attr(avatar, "alt").slice(1) : "";
    if (!handle && avatar) {
      var al = avatar.closest("a[href]");
      handle = al ? attr(al, "href").split("/")[1] : "";
    }
    if (!handle) {
      var first = own(art, 'a[href^="/"]')[0];
      handle = first ? attr(first, "href").split("/")[1] : "";
    }
    var name = "";
    own(art, "a").forEach(function (a) {
      var t = a.textContent.trim();
      if (!name && attr(a, "href") === "/" + handle && t && t.charAt(0) !== "@") name = t;
    });
    var seen = {};
    var media = [];
    own(art, "img, video").forEach(function (m) {
      var video = m.nodeName === "VIDEO";
      var src = video ? attr(m, "poster") : attr(m, "src");
      if (!/^https:\\/\\/pbs\\.twimg\\.com\\/(media|card_img|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)\\//.test(src) || seen[src]) return;
      seen[src] = true;
      media.push({ src: src.replace(/name=[a-z0-9]+/, "name=large"), video: video || /video_thumb/.test(src) });
    });
    var links = own(art, 'a[href*="/status/"]').filter(function (a) { return !inCard(a, art) && a.textContent.trim(); });
    var id = "";
    links.concat(own(art, 'a[href*="/status/"]')).some(function (a) {
      var m = /^\\/([^/]+)\\/status\\/(\\d+)$/.exec(attr(a, "href"));
      if (m && m[1].toLowerCase() === handle.toLowerCase() && !inCard(a, art)) { id = m[2]; return true; }
      return false;
    });
    return {
      art: art,
      id: id,
      handle: handle,
      name: name,
      avatar: avatar ? imgSrc(avatar).replace(/_(normal|x96|bigger|reasonably_small|mini)\\./, "_400x400.") : "",
      verified: own(art, '[aria-label*="erified" i], [data-testid="icon-verified"]').length > 0,
      text: own(art, '[data-testid="tweetText"], .whitespace-pre-wrap')[0],
      media: media,
      links: links,
      quote: Array.prototype.find.call(art.querySelectorAll("article"), function (q) { return q.parentElement.closest("article") === art; })
    };
  }

  function avatarEl(i, cls) {
    var av = el("img", cls);
    av.crossOrigin = "anonymous";
    if (i.avatar) av.src = i.avatar;
    av.onerror = function () { av.removeAttribute("src"); };
    return av;
  }
  function nameEl(i, cls) {
    var nm = el("div", cls);
    nm.appendChild(el("span", "", i.name || i.handle));
    if (i.verified) {
      var badge = el("span");
      badge.innerHTML = CHECK;
      nm.appendChild(badge);
    }
    return nm;
  }
  function whenOf(i) {
    var l = i.links.find(function (a) { return !/Views?\\s*$/.test(a.textContent); });
    return l ? l.textContent.trim() : "";
  }
  function textEl(i) {
    var text = el("div", "text");
    (function walk(n, parent) {
      each(n.childNodes, function (c) {
        if (c.nodeType === 3) parent.append(c.textContent);
        else if (c.nodeName === "BR") parent.append("\\n");
        else if (c.nodeName === "IMG") parent.append(attr(c, "alt"));
        else if (c.nodeName === "A") { var s = el("span", "link"); walk(c, s); parent.append(s); }
        else walk(c, parent);
      });
    })(i.text, text);
    return text;
  }
  function body(box, i) {
    if (i.text) box.appendChild(textEl(i));
    if (i.media.length) {
      var grid = el("div", "media n" + Math.min(i.media.length, 4));
      i.media.slice(0, 4).forEach(function (m) {
        var cell = el("div", "m");
        var img = el("img");
        img.crossOrigin = "anonymous";
        img.src = m.src;
        cell.appendChild(img);
        if (m.video) cell.appendChild(el("div", "play"));
        grid.appendChild(cell);
      });
      box.appendChild(grid);
    }
    if (i.quote) {
      var q = info(i.quote);
      var card = el("div", "quote");
      var qh = el("div", "qhead");
      qh.appendChild(avatarEl(q, "qavatar"));
      qh.appendChild(nameEl(q, "qname"));
      qh.appendChild(el("span", "qhandle", "@" + q.handle));
      var qw = whenOf(q);
      if (qw) qh.appendChild(el("span", "qhandle", "\\u00b7 " + qw));
      card.appendChild(qh);
      body(card, q);
      box.appendChild(card);
    }
  }

  var tops = Array.prototype.filter.call(doc.querySelectorAll("article"), function (a) { return !a.parentElement.closest("article"); });
  var posts = tops.map(info);
  var focalIndex = -1;
  posts.forEach(function (p, n) {
    if (p.id === FOCAL.id) focalIndex = n;
  });
  if (focalIndex < 0) focalIndex = 0;
  var focal = posts[focalIndex];
  if (!focal) throw new Error("post not found");
  if (!focal.handle || !focal.name) throw new Error("author not found");

  var parents = [];
  var taken = {};
  posts.slice(0, focalIndex).forEach(function (p) {
    if (!p.id || p.id === focal.id || !p.handle) return;
    if (taken[p.id]) parents.splice(parents.indexOf(taken[p.id]), 1);
    taken[p.id] = p;
    parents.push(p);
  });

  var card = document.getElementById("card");
  parents.slice(-MAX_PARENTS).forEach(function (p) {
    var row = el("div", "parent");
    var col = el("div", "pcol");
    col.appendChild(avatarEl(p, "avatar"));
    col.appendChild(el("div", "line"));
    var main = el("div", "pbody");
    var top = el("div", "ptop");
    top.appendChild(nameEl(p, "name pname"));
    top.appendChild(el("span", "handle", "@" + p.handle));
    var pw = whenOf(p);
    if (pw) top.appendChild(el("span", "handle", "\\u00b7 " + pw));
    main.appendChild(top);
    body(main, p);
    row.appendChild(col);
    row.appendChild(main);
    card.appendChild(row);
  });

  var post = el("div", "focal");
  var head = el("div", "head");
  head.appendChild(avatarEl(focal, "avatar"));
  var who = el("div", "who");
  who.appendChild(nameEl(focal, "name"));
  who.appendChild(el("div", "handle", "@" + focal.handle));
  head.appendChild(who);
  post.appendChild(head);
  body(post, focal);

  var when = focal.links.find(function (a) { return !/Views?\\s*$/.test(a.textContent); });
  var views = focal.links.find(function (a) { return /Views?\\s*$/.test(a.textContent); });
  if (when || views) {
    var meta = el("div", "meta");
    if (when) meta.append(when.textContent.trim());
    if (views) {
      var parts = Array.prototype.map.call(views.querySelectorAll("div"), function (d) { return d.textContent.trim(); });
      var label = parts.length ? parts : [views.textContent.trim()];
      if (when) meta.append(" \\u00b7 ");
      meta.appendChild(el("b", "", label[0]));
      if (label[1]) meta.append(" " + label[1]);
    }
    post.appendChild(meta);
  }

  var stats = el("div", "stats");
  own(focal.art, "[data-engagement-action]").forEach(function (a) {
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
    var group = own(focal.art, '[role="group"][aria-label]')[0];
    if (group) attr(group, "aria-label").split(/,\\s*/).forEach(function (part) {
      var m = /^([\\d.,KM]+)\\s+(.+)$/.exec(part);
      if (!m) return;
      var s = el("span");
      s.appendChild(el("b", "", m[1]));
      s.append(" " + m[2].charAt(0).toUpperCase() + m[2].slice(1));
      stats.appendChild(s);
    });
  }
  if (stats.children.length) post.appendChild(stats);
  card.appendChild(post);

  function palette(imgs) {
    var buckets = [];
    for (var k = 0; k < 12; k++) buckets.push({ w: 0, r: 0, g: 0, b: 0 });
    imgs.forEach(function (img) {
      if (!img.naturalWidth) return;
      try {
        var cv = document.createElement("canvas");
        cv.width = cv.height = 24;
        var cx = cv.getContext("2d");
        cx.drawImage(img, 0, 0, 24, 24);
        var d = cx.getImageData(0, 0, 24, 24).data;
        for (var p = 0; p < d.length; p += 4) {
          var r = d[p], g = d[p + 1], b = d[p + 2];
          var mx = Math.max(r, g, b), dl = mx - Math.min(r, g, b);
          var v = mx / 255, sat = mx ? dl / mx : 0;
          if (d[p + 3] < 200 || v < 0.3 || sat < 0.25) continue;
          var h = mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
          var bk = buckets[Math.floor(h * 2) % 12];
          var w = sat * v;
          bk.w += w; bk.r += r * w; bk.g += g * w; bk.b += b * w;
        }
      } catch (e) {}
    });
    return buckets.filter(function (x) { return x.w > 0; })
      .sort(function (x, y) { return y.w - x.w; })
      .slice(0, 3)
      .map(function (x) { return [x.r / x.w, x.g / x.w, x.b / x.w]; });
  }
  function backdrop(colors) {
    var light = document.documentElement.getAttribute("data-theme") === "light";
    var base = light ? [255, 255, 255] : [12, 12, 20];
    var t = light ? 0.45 : 0.55;
    var css = colors.map(function (c) {
      return "rgb(" + c.map(function (v, n) { return Math.round(v * t + base[n] * (1 - t)); }).join(",") + ")";
    });
    if (css.length === 1) css.push(css[0]);
    return "linear-gradient(135deg," + css.join(",") + ")";
  }

  Promise.all(Array.prototype.map.call(document.images, function (i) {
    return i.complete ? null : new Promise(function (r) { i.addEventListener("load", r); i.addEventListener("error", r); });
  })).then(function () {
    var colors = palette(Array.prototype.slice.call(document.images));
    var stage = document.querySelector(".stage");
    if (colors.length) stage.style.setProperty("--backdrop", backdrop(colors));
    document.body.setAttribute("data-h", String(stage.offsetHeight));
  });
  } catch (e) {
    document.body.setAttribute("data-err", String((e && e.message) || e));
  }
})();
`;

export interface FocalPost {
  id: string;
}

export function buildCardPage(pageHtml: string, theme: Theme, focal: FocalPost): string {
  const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
  const script = CLIENT.replace("__SRC__", () => json(pageHtml))
    .replace("__FOCAL__", () => json(focal))
    .replace("__STATS__", () => json(STATS))
    .replace("__CHECK__", () => json(CHECK_SVG));
  return `<!doctype html>
<html data-theme="${theme}"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>${CSS}</style></head>
<body><div class="stage"><div class="card" id="card"></div></div>
<script>${script}</script></body></html>`;
}
