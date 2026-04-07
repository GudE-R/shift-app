<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="ShiftCraft" width="80" />
</p>

<h1 align="center">ShiftCraft</h1>

<p align="center">
  <strong>Local-first AI Shift Management</strong><br />
  プライバシーを最優先した、AIシフト自動生成デスクトップアプリ
</p>

<p align="center">
  <img alt="Tauri v2" src="https://img.shields.io/badge/Tauri-v2-blue?logo=tauri" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript" />
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-Local--first-003B57?logo=sqlite" />
  <img alt="License" src="https://img.shields.io/badge/License-ISC-green" />
</p>

---

## Overview

ShiftCraft は、飲食・小売店オーナー向けの**ローカル完結型**シフト管理アプリです。
スタッフの個人情報を一切クラウドに送信せず、AIによるシフト自動生成・リアルタイムバリデーション・PDF/CSV出力を手元のPCだけで実現します。

### Design Principles

| 原則 | 説明 |
|:-----|:-----|
| **Local-first** | データは手元のSQLiteにのみ存在。クラウドは同期の土管に徹する |
| **Zero Knowledge** | サーバーには暗号化済みバイナリしか渡さない（Phase 2） |
| **匿名化AI** | AIにはID化されたパズルのみ送信。個人情報は渡さない |
| **嫌われないUI** | 制約の強制ではなく警告ベース。最終判断はオーナーが行う |

---

## Features

### Phase 1 (Current - MVP)

- **店舗・ポジション管理** — 複数店舗の登録、ポジション(レジ・キッチン等)の設定
- **スタッフ管理** — 曜日別出勤可否(○/△/×)、絶対NG日、夜勤可否、対応可能ポジション
- **必要人員設定** — 店舗×ポジション×日付×時間帯ごとの必要人数を定義
- **AIシフト自動生成** — 条件制約を考慮した貪欲法アルゴリズムで自動配置
- **手動保護** — オーナーが手動編集したシフトはAI再生成で上書きされない
- **シフトカレンダー** — スタッフ×日付のグリッド表示（月間/週間ビュー切替）
- **リアルタイムバリデーション** — 休憩不足、二重配置、長時間労働、連続勤務を常時チェック
- **PDF出力** — A3横レイアウトで印刷・掲示用シフト表を生成
- **CSV出力** — UTF-8 BOM付きでExcel互換
- **ダッシュボード** — 週間サマリー、充足率、警告数を一覧表示

### Phase 2 (Planned)

- モバイルアプリ (React Native / Expo)
- E2EE暗号化同期 (Supabase経由)
- Gemini APIによる本格AIシフト生成

### Phase 3 (Planned)

- 統計・分析ダッシュボード
- シフトテンプレート機能
- マルチデバイス秘密鍵共有

