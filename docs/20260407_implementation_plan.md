# 実装計画書 — ShiftCraft Phase 1 MVP

> **作成日**: 2026-04-07
> **対応設計書**: `20260406_requirements_local.md` / `20260406_design_local.md` (v2.1)
> **スコープ**: Phase 1 MVP（デスクトップ単体）

---

## 1. 目的

設計書3本（要件定義・設計・図解）に基づき、Phase 1 MVPを実装する。
Gemini APIキーは未取得のため、AI生成はモック実装とし、後からAPI差し替え可能な設計にする。

## 2. 環境状況

| 項目 | 状態 |
|------|------|
| Node.js | v20.19.6 OK |
| pnpm | 10.33 OK |
| webkit2gtk | OK |
| **Rust** | **未インストール（要インストール）** |

## 3. プロジェクト構造

Phase 1はデスクトップのみのため、モノレポではなく**フラット構成**を採用。
Phase 2でモバイル追加時に `packages/` へ共通ロジックを分離する。

```
shift-app/
├── docs/                    # 既存設計書
├── src-tauri/               # Rust backend (Tauri v2)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   └── src/
│       └── lib.rs
├── src/                     # React frontend
│   ├── main.tsx
│   ├── App.tsx              # Router + Layout
│   ├── db/
│   │   ├── schema.sql       # 11テーブルのCREATE文
│   │   ├── database.ts      # DB初期化・接続
│   │   └── queries/         # テーブルごとのCRUD関数
│   │       ├── stores.ts
│   │       ├── positions.ts
│   │       ├── staff.ts
│   │       ├── staff-stores.ts
│   │       ├── staff-positions.ts
│   │       ├── staff-availability.ts
│   │       ├── staff-ng-dates.ts
│   │       ├── store-requirements.ts
│   │       ├── shift-entries.ts
│   │       └── conflict-logs.ts
│   ├── stores/              # Zustand stores
│   │   ├── useStoreStore.ts
│   │   ├── useStaffStore.ts
│   │   ├── useShiftStore.ts
│   │   ├── useCalendarStore.ts
│   │   └── useAuthStore.ts
│   ├── validation/
│   │   ├── rules.ts         # 4つのバリデーションルール
│   │   └── types.ts
│   ├── services/
│   │   ├── mock-ai-generator.ts   # モックAI生成
│   │   ├── pdf-export.ts          # PDF出力
│   │   └── csv-export.ts          # CSV出力
│   ├── components/
│   │   ├── ui/              # shadcn/ui (自動生成)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── auth/
│   │   │   └── PasswordScreen.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── WeeklySummary.tsx
│   │   │   ├── StaffingRate.tsx
│   │   │   └── WarningCount.tsx
│   │   ├── stores/
│   │   │   ├── StoreListPage.tsx
│   │   │   ├── StoreForm.tsx
│   │   │   └── PositionManager.tsx
│   │   ├── staff/
│   │   │   ├── StaffListPage.tsx
│   │   │   ├── StaffForm.tsx
│   │   │   ├── AvailabilityEditor.tsx
│   │   │   └── NgDateEditor.tsx
│   │   ├── requirements/
│   │   │   ├── RequirementsPage.tsx
│   │   │   └── RequirementForm.tsx
│   │   ├── calendar/
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── MonthView.tsx
│   │   │   ├── WeekView.tsx
│   │   │   ├── ShiftCell.tsx
│   │   │   ├── ShiftEntryDialog.tsx
│   │   │   ├── StaffRow.tsx
│   │   │   ├── ValidationPanel.tsx
│   │   │   └── GenerateButton.tsx
│   │   └── export/
│   │       └── ExportDialog.tsx
│   ├── hooks/
│   │   ├── useDatabase.ts
│   │   └── useValidation.ts
│   ├── lib/
│   │   └── utils.ts         # cn() helper, date utils
│   └── types/
│       └── index.ts         # 共有TypeScript型定義
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── components.json          # shadcn/ui config
```

## 4. 技術選定

### 主要パッケージ

