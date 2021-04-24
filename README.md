# textlint-rule-no-doubled-joshi [![Actions Status: test](https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/workflows/test/badge.svg)](https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/actions?query=workflow%3A"test")

1つの文中に同じ助詞が連続して出てくるのをチェックする[textlint](https://github.com/textlint/textlint)ルールです。

文中で同じ助詞が連続すると文章が読みにくくなります。

例) **で**という助詞が連続している

> 材料不足で代替素材で製品を作った。

**で** という助詞が1つの文中に連続して書かれているのをチェックすることができます。

**OK**:

```
私は彼が好きだ
オブジェクトを返す関数を公開した
これがiPhone、これがAndroidです。
これがiPhone，これがAndroidです。
言うのは簡単の法則。
```

**NG**:

```
私は彼は好きだ
材料不足で代替素材で製品を作った。
列車事故でバスで振り替え輸送を行った。
法律案は十三日の衆議院本会議で賛成多数で可決され、参議院に送付されます
これは`obj.method`は何をしているかを示します。
これとあれとそれを持ってきて。
```


## Installation

    npm install textlint-rule-no-doubled-joshi

## Usage

Via `.textlintrc`(推奨)

```json5
{
    "rules": {
        "no-doubled-joshi": true
    }
}
```

Via CLI

```
textlint --rule no-doubled-joshi README.md
```


### Options

`.textlintrc` options.

```json5
{
    "rules": {
        "no-doubled-joshi": {
            // 助詞のtoken同士の間隔値が1以下ならエラーにする
            // 間隔値は1から開始されます
            "min_interval" : 1,
            // 例外を許可するかどうか
            "strict": false,
            // 助詞のうち「も」「や」は複数回の出現を許す
            "allow": ["も","や"],
            // 文の区切り文字となる配列
            "separatorCharacters": [
                ".", // period
                "．", // (ja) 全角period
                "。", // (ja) 句点
                "?", // question mark
                "!", //  exclamation mark
                "？", // (ja) 全角 question mark
                "！" // (ja) 全角 exclamation mark
            ],
            "commaCharacters": [
                "、",
                "，" // 全角カンマ
            ]
        }
    }
}
```

- `min_interval`:  助詞の最低間隔値
    - Default: `1`
    - 指定した`min_interval`以内にある同じ助詞は連続しているとみなされます
    - 指定した間隔値以下で同じ助詞が出現した場合エラーが出力されます
- `strict`: 厳しくチェックするかどうか
    - Default: `false`
    - 下記参照。例外としているものもエラーとするかどうか
    - false-positiveが発生しやすくなります
- `allow`: 複数回の出現を許す助詞
    - Default: `[]`
    - 並立の助詞など、複数回出現しても無視する助詞を指定します
    - 例) `"も"`を許可したい場合は `{ "allow": ["も"] }`
- `separatorCharacters`: 文の区切り文字の配列
    - Default: `[".", "．", "。", "?", "!", "？", "！"]`
    - `separatorCharacters`を設定するとデフォルト値は上書きされます
    - `。`のみを文の区切り文字にしたい場合は。`{ "separatorCharacters" : ["。"] }`のように指定します
- `commaCharacters`: 句点となる文字の配列
    - Default: `["、", "，"]`
    - 読点として認識する文字の配列を指定します
    - 読点は間隔値を+1する効果があります

## 判定処理

ある助詞(かつ品詞細分類)が、最低間隔値(距離)以内に連続して書かれている場合をエラーとして検出します

> 材料不足で代替素材で製品を作った。

この文中の助詞 `で` 同士の間隔値 は `1` となります。
デフォルトの最低間隔値(`min_interval`)は`1`となるなるため、このケースはエラーとして判定されます。

> これはペンです。これは鉛筆です。

この文は句点(`。`)によって2つの文として認識されます。
そのため、それぞれの文中での助詞`は`は1度のみの出現となりエラーとはなりません。

句点となる文字列は `separatorCharacters` オプションで指定できます。

このルールが助詞として認識するものは、次のサイトで確認できます。

