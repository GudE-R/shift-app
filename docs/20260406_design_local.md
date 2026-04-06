# システム設計書 — AIシフト作成アプリ「ShiftCraft (Local-first)」

> **最終更新**: 2026-04-06
> **ステータス**: ドラフト v2.1 (Local-first 完全統合版)
> **対応要件定義書**: `20260406_requirements_local.md` (v2.1)

---

## 1. アーキテクチャ詳細

### 1.1 全体構成 (Local-first)

| レイヤー | 技術 | 役割 |
|----------|------|------|
| **デスクトップ** | **Tauri** (Rust + React) | バックヤード編集、SQLite直操作 |
| **モバイル** | **React Native** (Expo) | 現場調整、SQLite直操作 |
| **共有ロジック** | **Zustand** | 状態管理（編集中シフト、フィルタ等） |
| **暗号化** | **libsodium / Web Crypto** | E2EE（エンドツーエンド暗号化） |
| **同期サーバー** | **Supabase** | 暗号化Blobの中継、Auth、Storage |
| **AI 窓口** | **Next.js API (Edge)** | 匿名化データの受付、Gemini API 呼び出し |

### 1.2 ディレクトリ構成 (モノレポ案)

```text
shift-craft/
├── apps/
│   ├── desktop/           # Tauri (React + Rust)
│   ├── mobile/            # React Native (Expo)
│   └── api/               # Next.js (Anonymous AI Proxy)
├── packages/
│   ├── ui/                # shadcn/ui 共通コンポーネント
│   ├── db/                # SQLite Schema / WatermelonDB models
│   ├── crypto/            # E2EE / 匿名化ロジック
│   └── validation/        # 業務ルール・バリデーション
└── docs/                  # 設計ドキュメント (v2.1)
```

## 2. データ設計 (Local SQLite)

### 2.1 テーブル定義詳細

#### STORES
```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    business_hours JSON NOT NULL, -- 曜日別営業時間
    sort_order INT DEFAULT 0
);
```

#### STAFF
本名などの個人情報はここでのみ保持。
```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY,
    display_name TEXT NOT NULL, -- 本名
    anonymous_id TEXT UNIQUE,   -- API送信用の固定ID (staff_xxx)
    status TEXT DEFAULT 'active',
    night_shift_ok BOOLEAN DEFAULT true,
    monthly_hours_target DECIMAL(5,1),
    memo TEXT -- 暗黙ルール等
);
```

#### SHIFT_ENTRIES
```sql
CREATE TABLE shift_entries (
    id UUID PRIMARY KEY,
    staff_id UUID REFERENCES staff(id),
    store_id UUID REFERENCES stores(id),
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_time_minutes INT DEFAULT 0,
    is_ai_generated BOOLEAN DEFAULT true,
    is_manual_modified BOOLEAN DEFAULT false -- 手動修正フラグ
);
```

## 3. 匿名化 AI 生成仕様

### 3.1 匿名化プロキシ API
`POST /api/generate` (Next.js Edge Function)

**リクエスト (匿名化済み)**:
```typescript
{
  staff: Array<{
    anonymous_id: string;
    skills: string[];
    availability: any;
    constraints: any;
  }>,
  requirements: any;
}
```

### 3.2 Gemini プロンプト (匿名ベース)
プロンプトには「名前」を出さず、「匿名IDを座標として最適化せよ」と指示。
二重配置禁止ルールを最優先事項として組み込む。

## 4. 業務ロジック・バリデーション

ローカルアプリ（Tauri/Expo）側でリアルタイムに実行。

| ルール名 | 閾値 | 処理 |
|----------|------|------|
| 休憩不足 | 6h超45m / 8h超1h | 警告（赤） |
| 二重配置 | 同一時刻に他店舗存在 | 確定ブロック（Error） |
| 長時間労働 | 週40h / 日12h | 警告（黄） |
| 連続勤務 | 5日以上 | 警告（黄） |

## 5. 同期・セキュリティ (E2EE)

### 5.1 暗号化フロー
1. 端末 A で SQLite 更新。
2. 秘密鍵（パスワード由来）で AES-256-GCM 暗号化。
3. `SyncPayload` として Supabase へアップロード。
4. 端末 B で検知 → ダウンロード → 復号 → SQLite マージ。

## 6. パフォーマンス設計

- **React.memo**: カレンダーセルの再レンダリングを最小化。
- **Virtual Scroll**: 大規模なスタッフ数（50人〜）でも月間ビューを滑らかに表示。
- **Optimistic Updates**: D&D操作時は即座にローカルDBを更新し、同期はバックグラウンドで。
