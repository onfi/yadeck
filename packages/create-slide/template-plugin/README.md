# {{name}}

[YADECK](https://onfi.github.io/yadeck/) のプラグイン。

## 使う

deck のリポジトリで:

```sh
npx yadeck add {{name}}
```

`slide.config.ts` の `plugins` に足され、使える tags が schema に入ります。

## 開発する

```sh
npm install
npx playwright install chromium   # check / png を使うとき
npm run dev     # example/ の見本をプレビュー(src を変えると再読み込み)
npm test        # Layout のテスト
npm run check   # 見本のはみ出し・切れを検査
npm run png     # 見本を .slide/preview/png/ に書き出す
npm run build   # dist/ に出力
```

## 公開する

```sh
npm publish
```

YADECK のプラグインの一覧に載せるため、次の決まりを守ります。

- `package.json` の `keywords` に `yadeck-plugin` を入れる
- 名前は `yadeck-plugin-*` か `@scope/yadeck-plugin-*` にする
- `example/deck.yaml` に、bind した tags をひととおり使った見本を置く(一覧のサムネイルに使う)
- `@yadeck/slide-core`、`react`、`zod` は peerDependencies にする(deck と同じ実体を使うため)

詳しくは https://onfi.github.io/yadeck/guide/plugin
