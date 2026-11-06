---
layout: home

hero:
  name: YADECK
  text: AI ファーストのスライドジェネレータ
  tagline: 内容は AI が schema 付きの YAML にすらすら書く。作り込みたいページだけ、人が JSX で作り込む。
  actions:
    - theme: brand
      text: Getting started
      link: /guide/getting-started
    - theme: alt
      text: YADECK とは
      link: /guide/concept
    - theme: alt
      text: デモを見る
      link: /demo/sample.html
      target: _blank

features:
  - title: AI は内容だけを書く
    details: deck は「何を伝えるか」だけを持つ YAML。使える tags とフィールドは JSON Schema で決まっているので、AI は見た目を考えずに書ける。
  - title: 見た目は view が決める
    details: 配置・色・コンポーネントの選択は React の Layout が決める。tags を付けると、その tags に合う Layout が DI コンテナで選ばれる。
  - title: 必要なページだけ作り込む
    details: 1 ページだけ特別な見せ方をしたいときは、そのページ用の Layout を JSX で書いて tags で呼ぶ。data の書き方は変わらない。
  - title: npm のコンポーネントがそのまま使える
    details: チャートや three.js の 3D など、JSX のコンポーネントを提供するパッケージを import するだけ。ブラウザで動く部品は、表示中のページでだけ動く。
  - title: 静的 HTML 1 つで発表できる
    details: build すると HTML 1 ファイル。発表者モード、デュアルモニター、印刷して PDF、スライドごとの PNG まで揃う。
---
