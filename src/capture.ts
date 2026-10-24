import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { buildCardPage, PAGE_WIDTH, type FocalPost, type Theme } from "./card-page.ts";

const run = promisify(execFile);

const COMPILE_TIMEOUT_MS = 180_000;
const RENDER_TIMEOUT_MS = 60_000;

export interface Renderer {
  /** Path of render.swift. */
  source: string;
  /** Directory that keeps the compiled renderer between runs. */
  cacheDir: string;
  /** Called before the one-time compile of the renderer. */
  onCompile?: () => void;
}

async function compiled({ source, cacheDir, onCompile }: Renderer): Promise<string> {
  const code = await readFile(source);
  const binary = join(cacheDir, `render-${createHash("sha256").update(code).digest("hex").slice(0, 12)}`);
  if (existsSync(binary)) return binary;

  onCompile?.();
  await mkdir(cacheDir, { recursive: true });
  const partial = `${binary}.${process.pid}`;
  try {
    await run("/usr/bin/swiftc", ["-O", source, "-o", partial], { timeout: COMPILE_TIMEOUT_MS });
  } catch (error) {
    throw new Error(
      `Compiling the renderer failed. Install the Xcode Command Line Tools (xcode-select --install). ${String(error).slice(0, 300)}`,
    );
  }
  await rename(partial, binary);
  return binary;
}

export async function renderPost(pageHtml: string, theme: Theme, focal: FocalPost, renderer: Renderer): Promise<Buffer> {
  const binary = await compiled(renderer);
  const dir = await mkdtemp(join(tmpdir(), "hw_raycast_xscreenshot-"));
  try {
    const page = join(dir, "card.html");
    const png = join(dir, "card.png");
    await writeFile(page, buildCardPage(pageHtml, theme, focal));
    await run(binary, [page, png, String(PAGE_WIDTH)], { timeout: RENDER_TIMEOUT_MS });
    return await readFile(png);
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
