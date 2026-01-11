# Examples for comfyui-lib-generator (not published)


## 使い方の流れ

1) ComfyUI 側から最新の `object_info.json` を取得して、リポジトリルート直下に配置します。

2) ジェネレータでライブラリを examples 配下に生成（この手順は既に実行済みの場合があります）

```
cd ..\
deno run -A src/cli.ts --object-info ..\object_info.json --out examples\libs\comfy-ui
```

3) 生成された `examples/libs/comfy-ui` を使ってワークフローを作成

`examples/minimal/workflow_example.ts` を実行・編集して試せます。

### 実行可能なサンプル

- `examples/minimal/txt2img_512.ts` — ComfyUI サーバーに対して txt2img（512x512）を実行し、画像をローカルに保存します。
  - 例:
    - `deno run -A comfyui-lib-generator/examples/minimal/txt2img_512.ts --prompt "a cute corgi" --ckpt "sd_xl_base_1.0.safetensors"`
  - 環境変数:
    - `COMFY_URL` — 既定 `http://127.0.0.1:8188`
    - `CKPT_NAME` — 既定 `sd_xl_base_1.0.safetensors`
    - `SAVE_PREFIX` — SaveImage のファイル名 prefix（既定 `txt2img_example`）
  - 出力先: `comfyui-lib-generator/examples/output/`

## メモ

- `--out` は任意のディレクトリに変更できます。
- テンプレート（`core/*`）を再インストールしたいときは `--force` を付けます。
- 生成物は `lib/comfy-ui/generated/*.gen.ts` に出力されます。
