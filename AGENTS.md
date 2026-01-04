# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# scrapbox-mcp

Scrapbox API を操作するための MCP サーバー

## Reference

API 実装のリファレンス: https://github.com/takker99/scrapbox-userscript-std

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SCRAPBOX_PROJECT` | プロジェクト名（必須） |
| `SCRAPBOX_COOKIE` | 認証用 Cookie `connect.sid=...`（必須） |
| `HTTP` | `1` で HTTP モード起動（省略時は stdio）|

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Bun |
| MCP SDK | @modelcontextprotocol/sdk |
| HTTP Framework | Hono |
| Transport | stdio, HTTP (@hono/mcp) |
| Build | tsup |
| Lint/Format | Biome |
| Error Handling | neverthrow |
| Test | bun test |

## Commands

```bash
# Development
bun run dev              # Start with stdio transport
bun run dev:http         # Start with HTTP transport

# Quality
bun run check            # Lint + format check
bun run check:fix        # Auto fix
bun run typecheck        # Type check

# Test
bun test                 # Run tests
bun test --watch         # Watch mode
bun test src/features/<feature>/<feature>.test.ts  # Single file

# Build
bun run build            # Build for production
```

## Directory Structure

```
src/
├── index.ts              # Entry point (stdio/HTTP switch)
├── definitions/          # MCP primitive definitions (thin wrappers)
│   ├── define.ts         # define* helpers
│   ├── tools/
│   ├── resources/
│   └── prompts/
└── features/             # Business logic (pure functions, neverthrow)
    └── <name>/           # Feature directory
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ src/index.ts                                                │
│   ├── createServer() → tools/resources/prompts を register │
│   ├── runStdio() → StdioServerTransport                    │
│   └── createHttpApp() → Hono + StreamableHTTPTransport     │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌─────────────┐
│ definitions/    │ │ resources │ │ prompts     │
│ tools/          │ │           │ │             │
│ (thin wrappers) │ │           │ │             │
└────────┬────────┘ └───────────┘ └─────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ features/                                                   │
│   └── scrapbox-client/ → @cosense/std をラップ              │
│       option-t Result → neverthrow Result 変換              │
└─────────────────────────────────────────────────────────────┘
```

**責務の分離**:
- `src/definitions/`: MCP SDK 登録の薄いラッパー。`define*` ヘルパーで統一パターン化
- `src/features/`: 純粋なビジネスロジック。`Result<T, E>`（neverthrow）を返す
- `ScrapboxClient`: @cosense/std の option-t Result を neverthrow に変換するシングルトン

## Debugging with MCP Inspector

MCP Inspector はサーバーのテストとデバッグ用のインタラクティブツール。

### 起動方法

```bash
bunx @modelcontextprotocol/inspector bun run src/index.ts
```

### Inspector の機能

| タブ | 用途 |
|------|------|
| Resources | リソース一覧、メタデータ確認、コンテンツ検査 |
| Prompts | プロンプトテンプレート確認、引数テスト |
| Tools | ツール一覧、スキーマ確認、カスタム入力でテスト実行 |

通知ペインでサーバーのログとリアルタイム通知を確認可能。

### 開発ワークフロー

1. Inspector でサーバー起動・接続確認
2. コード変更 → Inspector 再接続
3. 変更した機能をテスト、ログを確認

## Conventions

- stdio モードではコンソール出力禁止（stdin/stdout が MCP 通信に使われるため）

## Publishing

npm への公開は `/publish` スラッシュコマンドで実行（内部で GitHub Actions を使用）。

※ リポジトリ Secrets に `NPM_TOKEN` が必要
