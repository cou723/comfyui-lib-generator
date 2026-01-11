// 最小例: 生成済みの lib/comfy-ui を使って Prompt を作るサンプル
// すでに `examples/libs/comfy-ui` に生成済みを前提にしています。

import { GraphBuilder } from "../libs/comfy-ui/core/graph.ts";
import { nodes } from "../libs/comfy-ui/generated/nodes.gen.ts";

const g = new GraphBuilder();

// 例: 実在するノード名に置き換えて試してください（環境に依存します）
// const loader = g.add(nodes.LoadImage, { image: "image.png" }, { label: "load" });
// const upscale = g.add(nodes.UpscaleImage, { image: loader.outputs.image }, { label: "upscale" });

const prompt = g.toPrompt();
console.log(JSON.stringify(prompt, null, 2));

