# 憲法前文打鍵

日本国憲法前文の分割練習・全暗記に対応したタイピング練習サイトです。練習記録はブラウザー内に保存されます。

画面は HTML/CSS/JavaScript で構成し、ビルドとローカル開発に Vite を使用しています。

## ローカルで実行

必要環境: Node.js 22 以降

```sh
npm install
npm run dev
```

本番用ファイルは `npm run build` で `dist/` に生成されます。

## GitHub Pages で公開

`main` ブランチへの push、または Actions の `Deploy to GitHub Pages` ワークフローを手動実行すると、GitHub Pages にビルドを公開します。ビルド版を公開する場合は、Pages の公開元を **GitHub Actions** にしてください。

**Deploy from a branch** を使う場合は、ブランチを `main`、フォルダーを `/(root)` に設定してください。公開 URL は `https://<ユーザー名>.github.io/kenpou2/` です。
