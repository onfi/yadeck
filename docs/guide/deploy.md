# 公開する

`npm run build` の出力 `dist/` は静的ファイルだけなので、どの静的ホスティングにも置けます。
ここでは GitHub Pages と、Cloudflare の wrangler での公開方法を説明します。

::: warning 公開範囲に注意
`dist/` には、deck の内容と `public/` の素材がすべて入ります。発表者ノートも HTML の中に入っています(画面には出ません)。社外に出せない内容を含む deck は、アクセスを制限できる場所に置きます。
:::

## 公開する前に

- 出力の中のパスはすべて相対パス(`./talk.html`、`./logo.svg`)なので、`https://example.github.io/my-deck/` のようなサブパスでもそのまま動きます
- 発表者モードのウィンドウ同期は同じオリジンが前提です。公開先から開けば動きます
- build は Google Fonts からフォントを取得して埋め込みます。CI でもネットワークが必要です
- `dist/png/` は `yadeck png` を実行したときだけ作られます。公開したくなければ、build の前に消すか CI で作らないようにします

## GitHub Pages

GitHub Actions で build し、`dist/` を Pages に出します。

1. deck リポジトリを GitHub に push します
2. リポジトリの Settings → Pages で、Source を **GitHub Actions** にします
3. 次のワークフローを `.github/workflows/deploy.yml` に置きます

```yaml
name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

main に push すると、`https://<owner>.github.io/<repo>/` に公開されます。deck の一覧は `index.html`、各 deck は `<deck 名>.html` です。

::: tip
private リポジトリの Pages を公開にするか組織内に限るかは、GitHub のプランと Organization の設定によります。社内向けの deck は、公開範囲を確かめてから有効にします。
:::

## Cloudflare(wrangler)

Cloudflare の CLI である wrangler で、`dist/` を静的アセットとして公開します。

```sh
npm i -D wrangler
npx wrangler login       # 初回だけ。ブラウザで Cloudflare にログインする
```

deck リポジトリの直下に `wrangler.jsonc` を置きます。

```jsonc
{
  "name": "my-deck",
  "compatibility_date": "2026-11-01",
  "assets": {
    "directory": "./dist"
  }
}
```

```sh
npm run build
npx wrangler deploy
```

`https://my-deck.<アカウントのサブドメイン>.workers.dev/` に公開されます。

`package.json` にまとめておくと、1 コマンドで公開できます。

```json
"scripts": {
  "deploy": "yadeck build && wrangler deploy"
}
```

### Cloudflare Pages に出す場合

Pages のプロジェクトに出すなら、設定ファイルなしで次のコマンドでも公開できます。

```sh
npm run build
npx wrangler pages deploy dist --project-name my-deck
```

### CI から公開する

GitHub Actions などから公開するときは、Cloudflare の API トークンとアカウント ID を環境変数で渡します。

```yaml
      - run: npm ci && npm run build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### アクセスを制限する

社内だけに見せたい deck は、Cloudflare Zero Trust の Access で、公開先の URL にログインを求めるよう設定できます。
