import { parseArgs } from "jsr:@std/cli@1/parse-args";
import { copy } from "jsr:@std/fs@1/copy";
import { ensureDir } from "jsr:@std/fs@1/ensure-dir";
import { exists } from "jsr:@std/fs@1/exists";
import { dirname } from "jsr:@std/path@1/dirname";
import { fromFileUrl } from "jsr:@std/path@1/from-file-url";
import { join } from "jsr:@std/path@1/join";
import { resolve } from "jsr:@std/path@1/resolve";

import { generateLibrary } from "./generator.ts";

const args = parseArgs(Deno.args, {
  string: ["object-info", "out"],
  boolean: ["force"],
  alias: {
    o: "object-info",
    d: "out",
    f: "force",
  },
  default: {
    out: "lib/comfy-ui",
  },
});

const objectInfoPath = resolve(args["object-info"] ?? "object_info.json");
const libraryRoot = resolve(args["out"]);
const force = Boolean(args["force"]);

if (!(await exists(objectInfoPath))) {
  console.error(`object_info.json not found at: ${objectInfoPath}`);
  Deno.exit(1);
}

await installTemplate(libraryRoot, force);
await generateLibrary({ objectInfoPath, libraryRoot });

console.log(`Generated ComfyUI bindings at ${libraryRoot}`);

async function installTemplate(libraryTarget: string, force: boolean) {
  const hasCore = await exists(join(libraryTarget, "core"));
  if (hasCore && !force) {
    return;
  }

  await ensureDir(dirname(libraryTarget));

  const templateBaseUrl = new URL("./templates/lib/comfy-ui/", import.meta.url);

  // Template files to copy
  const templateFiles = [
    "index.ts",
    "core/types.ts",
    "core/graph.ts",
    "nodes/index.ts",
  ];

  // Check if we're running from a local file or remote URL
  if (templateBaseUrl.protocol === "file:") {
    // Local execution: use file system copy
    const templateRoot = fromFileUrl(templateBaseUrl);
    await copy(templateRoot, libraryTarget, { overwrite: true });
  } else {
    // Remote execution (JSR): fetch files via HTTPS
    for (const file of templateFiles) {
      const sourceUrl = new URL(file, templateBaseUrl);
      const targetPath = join(libraryTarget, file);

      await ensureDir(dirname(targetPath));

      const response = await fetch(sourceUrl.href);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${sourceUrl.href}: ${response.statusText}`);
      }

      const content = await response.text();
      await Deno.writeTextFile(targetPath, content);
    }
  }
}
