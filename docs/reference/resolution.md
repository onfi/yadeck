---
description: YADECK が tags から Layout を選ぶ規則と、Layout の中で block を取り出す pick / pickAll の規則。一致度の比べ方と例。
---

# tags の解決規則

ノードの `tags` から Layout を選ぶ規則と、Layout の中で block を取り出す `pick` / `pickAll` の規則です。どちらも同じ「一致度」で候補を比べます。

## 一致度

候補(bind した Layout、または block)の tags と、問い合わせの tags を比べて、2 つの数を出します。

| 数 | 意味 | 良い方 |
|---|---|---|
| match | 候補の tags のうち、問い合わせにも含まれる数 | 多い方 |
| extra | 候補の tags のうち、問い合わせに無い数 | 少ない方 |

候補は「match が多い順、同じなら extra が少ない順」に並べ、先頭を採ります。同じ tags が重複していても 1 つと数えます。

## Layout の解決(DI)

ノードの tags を問い合わせにして、その段の Interface に bind された Layout から選びます。

- match と extra が完全に同点なら、**後から登録した方**を採ります
- 同じ tags の組への bind は、後から登録した方で置き換わります
- 一致する tags が 1 つも無くても、bind が 1 つでもあれば何かが選ばれます。通常は `[]`(tags なし)の Layout が選ばれます
- Interface に bind が 1 つも無いと、構成エラーになります

### 例

basic に加えて `["section-header", "t"]` を bind したとき:

| ノードの tags | 選ばれる Layout | 理由 |
|---|---|---|
| `[section-header, t]` | `[section-header, t]` | match 2 |
| `[section-header]` | `[section-header]` | どちらも match 1。extra が 0 の方 |
| `[section-header, dark]` | `[section-header]` | どちらも match 1。extra が 0 の方 |
| `[unknown]` | `[]` | どれも match 0。extra が 0 の方 |
| `[body, left]`(block) | `[body]` | match 1 |

最後の例のように、`left` のような位置の手がかりは Layout の選択には効かず、ページ側の Layout が `pickAll` で振り分けるのに使います。

## pick / pickAll

Layout の中で、`items` から block を取り出す関数です。どちらも純粋関数で、`[取り出したもの, 残り]` を返します。

```ts
const [heading, rest] = pick(slide.items, ["heading"]);
const [right, rest2] = pickAll(rest, ["right"]);
const [left, lead] = pickAll(rest2, ["left"]);
```

| 関数 | 取り出すもの |
|---|---|
| `pick(items, tags)` | 一致度が最も良い 1 つ。同点は**先に出てくる方**。match が 0 の block しか無ければ `undefined` |
| `pickAll(items, tags)` | tags が 1 つでも一致する block を全部、元の順のまま |

- tags は配列でも、空白区切りの文字列(`"body right"`)でも渡せます
- `pickAll` は「どれか 1 つでも一致」です。`pickAll(items, "body right")` は `body` の block も `right` の block も取り出します
