# textlint-rule-no-doubled-joshi

文中に同じ助詞が複数出てくるのをチェックする[textlint](https://github.com/textlint/textlint "textlint")ルールです。

例)

> 材料不足で代替素材で製品を作った。

**で** という助詞が一文で複数でてきている。


## Installation

- [ ] Describe the installation process

## Usage

### Options

`.textlintrc` options.

```js
{
    "rules": {
        "no-doubled-joshi": {
            // 助詞のtoken同士の距離が2以下ならエラー
            "min_interval" : 2
        }
    }
}
```

- `min_interval` : 助詞の最低間隔値
    - 指定した間隔値以下で同じ助詞が出現した場合エラーが出力されます。
    

> 私**は**彼**は**好き

この場合の、**は**と**は**の間隔値は1

> 彼**の**母は私**の**父と知り合い

この場合の、**の**と**の**の間隔値は2

## Tests

- [ ] Write How to Tests

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT

## Reference

- [Doubled Joshi Validator · Issue #460 · redpen-cc/redpen](https://github.com/redpen-cc/redpen/issues/460 "Doubled Joshi Validator · Issue #460 · redpen-cc/redpen")
- [事象の構造から見る二重デ格構文の発生 ](https://www.ninjal.ac.jp/event/specialists/project-meeting/files/JCLWorkshop_no6_papers/JCLWorkshop_No6_01.pdf "JCLWorkshop_No6_01.pdf")