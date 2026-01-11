// 実行可能な最小テキスト→画像ワークフロー
// 前提1: ComfyUI サーバー起動中 (既定: http://127.0.0.1:8188)
// 前提2: `examples/libs/comfy-ui` に生成済みのライブラリがあること
// 実行例:
//   deno run -A comfyui-lib-generator/examples/minimal/txt2img_512.ts \
//     --prompt "a cute corgi, highly detailed, studio lighting" \
//     --negative "blurry, lowres" \
//     --steps 20 --cfg 7 --seed 123456 \
//     --ckpt "sd_xl_base_1.0.safetensors"
// 上書き可能な環境変数: COMFY_URL, CKPT_NAME, SAVE_PREFIX

import { GraphBuilder } from "../libs/comfy-ui/core/graph.ts";
import { nodes } from "../libs/comfy-ui/generated/nodes.gen.ts";

type Args = {
  prompt: string;
  negative?: string;
  steps: number;
  cfg: number;
  seed: number;
  ckpt: string;
  sampler: NonNullable<typeof nodes.KSampler["inputs"]["sampler_name"]["enum"]>[number];
  scheduler: NonNullable<typeof nodes.KSampler["inputs"]["scheduler"]["enum"]>[number];
  prefix: string;
};

function parseArgs(): Args {
  const raw = new Map<string, string>();
  for (let i = 0; i < Deno.args.length; i++) {
    const a = Deno.args[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = Deno.args[i + 1] && !Deno.args[i + 1].startsWith("--")
      ? Deno.args[++i]
      : "true";
    raw.set(k, v);
  }

  const prompt = raw.get("prompt") ?? "a scenic landscape, best quality";
  const negative = raw.get("negative") ?? "lowres, blurry";
  const steps = raw.get("steps") ? Number(raw.get("steps")) : 20;
  const cfg = raw.get("cfg") ? Number(raw.get("cfg")) : 7;
  const seed = raw.get("seed") ? Number(raw.get("seed")) : Math.floor(Math.random() * 1e9);
  const ckpt = raw.get("ckpt") ?? Deno.env.get("CKPT_NAME") ?? "sd_xl_base_1.0.safetensors";
  const sampler = (raw.get("sampler") ?? "euler") as Args["sampler"];
  const scheduler = (raw.get("scheduler") ?? "normal") as Args["scheduler"];
  const prefix = raw.get("prefix") ?? Deno.env.get("SAVE_PREFIX") ?? "txt2img_example";

  return { prompt, negative, steps, cfg, seed, ckpt, sampler, scheduler, prefix } as Args;
}

function comfyUrl(): string {
  return Deno.env.get("COMFY_URL") ?? "http://127.0.0.1:8188";
}

function buildPrompt(a: Args) {
  const g = new GraphBuilder();

  // 1) Checkpoint をロード
  const loader = g.add(
    nodes.CheckpointLoaderSimple,
    { ckpt_name: a.ckpt },
    { label: "ckpt" },
  );

  // 2) テキスト条件
  const clipTextPositive = g.add(
    nodes.CLIPTextEncode,
    { text: a.prompt, clip: loader.outputs.clip },
    { label: "positive" },
  );
  const clipTextNegative = g.add(
    nodes.CLIPTextEncode,
    { text: a.negative ?? "", clip: loader.outputs.clip },
    { label: "negative" },
  );

  // 3) 512x512 の空の潜在
  const latent = g.add(
    nodes.EmptyLatentImage,
    { width: 512, height: 512, batch_size: 1 },
    { label: "latent" },
  );

  // 4) サンプリング（拡散）
  const sampled = g.add(
    nodes.KSampler,
    {
      model: loader.outputs.model,
      positive: clipTextPositive.outputs.conditioning,
      negative: clipTextNegative.outputs.conditioning,
      latent_image: latent.outputs.latent,
      seed: a.seed,
      steps: a.steps,
      cfg: a.cfg,
      sampler_name: a.sampler,
      scheduler: a.scheduler,
      denoise: 1,
    },
    { label: "ksampler" },
  );

  // 5) デコード
  const decoded = g.add(
    nodes.VAEDecode,
    { samples: sampled.outputs.latent, vae: loader.outputs.vae },
    { label: "decode" },
  );

  // 6) 保存
  g.add(
    nodes.SaveImage,
    { images: decoded.outputs.image, filename_prefix: a.prefix },
    { label: "save" },
  );

  return g.toPrompt();
}

async function postPrompt(prompt: Record<string, unknown>) {
  const url = `${comfyUrl()}/prompt`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`POST /prompt failed: ${res.status} ${await res.text()}`);
  return await res.json() as { prompt_id: string };
}

async function waitAndDownload(promptId: string, outDir = "comfyui-lib-generator/examples/output") {
  await ensureDir(outDir);
  const histUrl = `${comfyUrl()}/history/${promptId}`;
  while (true) {
    const res = await fetch(histUrl);
    if (!res.ok) throw new Error(`GET /history failed: ${res.status}`);
    const j = await res.json() as Record<string, unknown>;
    const entry = (j as any)[promptId];
    if (entry && entry.outputs) {
      const outs = entry.outputs as Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }>;
      for (const out of Object.values(outs)) {
        for (const img of out.images ?? []) {
          await downloadImage(img.filename, img.subfolder, img.type, outDir);
        }
      }
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function downloadImage(filename: string, subfolder: string, type: string, outDir: string) {
  const u = new URL(`${comfyUrl()}/view`);
  u.searchParams.set("filename", filename);
  if (subfolder) u.searchParams.set("subfolder", subfolder);
  if (type) u.searchParams.set("type", type);

  const res = await fetch(u);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${outDir}/${safe}`;
  await Deno.writeFile(path, bytes);
  console.log(`saved: ${path}`);
}

async function ensureDir(path: string) {
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch (_) {
    // ignore
  }
}

// ---- main ----
const args = parseArgs();
const prompt = buildPrompt(args);
const { prompt_id } = await postPrompt(prompt);
console.log(`queued prompt: ${prompt_id}`);
await waitAndDownload(prompt_id);
console.log("done");
