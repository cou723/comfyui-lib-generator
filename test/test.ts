#!/usr/bin/env -S deno run -A

import { ensureDir } from "jsr:@std/fs@1/ensure-dir";
import { emptyDir } from "jsr:@std/fs@1/empty-dir";
import { join } from "jsr:@std/path@1/join";
import { dirname } from "jsr:@std/path@1/dirname";
import { fromFileUrl } from "jsr:@std/path@1/from-file-url";

const __dirname = dirname(fromFileUrl(import.meta.url));

async function main() {
  const outputDir = join(__dirname, "output");
  const fixtureDir = join(__dirname, "fixtures");

  // 出力ディレクトリを初期化
  await emptyDir(outputDir);
  await ensureDir(outputDir);

  // ジェネレーターを実行
  const cliPath = join(__dirname, "..", "src", "cli.ts");
  const objectInfoPath = join(fixtureDir, "object_info.json");
  const checkpointDir = join(fixtureDir, "checkpoints");

  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "-A",
      cliPath,
      "--object-info",
      objectInfoPath,
      "--checkpoint-dir",
      checkpointDir,
      "--out",
      outputDir,
    ],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();
  if (code !== 0) {
    console.error("Generator failed");
    Deno.exit(code);
  }

  // 生成されたファイルに対して型チェックを実行
  const checkCommand = new Deno.Command(Deno.execPath(), {
    args: [
      "check",
      join(outputDir, "generated", "nodes.gen.ts"),
      join(outputDir, "generated", "registry.gen.ts"),
      join(outputDir, "generated", "kinds.gen.ts"),
      join(outputDir, "generated", "checkpoints.gen.ts"),
      join(outputDir, "core", "types.ts"),
      join(outputDir, "core", "graph.ts"),
    ],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code: checkCode } = await checkCommand.output();
  if (checkCode !== 0) {
    console.error("Type check failed");
    Deno.exit(checkCode);
  }

  console.log("\n✅ All tests passed!");
}

await main();