- [kuromoji.js demo](https://takuyaa.github.io/kuromoji.js/demo/tokenize.html "kuromoji.js demo")

### 読点での区切り

> これがiPhone、これがAndroidです。

読点文字（`、`）が助詞の間にある場合、間隔値は+1されます。
そのため、助詞`が`の間隔値は`2`となりデフォルトではエラーとなりません。

読点文字は `commaCharacters` オプションで指定できます。

### カッコでの区切り

>  次の`escapeHTML`関数は**タグ関数**です（詳細は文字列の章を参照）

括弧（`(`や`)`）が助詞の間にある場合、間隔値は+1されます。
そのため、この例の助詞`は`の間隔値は`2`となりデフォルトではエラーとなりません。

括弧記号はkuromoji.jsで定義されている記号を元に判定しています。

## 例外

以下の項目については、曖昧性があるため助詞が連続していてもデフォルトではエラーとして扱いません。

設定が `{ strict: true }` ならばエラーとするが、デフォルトでは`{ strict: false }` となっています。

### 助詞:連体化 "の"

"の" の重なりは例外として許可します。

- [第８回：読みやすさへの工夫 3（てにおは助詞） - たくみの匠](http://www.asca-co.com/takumi/2010/07/3.html "第８回：読みやすさへの工夫 3（てにおは助詞） - たくみの匠")
- [作文入門](http://www.slideshare.net/takahi-i/ss-13429892 "作文入門")
    - "の" の消し方について

### 助詞:格助詞 "を"

> オブジェクトを返す関数を公開する

"を" の重なりは例外として許可します。

### 接続助詞:"て"

> 試し**て**いただい**て**

接続助詞 "て" の重なりは例外として許可します。

### 並立助詞

> 登っ**たり**降り**たり**する

並立助詞(`たり`)は連続するのが意図した助詞であるため許可します。

### 連語(助詞)

- [連語（助詞） - 修飾語 - 品詞の分類 - Weblio 辞書](http://www.weblio.jp/parts-of-speech/%E9%80%A3%E8%AA%9E(%E5%8A%A9%E8%A9%9E)_1 "連語（助詞） - 修飾語 - 品詞の分類 - Weblio 辞書")

連語は一つの助詞の塊として認識します。

```
OK: 文字列の長さを正確**に**測る**には**ある程度の妥協が必要になります。
NG: 文字列**には**そこ**には***問題がある。
```

### その他の助詞

その他の助詞も例外として扱いたい場合は `allow` オプションを利用します。

デフォルトでは次の文はエラーとなる。

> 太字**も**強調**も**同じように無視されます。

オプションで`"allow": ["も"]`を指定することで、**も**を例として扱うことができます。

```json5
{
    "rules": {
        "no-doubled-joshi": {
            // 助詞のうち「も」は複数回の出現を許す
            "allow": ["も"]
        }
    }
}
```

## Tests

    npm test

## Reference

- [Doubled Joshi Validator · Issue #460 · redpen-cc/redpen](https://github.com/redpen-cc/redpen/issues/460 "Doubled Joshi Validator · Issue #460 · redpen-cc/redpen")
- [事象の構造から見る二重デ格構文の発生 ](https://www.ninjal.ac.jp/event/specialists/project-meeting/files/JCLWorkshop_no6_papers/JCLWorkshop_No6_01.pdf "JCLWorkshop_No6_01.pdf")
- [第８回：読みやすさへの工夫 3（てにおは助詞） - たくみの匠](http://www.asca-co.com/takumi/2010/07/3.html "第８回：読みやすさへの工夫 3（てにおは助詞） - たくみの匠")
- [(Microsoft Word - JCLWorkshop2013_2\214\303\213{.doc) - JCLWorkshop_No3_02.pdf](https://www.ninjal.ac.jp/event/specialists/project-meeting/files/JCLWorkshop_no3_papers/JCLWorkshop_No3_02.pdf "(Microsoft Word - JCLWorkshop2013_2\214\303\213{.doc) - JCLWorkshop_No3_02.pdf")
- [助詞の連続使用を避け分かりやすい文章を書こう！ - 有限な時間の果てに](http://popoon.hatenablog.com/entry/2014/07/11/232057 "助詞の連続使用を避け分かりやすい文章を書こう！ - 有限な時間の果てに")
- [作文入門](http://www.slideshare.net/takahi-i/ss-13429892 "作文入門")
- [形態素解析ツールの品詞体系](http://www.unixuser.org/~euske/doc/postag/index.html#chasen "形態素解析ツールの品詞体系")
- [Redpenの実装](https://github.com/redpen-cc/redpen/issues/460 "Doubled Joshi Validator · Issue #460 · redpen-cc/redpen")

## Related Libraries

- [azu/kuromojin](https://github.com/azu/kuromojin) a wrapper of [kuromoji.js](https://github.com/takuyaa/kuromoji.js "kuromoji.js")
- [azu/sentence-splitter](https://github.com/azu/sentence-splitter)

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT
