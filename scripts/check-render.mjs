import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPost } from "../src/capture.ts";

const html = await readFile(new URL("../fixtures/post.html", import.meta.url), "utf8");
const renderer = {
  source: fileURLToPath(new URL("../assets/render.swift", import.meta.url)),
  cacheDir: join(tmpdir(), "x-screenshot-check-cache"),
};

for (const theme of ["dark", "light"]) {
  const png = await renderPost(html, theme, renderer);
  assert.equal(png.subarray(1, 4).toString(), "PNG", "not a PNG");
  const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  assert.ok(width >= 656, `unexpected width ${width}`);
  assert.ok(height > 300, `card too short: ${height}`);
  const out = join(tmpdir(), `x-screenshot-check-${theme}.png`);
  await writeFile(out, png);
  console.log(`OK - ${theme}: ${width}x${height} ${out}`);
}
