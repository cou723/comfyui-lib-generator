# comfyui-lib-generator

`comfyui-lib-generator` packages the ComfyUI graph DSL together with a CLI that regenerates the node binding files from a local `object_info.json`. The idea is that you publish this repository to GitHub (and later to JSR) so that end users can run the generator against their own ComfyUI installation and get a tailor-made `lib/comfy-ui` directory.

## Repository layout

- `src/cli.ts` &mdash; entry point invoked via `deno task generate` or `deno run -A jsr:@scope/comfyui-lib-generator`.
- `src/generator.ts` &mdash; the logic that reads `object_info.json` and emits the `generated/*.gen.ts` files.
- `src/templates/lib/comfy-ui` &mdash; static runtime files (graph builder, type helpers, etc.) that are copied into the user's destination directory before generation.
- `deno.json` &mdash; configure the package name/version and expose the CLI on JSR.

You can rename the scope/package inside `deno.json` before publishing.

## Usage

1. Make sure you have a fresh `object_info.json` from the target machine's ComfyUI installation.
2. Run the generator and point it to the file and the installation path you want to populate:

   ```sh
   deno task generate --object-info ../object_info.json --out lib/comfy-ui
   ```

   - `--object-info` defaults to `./object_info.json`.
   - `--out` defaults to `./lib/comfy-ui`.
   - `--force` reinstalls the static template files before regenerating types.

3. Commit the resulting `lib/comfy-ui` (including the `generated` directory) wherever you need it.

## Publishing to JSR

1. Update `deno.json` with your chosen package name (for example `@cou723/comfyui-lib-generator`) and bump `version`.
2. Run `deno task generate` once so the template files are present (JSR uploads the files on disk).
3. Double-check the package contents: `deno publish --dry-run` or `jsr publish --dry-run`.
4. `jsr publish` when ready.

Consumers can then run `deno run -A jsr:@cou723/comfyui-lib-generator --object-info /path/to/object_info.json --out lib/comfy-ui`.
