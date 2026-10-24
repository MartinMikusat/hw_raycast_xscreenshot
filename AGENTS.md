# hw_raycast_xscreenshot

Raycast extension. "Screenshot X Post" reads the active browser tab (BrowserExtension API); if its URL is an x.com/twitter.com status, it fetches the post's `<article>` HTML, renders a styled card and puts the PNG on the clipboard (and into the optional Save Folder).

- `src/screenshot-x-post.ts` - the command: tab detection, HTML fetch, clipboard (`osascript` as PNG data), toasts.
- `src/card-page.ts` - builds the card page. The captured HTML is embedded as a string; a client script parses it with `DOMParser` (X's DOM has no stable class names, so it keys on avatar `alt`, handle links, the pre-wrap text block, `data-engagement-action`) and builds the card with text/validated `https://pbs.twimg.com` URLs only.
- `src/capture.ts` + `assets/render.swift` - native WKWebView renderer. `swiftc` compiles it on first run into the extension support directory (needs Xcode Command Line Tools); Chromium headless is not used because Brave, the daily browser here, does not run headless.

Known gaps: quoted posts and threads are not rendered; only the first 4 media items show.

`npm run dev` loads it into Raycast. Gates: `npm run typecheck`, `npm run build`, `npm run check-render` (renders `fixtures/post.html` in dark and light; needs network for the avatar and a GUI session).
