# Scrapbox MCP Server Specification

## Overview

Scrapbox API を操作するための MCP サーバー。ナレッジ検索・参照と、ページ作成・編集の両方を提供する。

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SCRAPBOX_PROJECT` | Yes | 対象プロジェクト名 |
| `SCRAPBOX_COOKIE` | Yes | connect.sid Cookie値 |
| `SCRAPBOX_TOOLS` | No | 有効にするツール（カンマ区切り） |
| `SCRAPBOX_PRESET` | No | ツールプリセット（minimal/readonly/full） |
| `SCRAPBOX_ENABLE_DELETE` | No | 削除機能の有効化（"true"で有効） |

### Tool Presets

| Preset | Enabled Tools |
|--------|---------------|
| `minimal` | list_pages, get_page |
| `readonly` | list_pages, get_page, search_pages, get_links, get_backlinks |
| `full` | 全ツール（削除は`SCRAPBOX_ENABLE_DELETE`も必要） |

`SCRAPBOX_TOOLS`が指定されている場合、プリセットより優先される。

## Dependencies

書き込み操作には `@cosense/std` ライブラリを使用する。

```json
{
  "dependencies": {
    "@cosense/std": "npm:@jsr/cosense__std@^0.29.8",
    "@cosense/types": "npm:@jsr/cosense__types@^0.10.4"
  }
}
```

## Tools

### Read Operations (REST API)

#### `list_pages`

プロジェクト内の全ページ一覧を取得。

**API:** `GET /api/pages/:projectName`

**Parameters:**
- `limit` (number, optional): 取得件数（デフォルト: 100、最大: 1000）
- `skip` (number, optional): スキップ件数（デフォルト: 0）
- `sort` (string, optional): ソート順（updated/created/accessed/linked/views/title）

**Returns:**
- ページタイトル一覧（メタデータ付き）

---

#### `get_page`

指定ページの内容を取得。

**API:** `GET /api/pages/:projectName/:pageTitle`

**Parameters:**
- `title` (string, required): ページタイトル

**Returns:**
- ページ内容（Scrapbox記法のまま）
- メタデータ（作成日時、更新日時、作成者など）
- `links`: このページからのリンク先一覧
- `relatedPages.links1hop`: リンク先＋バックリンク元

---

#### `search_pages`

キーワードでページを全文検索。

**API:** `GET /api/pages/:projectName/search/query?q=`

**Parameters:**
- `query` (string, required): 検索クエリ

**検索構文:**
- 複数語句: スペース区切りでAND検索
- 除外検索: `-word` で除外
- フレーズ検索: `"exact phrase"` で囲む

**Returns:**
- マッチしたページ一覧（スニペット付き）
- **最大100件の制限あり（API制限）**

**Note:** 内部API。予告なく変更される可能性がある。

---

#### `get_links`

指定ページからのリンク先一覧を取得。

**Implementation:** `get_page` のレスポンスから `links` フィールドを抽出

**Parameters:**
- `title` (string, required): ページタイトル

**Returns:**
- リンク先ページタイトル一覧

---

#### `get_backlinks`

指定ページへのバックリンク（被リンク）一覧を取得。

**Implementation:** `get_page` のレスポンスから `relatedPages.links1hop` を抽出

**Parameters:**
- `title` (string, required): ページタイトル

**Returns:**
- バックリンク元ページタイトル一覧

---

### Write Operations (WebSocket API)

書き込み操作は `@cosense/std/websocket` を使用。REST APIでは書き込みは提供されていない。

#### `create_page`

新規ページを作成。既存ページの場合は全置換。

**Implementation:** `patch` from `@cosense/std/websocket`

**Parameters:**
- `title` (string, required): ページタイトル
- `body` (string, required): ページ本文（Scrapbox記法）

**Returns:**
- 作成されたページのURL

---

#### `update_page`

既存ページを更新（全置換）。

**Implementation:** `patch` from `@cosense/std/websocket`

**Parameters:**
- `title` (string, required): ページタイトル
- `body` (string, required): 新しい本文

**Returns:**
- 更新されたページのURL

---

#### `delete_page`

ページを削除。

**Implementation:** `deletePage` from `@cosense/std/websocket`

**Note:** `SCRAPBOX_ENABLE_DELETE=true`が必要。

**Parameters:**
- `title` (string, required): ページタイトル

**Returns:**
- 削除結果

---

## Error Handling

Scrapbox APIのエラーはneverthrowでラップし、MCPのエラー形式で返却する。

```typescript
type ScrapboxError = {
  code: "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED" | "UNKNOWN";
  message: string;
  status?: number;
};
```

## Architecture

```
src/
├── index.ts                    # Entry point
├── config.ts                   # 環境変数の読み込みとバリデーション
├── definitions/
│   └── tools/
│       ├── index.ts
│       ├── list-pages.ts
│       ├── get-page.ts
│       ├── search-pages.ts
│       ├── get-links.ts
│       ├── get-backlinks.ts
│       ├── create-page.ts
│       ├── update-page.ts
│       └── delete-page.ts
└── features/
    └── scrapbox/
        ├── client.ts           # REST API クライアント
        ├── websocket.ts        # WebSocket API クライアント（@cosense/std ラッパー）
        ├── client.test.ts
        ├── types.ts            # 型定義
        └── errors.ts           # エラー型
```

## Design Decisions

### REST vs WebSocket

- **読み取り**: REST API（公式ドキュメントに記載）
- **書き込み**: WebSocket API（`@cosense/std` 経由、内部API）

### Concurrency

同時編集の競合対策は行わない。最後に書いたものが勝つ方式（last-write-wins）。

### Pagination

`list_pages`はlimit/skipパラメータのみ。全件取得はクライアント側でループ処理。

### Link Extraction

`get_links` と `get_backlinks` は専用エンドポイントではなく、`get_page` のレスポンスから抽出する。

## Security Considerations

1. **削除機能のデフォルト無効**: 明示的な有効化が必要
2. **Cookie管理**: 環境変数経由で設定、ログに出力しない
3. **ツール制限**: 用途に応じて有効ツールを制限可能

## Internal API Warning

以下の機能は内部APIに依存しており、予告なく変更される可能性がある：

- `search_pages`: `/api/pages/:projectName/search/query` エンドポイント
- 全ての書き込み操作: WebSocket API（`@cosense/std` 経由）

変更があった場合は `@cosense/std` ライブラリのアップデートで対応する。

## References

- [Scrapbox API (公式ヘルプ)](https://scrapbox.io/help-jp/API)
- [@cosense/std (JSR)](https://jsr.io/@cosense/std)
- [worldnine/scrapbox-cosense-mcp](https://github.com/worldnine/scrapbox-cosense-mcp) - 参考実装