| カテゴリ | パッケージ | 理由 |
|----------|-----------|------|
| フレームワーク | Tauri v2 + React 19 + Vite | 設計書準拠 |
| 状態管理 | Zustand v5 | 設計書準拠 |
| ルーティング | react-router-dom v7 | SPA内画面遷移 |
| DB | @tauri-apps/plugin-sql | Tauri公式SQLiteプラグイン |
| ファイル操作 | @tauri-apps/plugin-dialog, plugin-fs | PDF/CSV保存ダイアログ |
| D&D | @dnd-kit/core + sortable | モダンDnDライブラリ（react-beautiful-dndは非推奨） |
| PDF | jspdf + jspdf-autotable | ローカル完結のPDF生成 |
| 日付操作 | date-fns v4 | 軽量な日付ライブラリ |
| UI | shadcn/ui + Tailwind CSS | 設計書準拠 |
| アイコン | lucide-react | shadcn/uiと統合済み |

### 不採用としたもの

| 候補 | 不採用理由 |
|------|-----------|
| UUIDライブラリ | `crypto.randomUUID()` で十分 |
| カレンダーライブラリ | スタッフ×日付グリッドは標準カレンダーと異なる。カスタムグリッドの方がシンプル |
| フォームライブラリ | shadcn/ui + 制御コンポーネントで十分な規模 |
| i18nライブラリ | 日本語のみ |

## 5. 実装ステップ（順序）

### Step 0: Rust インストール
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

### Step 1: Tauri プロジェクト スキャフォールド
`pnpm create tauri-app` で React + TypeScript + Vite テンプレート生成。
既存の `docs/` ディレクトリは保持。

### Step 2: Tailwind CSS + shadcn/ui セットアップ
shadcn/uiコンポーネント: button, input, dialog, select, table, card, tabs, badge, form, label, textarea, checkbox, toast, separator

### Step 3: Tauri プラグイン設定
- `tauri-plugin-sql`（sqlite feature）
- `tauri-plugin-dialog`
- `tauri-plugin-fs`
- `tauri-plugin-store`（パスワードハッシュ保存用）

`Cargo.toml`、`lib.rs`、`tauri.conf.json`、`capabilities/` を設定。

### Step 4: TypeScript 型定義
`src/types/index.ts` に11テーブル分のインターフェースを定義。
`Store`, `Position`, `Staff`, `StaffAvailability`, `StaffNgDate`, `StoreRequirement`, `ShiftEntry` 等。
`ValidationWarning`, `ValidationError` 型も定義。

### Step 5: DB層
- `src/db/schema.sql` — 設計書のCREATE TABLE文をそのまま使用
- `src/db/database.ts` — `Database.load("sqlite:shiftcraft.db")` で初期化、schema.sqlを実行
- `src/db/queries/*.ts` — テーブルごとにCRUD関数を実装

**UUID**: `crypto.randomUUID()` でフロントエンド側で生成してINSERT。
**日付/時刻**: TEXT型（`YYYY-MM-DD` / `HH:mm`）で格納。

### Step 6: バリデーションエンジン

| ルール | 条件 | 重大度 |
|--------|------|--------|
| 休憩不足 | 6h超→45m / 8h超→1h未満 | error（赤） |
| 二重配置 | 同一スタッフ・同時刻に他店舗 | error（ブロック） |
| 長時間労働 | 週40h超 / 日12h超 | warning（黄） |
| 連続勤務 | max_consecutive_days超過（デフォルト5日） | warning（黄） |

```typescript
// src/validation/rules.ts
export function validateShifts(shifts: ShiftEntry[], staff: Staff[]): ValidationResult[]
```

### Step 7: Zustand stores
- `useStoreStore` — 店舗・ポジションの状態とCRUD
- `useStaffStore` — スタッフ・可否・NG日の状態とCRUD
- `useShiftStore` — シフトエントリ + バリデーション結果
- `useCalendarStore` — currentMonth, viewMode, selectedStoreId（UI状態のみ）
- `useAuthStore` — isUnlocked, パスワード検証

### Step 8: レイアウト + ルーティング + パスワード画面

**ルート構成:**
| パス | コンポーネント | 説明 |
|------|---------------|------|
| `/` | DashboardPage | ダッシュボード |
| `/stores` | StoreListPage | 店舗・ポジション管理 |
| `/staff` | StaffListPage | スタッフ管理 |
| `/requirements` | RequirementsPage | 必要人員設定 |
| `/calendar` | CalendarPage | シフトカレンダー |