---

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| Desktop App | **Tauri v2** (Rust + WebView) | 軽量・セキュアなネイティブアプリ |
| Frontend | **React 19** + **TypeScript 6** | UI構築 |
| Bundler | **Vite 8** | 高速な開発サーバー & ビルド |
| Styling | **Tailwind CSS 4** + **shadcn/ui** | ユーティリティファーストCSS |
| State | **Zustand 5** | シンプルな状態管理 |
| Database | **SQLite** (tauri-plugin-sql) | ローカル完結のリレーショナルDB |
| Validation | Custom Engine | 労基法準拠の業務ルールチェック |
| PDF | **jsPDF** + jspdf-autotable | クライアントサイドPDF生成 |
| Date | **date-fns 4** | 軽量な日付操作 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v10+
- [Rust](https://rustup.rs/) v1.77+
- Linux: `libwebkit2gtk-4.1-dev`, `libpango1.0-dev`, `libatk1.0-dev`, `libgdk-pixbuf-2.0-dev`, `libsoup-3.0-dev`

```bash
# Ubuntu/Debian system dependencies
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libpango1.0-dev libatk1.0-dev \
  libgdk-pixbuf-2.0-dev libsoup-3.0-dev libjavascriptcoregtk-6.0-dev
```

### Installation

```bash
git clone https://github.com/GudE-R/shift-app.git
cd shift-app
pnpm install
```

### Development

```bash
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` に生成されます。

---

## Project Structure

```
shift-app/
├── docs/                           # 設計ドキュメント
│   ├── 20260406_requirements_local.md   # 要件定義書 v2.1
│   ├── 20260406_design_local.md         # システム設計書 v2.1
│   ├── 20260406_diagrams_local.md       # 図解集 (Mermaid)
│   └── 20260407_implementation_plan.md  # 実装計画書
│
├── src-tauri/                      # Rust backend
│   ├── src/lib.rs                       # Tauri plugin registration
│   └── tauri.conf.json                  # App configuration
│
├── src/                            # React frontend
│   ├── components/
│   │   ├── auth/                        # Password screen
│   │   ├── calendar/                    # Shift calendar (core)
│   │   ├── dashboard/                   # Dashboard
│   │   ├── export/                      # PDF/CSV export
│   │   ├── layout/                      # Sidebar, MainLayout
│   │   ├── requirements/               # Staffing requirements
│   │   ├── staff/                       # Staff management
│   │   ├── stores/                      # Store management
│   │   └── ui/                          # shadcn/ui components
│   ├── db/
│   │   ├── database.ts                  # SQLite init & connection
│   │   ├── schema.sql                   # 11 table definitions
│   │   └── queries/                     # Per-table CRUD functions
│   ├── services/
│   │   ├── mock-ai-generator.ts         # Greedy shift generation
│   │   ├── pdf-export.ts                # A3 landscape PDF
│   │   └── csv-export.ts                # UTF-8 BOM CSV
│   ├── stores/                          # Zustand state stores
│   ├── validation/rules.ts             # Business rule engine
│   └── types/index.ts                  # Shared TypeScript types
│
└── package.json
```

---

## Database Schema

11テーブル構成のローカルSQLite。詳細は [設計書](docs/20260406_design_local.md) を参照。

```
stores              — 店舗マスタ
positions           — ポジション定義
staff               — スタッフ（本名はローカルのみ保持）
staff_stores        — スタッフ×出勤可能店舗
staff_positions     — スタッフ×対応可能ポジション
staff_availability  — 曜日別出勤可否 (○/△/×)
staff_ng_dates      — 絶対NG日
store_requirements  — 時間帯別必要人員
shift_entries       — シフトエントリ
conflict_logs       — 同期コンフリクト履歴 (Phase 2)
app_settings        — アプリ設定 (パスワードハッシュ等)
```

---

## Validation Rules

| Rule | Threshold | Severity |
|:-----|:----------|:---------|
| 休憩不足 | 6h超 → 45分 / 8h超 → 60分 | Error (red) |
| 二重配置 | 同一スタッフが同時刻に複数店舗 | Error (block) |
| 長時間労働 | 週40h超 / 日12h超 | Warning (yellow) |
| 連続勤務 | max_consecutive_days超過 (default: 5) | Warning (yellow) |

休憩ルールは労働基準法第34条に準拠。

---

## AI Shift Generation

現在はモック実装（貪欲法アルゴリズム）。Phase 2でGemini API連携に差し替え予定。

**アルゴリズム:**
1. 手動保護シフト (`is_manual_modified = true`) を除外
2. 各要件スロットに対して適格スタッフを抽出
3. 割当時間が少ない順にソート（労働時間均等化）
4. 上位N人を配置、休憩時間を自動計算
5. 充足できないスロットは警告として返却

**制約チェック:** NG日、曜日可否、夜勤不可、二重配置禁止、ポジション適性

---

## Documentation

設計ドキュメントは `docs/` にあり、3回のクロスレビュー (Claude/Gemini) を経て整合性を確保済みです。

| Document | Description |
|:---------|:------------|
| [要件定義書](docs/20260406_requirements_local.md) | 機能要件・フェーズ定義・画面設計 |
| [システム設計書](docs/20260406_design_local.md) | DB設計・API仕様・バリデーション・同期設計 |
| [図解集](docs/20260406_diagrams_local.md) | アーキテクチャ図・ER図・シーケンス図 (Mermaid) |
| [実装計画書](docs/20260407_implementation_plan.md) | 技術選定・実装ステップ・検証方法 |

---

## License

ISC
