# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2025-02-11

### Added
- `ExtractInputValueType` - ノード定義から特定の入力パラメーターの値の型を抽出するヘルパー型

## [0.3.0] - 2025-02-11

### Changed
- **BREAKING**: `--checkpoint-dir` option has been removed
- CheckpointLoader's `ckpt_name` now uses enum values from `object_info.json` directly
- `shouldEmitEnum` now accepts paths with backslashes (e.g., `subdir\model.safetensors`)

### Removed
- `src/scanner.ts` - Checkpoint file scanning functionality
- `--checkpoint-dir` CLI option
- `test/fixtures/checkpoints` - Test fixture directory
- `writeCheckpointsFile` function
- `isCheckpointLoaderField` function
- `checkpoints.gen.ts` generation

### Fixed
- CheckpointLoader now correctly uses checkpoint lists from `object_info.json` instead of requiring manual directory scanning

## [0.2.0] - 2025-01-30

### Added
- `--checkpoint-dir` option to scan checkpoint files and generate union types
- CheckpointLoader's `ckpt_name` now uses string union types when `--checkpoint-dir` is specified
- `test/fixtures/checkpoints` for testing checkpoint scanning

## [0.1.2] - Earlier

### Added
- Initial release
- Basic node binding generation from `object_info.json`
