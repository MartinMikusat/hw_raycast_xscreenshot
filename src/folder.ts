import { homedir } from "node:os";
import { join } from "node:path";

export function screenshotFolder(saveFolder: string | undefined): string {
  return saveFolder || join(homedir(), "Pictures", "X Post Screenshots");
}
