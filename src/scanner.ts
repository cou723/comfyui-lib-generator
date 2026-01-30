import { join } from "jsr:@std/path@1/join";

const MAX_CHECKPOINT_FILES = 256;

export async function scanCheckpointFiles(
  dirPath: string
): Promise<string[]> {
  const checkpoints: string[] = [];

  async function scanDir(currentPath: string, relativePath: string = "") {
    for await (const entry of Deno.readDir(currentPath)) {
      const entryRelativePath = relativePath
        ? join(relativePath, entry.name)
        : entry.name;

      if (entry.isDirectory) {
        await scanDir(join(currentPath, entry.name), entryRelativePath);
      } else if (entry.isFile) {
        if (entry.name.endsWith(".ckpt") || entry.name.endsWith(".safetensors")) {
          checkpoints.push(entryRelativePath);
        }
      }
    }
  }

  await scanDir(dirPath);
  return checkpoints.sort();
}

export type ScanResult =
  | { success: true; files: string[] }
  | { success: false; reason: string };

export async function scanCheckpointFilesSafe(
  dirPath: string | undefined
): Promise<ScanResult> {
  if (!dirPath) {
    return {
      success: false,
      reason: "--checkpoint-dirが指定されていないため、ckpt_nameはstring型となります",
    };
  }

  try {
    const files = await scanCheckpointFiles(dirPath);
    if (files.length === 0) {
      return {
        success: false,
        reason: `チェックポイントファイルが見つかりませんでした: ${dirPath}`,
      };
    }
    if (files.length > MAX_CHECKPOINT_FILES) {
      return {
        success: false,
        reason: `チェックポイントファイルが多すぎます（${files.length}個）。上限は${MAX_CHECKPOINT_FILES}個です`,
      };
    }
    return { success: true, files };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return {
        success: false,
        reason: `チェックポイントディレクトリが見つかりません: ${dirPath}`,
      };
    }
    return {
      success: false,
      reason: `チェックポイントディレクトリのスキャンに失敗しました: ${error}`,
    };
  }
}
