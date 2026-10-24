# X Post Screenshot

A Raycast extension that turns the X (Twitter) post in your active browser tab into a clean screenshot on the clipboard.

1. Open a post, for example `https://x.com/<user>/status/<id>`, in any browser with the Raycast browser extension installed.
2. Run **Screenshot X Post** in Raycast.
3. Paste the image anywhere. Set a Save Folder in the extension preferences to keep a PNG as well.

The post's HTML is read from the page, parsed locally and rendered as a card (including a quoted post and the posts it replies to) (dark, dim or light) with a native WebKit renderer. Nothing leaves your machine.

## Requirements

- macOS, Raycast, and the [Raycast browser extension](https://www.raycast.com/browser-extension)
- Xcode Command Line Tools (`xcode-select --install`): the small renderer in `assets/render.swift` is compiled once on first use

## Development

```sh
npm install
npm run dev
```

## License

MIT
