# ビルド & QA 手順

CodeSpark のデスクトップバンドルは Tauri 2.x を利用しており、`npm run tauri build` で各 OS 向けの成果物を一括生成できます。本ドキュメントでは共通準備、macOS での検証結果、Windows 向けビルド手順をまとめます。

## 共通準備
1. Node.js 20 以上、npm 10 以上をインストール
2. Rust（stable）と `rustup` をインストールし、ターゲット毎に `rustup target add <target>` を実行
3. リポジトリで `npm install`
4. ビルドコマンドは共通で `npm run tauri build`
   - 事前に `npm run build` を明示的に実行する必要はありません。Tauri CLI が `beforeBuildCommand` に従い自動で実行します
5. 成果物は `src-tauri/target/release/bundle/` 配下に生成されます

## macOS (検証済)
- **確認環境**: macOS 15.6.1 (arm64), Node v24.10.0, npm 10.9.0, rustc 1.91.1
- **前提**
  - `xcode-select --install` で Command Line Tools を導入
  - `rustup target add aarch64-apple-darwin`（Apple Silicon の場合）
- **手順**
  1. リポジトリ直下で `npm install`
  2. `npm run tauri build`
  3. 成功すると `src-tauri/target/release/bundle/macos/codespark.app` と `src-tauri/target/release/bundle/dmg/codespark_0.1.0_aarch64.dmg` が生成される
- **QA**
  - `.app` を初回実行する際は未署名のため、Finder で右クリック → 「開く」でゲートキーパーを回避
  - DMG を配布する場合はドラッグ＆ドロップで Applications に配置
  - デバッグ時は `open src-tauri/target/release/bundle/macos/codespark.app` で直接起動可能

## Windows (手順のみ)
- **前提**
  - Windows 11 以降（10 でも可）
  - [Visual Studio Build Tools 2022](https://learn.microsoft.com/visualstudio/install/build-tools) の「Desktop development with C++」をインストール
  - WebView2 Runtime（Edge に同梱されていなければ [公式ページ](https://developer.microsoft.com/microsoft-edge/webview2/) から導入）
  - `winget install Rustlang.Rustup` などで `rustup` を導入し、`rustup target add x86_64-pc-windows-msvc`
  - MSI を生成する場合は [WiX Toolset](https://wixtoolset.org/) v5 以降をインストール（`wix.exe` が PATH に通っている必要あり）
  - NSIS インストーラを生成する場合は [NSIS](https://nsis.sourceforge.io/Download) をインストールして PATH を設定
- **手順**
  1. PowerShell で `npm install`
  2. `npm run tauri build`
  3. 成果物は `src-tauri\target\release\bundle\msi\codespark_0.1.0_x64_en-US.msi`（および `nsis` ディレクトリ内の `exe`）に出力される
- **QA**
  - MSI をインストール後、スタートメニューから CodeSpark を起動して検索・コピー操作を確認
  - 署名を行わない場合は SmartScreen で警告が表示されるため、社内配布では `右クリック → プロパティ → ブロック解除` を案内

## トラブルシューティング
- 依存キャッシュの問題が起きた場合は `rm -rf src-tauri/target dist` を実行してから再ビルド
- Rust ツールチェーンの更新でこける場合は `rustup update` を実行
- Windows で `linker ` エラーが発生する場合は Visual Studio Build Tools の再インストールや「C++ ATL Support」を含める

## 参考
- Tauri 公式: https://tauri.app/start/prerequisites/
