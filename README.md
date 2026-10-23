# wp-po-priority-filter

GlotPress（WordPress.org 翻訳）の `.po` から、`gp-priority` フラグで翻訳単位を除くための静的ページです。アップロードも貼り付けもブラウザの中だけで処理し、サーバーへは送りません。

公開ページ: https://hiroshisatoy.github.io/wp-po-priority-filter/

## 使い方

1. `.po` をアップロードするか、テキストエリアに貼り付けます。
2. 除外する優先度にチェックを入れます。初期状態では `low` と `hidden` を除外します。
3. 「フィルタした .po をダウンロード」を押します。

## ルール

- 空の `msgid` を持つヘッダーは、優先度の指定にかかわらず常に残します。
- 残した翻訳単位のコメント、参照、フラグ（`fuzzy` など）は原文のまま保持します。
- `#, gp-priority: high|normal|low|hidden` を優先度として読みます。フラグが無い単位は `normal` です。
- CSS と JavaScript は相対パスです。GitHub Pages のプロジェクトサイト（`/wp-po-priority-filter/`）でもそのまま動きます。

## テスト

```sh
node --test
```
