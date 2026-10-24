import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { BrowserExtension, Toast, environment, getPreferenceValues, showHUD, showToast } from "@raycast/api";

import type { Theme } from "./card-page.ts";
import { renderPost } from "./capture.ts";

const run = promisify(execFile);

const POST_URL = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([^/?#]+)\/status\/(\d+)/;
const COPY_IMAGE = [
  "-e",
  "on run argv",
  "-e",
  "set the clipboard to (read (POSIX file (item 1 of argv)) as «class PNGf»)",
  "-e",
  "end run",
];

export default async function main() {
  const { theme, saveFolder } = getPreferenceValues<Preferences>();

  try {
    if (!environment.canAccess(BrowserExtension)) {
      throw new Error("Install Raycast's browser extension, then try again.");
    }
    const tab = (await BrowserExtension.getTabs()).find((t) => t.active && POST_URL.test(t.url));
    const id = tab && POST_URL.exec(tab.url)?.[2];
    if (!tab || !id) throw new Error("The active browser tab is not an X post.");

    const html = await BrowserExtension.getContent({ tabId: tab.id, format: "html" });
    if (!html.includes("<article")) throw new Error("No post found on the page yet. Wait for it to load.");

    const png = await renderPost(html, theme as Theme, { id }, {
      source: join(environment.assetsPath, "render.swift"),
      cacheDir: environment.supportPath,
    });

    const file = join(saveFolder || environment.supportPath, `x-post-${id}.png`);
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, png);
    await run("osascript", [...COPY_IMAGE, file]);

    await showHUD("Copied X post screenshot");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Screenshot failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
