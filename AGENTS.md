# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# scrapbox-mcp

Scrapbox API を操作するための MCP サーバー

## Reference

API 実装のリファレンス: https://github.com/takker99/scrapbox-userscript-std

## Authentication

ブラウザの Cookie（`connect.sid`）を使用して Scrapbox API を認証する。環境変数 `SCRAPBOX_COOKIE` に Cookie 値を設定。

```bash
# .env または環境変数で設定
SCRAPBOX_COOKIE="connect.sid=s%3A..."
```

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

`define*` ヘルパー（`defineTool`, `defineResource`, `definePrompt`）は MCP SDK の登録を統一パターンでラップ。各定義は `.register(server)` メソッドを持ち、`src/index.ts` で呼び出される。

**責務の分離**: 複雑なロジックは `src/features/` に純粋関数として配置し、`Result<T, E>`（neverthrow）を返す。`src/definitions/` の MCP 定義は feature 関数を呼び出してレスポンスを整形する薄いラッパー。

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
