# Gotchas

## JSR Packages

JSR パッケージ（@cosense/std など）は npm から直接インストールできない。`bunx jsr add` を使用する:

```bash
bunx jsr add @cosense/std @cosense/types
```

これにより `.npmrc` に JSR レジストリが設定され、package.json では `npm:@jsr/...` 形式でマッピングされる。

## @cosense/std の Result 型

@cosense/std は `option-t` ライブラリの `Result` 型を使用する（`result.ok`, `result.val`, `result.err`）。
このプロジェクトでは `neverthrow` を使用しているため、変換が必要:

```typescript
// option-t Result → neverthrow Result
if (!result.ok) {
  return err(mapError(result.err));
}
return ok(result.val);
```

## API クライアントはシングルトン

ScrapboxClient はシングルトンクラスとして実装。関数ではなくクラスで:

```typescript
const client = ScrapboxClient.getInstance();
await client.listPages({ limit: 100 });
```

## シングルトンのテスト

シングルトンをテストする際は `resetInstance()` メソッドを用意し、`beforeEach` で呼び出してテスト間の分離を確保:

```typescript
beforeEach(() => {
  ScrapboxClient.resetInstance();
  process.env = { ...originalEnv, SCRAPBOX_PROJECT: "test" };
});
```

## @cosense/types の Page 型

`@cosense/types/rest` の `Page` 型は使わない。代わりに `PageWithInfoboxDefinition | PageWithoutInfoboxDefinition` の union 型を使用:

```typescript
type PageData = PageWithInfoboxDefinition | PageWithoutInfoboxDefinition;
```

## MCP Inspector での環境変数

MCP Inspector で STDIO トランスポートを使用する場合、環境変数はシェル環境から自動継承されない。Inspector UI の "Environment Variables" セクションで明示的に設定が必要:

1. "Environment Variables" ボタンをクリックして展開
2. "Add Environment Variable" で `SCRAPBOX_PROJECT` と `SCRAPBOX_COOKIE` を追加
3. "Connect" ボタンでサーバーに接続

```bash
# Inspector 起動コマンド
bunx @modelcontextprotocol/inspector bun run src/index.ts
```

## Scrapbox Cookie の取得方法

`SCRAPBOX_COOKIE` には Scrapbox の認証 Cookie `connect.sid` を設定する:

1. ブラウザで https://scrapbox.io にログイン
2. 開発者ツール (F12) → **Application** → **Cookies** → `https://scrapbox.io`
3. `connect.sid` の **Value** をコピー
4. 環境変数に設定:

```bash
# .env または環境変数
SCRAPBOX_COOKIE="connect.sid=s%3A..."
```

**注意**: Cookie は定期的に期限切れになるため、認証エラーが出たら再取得が必要。
