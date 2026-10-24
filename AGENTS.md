# hw_raycast_xscreenshot

Raycast extension. "Screenshot X Post" reads the active browser tab (BrowserExtension API); if its URL is an x.com/twitter.com status, it fetches the page HTML, renders a styled card (with quoted post and thread ancestors) and puts the PNG on the clipboard and saves it as `x-<handle>-<id>.png` in the Save Folder (default `~/Pictures/X Post Screenshots`, Spotlight-indexed so Raycast Search Files finds it). "Open X Screenshot Folder" opens that folder.

- `src/screenshot-x-post.ts` - the command: tab detection, HTML fetch, clipboard (`osascript` as PNG data), toasts.
- `src/card-page.ts` - builds the card page. The captured HTML is embedded as a string; a client script parses it with `DOMParser` (X's DOM has no stable class names, so it keys on avatar `alt`, handle links, the pre-wrap text block, `data-engagement-action`) and builds the card with text/validated `https://pbs.twimg.com` URLs only.
- `src/capture.ts` + `assets/render.swift` - native WKWebView renderer. `swiftc` compiles it on first run into the extension support directory (needs Xcode Command Line Tools); Chromium headless is not used because Brave, the daily browser here, does not run headless.

The command passes the whole page HTML. The client script scopes every lookup to its own `<article>` (a quoted post is a nested `<article>`), takes the focal post by status id, and renders up to 4 preceding articles (thread ancestors, deduplicated by id) above it; replies after it are ignored. Only the first 4 media items show.

`npm run dev` loads it into Raycast. Gates: `npm run typecheck`, `npm run build`, `npm run check-render` (renders `fixtures/` post, thread and quote cases; needs network for the avatar and a GUI session).