`PasswordScreen` はルートではなく、未ロック時に表示するフルスクリーンオーバーレイ。

### Step 9: 店舗・ポジション CRUD画面
- テーブル一覧 + モーダルフォーム（追加/編集）
- ポジションは店舗詳細内でインライン管理

### Step 10: スタッフ CRUD画面
- テーブル一覧 + モーダルフォーム
- タブ構成: 基本情報 / 曜日別可否（7日グリッド） / NG日（日付ピッカー） / 店舗・ポジション（チェックボックス）

### Step 11: 必要人員設定画面
- 店舗・ポジション・日付を選択 → 時間帯・人数を入力

### Step 12: シフトカレンダー（核心機能）

**カスタムグリッド** (カレンダーライブラリ不使用):
```
┌─────────┬──────┬──────┬──────┬...┬──────┐
│ スタッフ │ 4/1  │ 4/2  │ 4/3  │   │ 4/30 │
├─────────┼──────┼──────┼──────┼...┼──────┤
│ 田中    │ 9-17 │      │10-18 │   │ 9-14 │
│ 佐藤    │10-18 │ 9-17 │      │   │      │
└─────────┴──────┴──────┴──────┴...┴──────┘
```

- `@dnd-kit` でセル間のD&D（スタッフ/日付の変更）
- 月間/週間ビュー切替
- `ValidationPanel` を画面下部に常時表示
- `React.memo` でセル再レンダリング最適化

### Step 13: モックAI生成

**アルゴリズム**: 貪欲法（greedy slot-filling）
1. `is_manual_modified = true` のシフトを除外（手動保護）
2. 各要件スロット（日付×時間帯×ポジション×人数）に対して:
   - 適格スタッフを抽出（店舗・ポジション・曜日可否・NG日チェック）
   - 現時点の割当時間が少ない順にソート（労働時間均等化）
   - 上位N人を割当
3. 休憩時間を自動設定（6h超→45m / 8h超→60m）
4. 全シフトにバリデーション実行
5. `{ shifts, warnings }` を返却

**インターフェース**: 後でGemini API実装に差し替え可能な同一型定義。
**UX**: 1-2秒の擬似遅延 + プログレス表示。

### Step 14: PDF出力
- **ライブラリ**: jspdf + jspdf-autotable
- **レイアウト**: A3横、スタッフ名×日付のグリッド、ポジション色分け
- **日本語**: NotoSansJPフォント埋め込み必須
- **保存**: Tauriファイルダイアログで保存先選択

### Step 15: CSV出力
- **形式**: UTF-8 BOM付き（Excel対応）
- **カラム**: 日付, スタッフ名, 店舗名, ポジション, 開始時間, 終了時間, 休憩(分)
- **対象**: カレンダー表示中の期間

### Step 16: ダッシュボード
- **週間サマリー**: 当週の日別シフト数・合計労働時間
- **充足率**: 配置人数 ÷ 必要人数 × 100%
- **警告数**: バリデーションエンジン結果の件数表示
- **更新**: 表示時にSQLiteから都度計算（キャッシュなし）

## 6. 注意事項

| 項目 | 対応 |
|------|------|
| PDF日本語 | NotoSansJPフォントをbase64埋め込み |
| UUID | `crypto.randomUUID()` 使用。ライブラリ不要 |
| 日付/時刻 | TEXT型（YYYY-MM-DD / HH:mm）。date-fnsで操作 |
| business_hours JSON | `Record<number, { open: string; close: string }>` 型 |
| カレンダー性能 | 50人×30日=1500セル。React.memo必須。必要に応じてvirtualization追加 |
| パスワード | Phase 1はUIゲートのみ（SQLite暗号化なし）。E2EEはPhase 2 |

## 7. 検証方法

1. `pnpm tauri dev` でアプリ起動
2. 店舗登録 → ポジション追加 → スタッフ登録（可否・NG日設定）→ 必要人員設定
3. AI生成実行 → カレンダーにシフト表示
4. D&Dでシフト移動 → バリデーション警告確認
5. 手動編集後にAI再生成 → 手動保護シフトが維持されることを確認
6. PDF出力 → A3横レイアウト・日本語表示確認
7. CSV出力 → Excelで文字化けなく開けることを確認
8. ダッシュボード → 充足率・警告数が正確に表示されることを確認
