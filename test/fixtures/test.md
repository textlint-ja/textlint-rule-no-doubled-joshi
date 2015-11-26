# テスト文

`app.use(middleware)` という形で、_middleware_と呼ばれる関数には`request`や`response`といったオブジェクトが渡されます。
この`request`や`response`を_middleware_で処理することでログを取ったり、任意のレスポンスを返しことができるようになっています。
