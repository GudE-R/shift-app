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
    sort_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### POSITIONS
```sql
CREATE TABLE positions (
    id UUID PRIMARY KEY,
    store_id UUID REFERENCES stores(id),
    name TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### STAFF
本名などの個人情報はここでのみ保持。
```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY,
    display_name TEXT NOT NULL,  -- 本名
    anonymous_id TEXT UNIQUE,    -- API送信用の固定ID (staff_xxx)
    status TEXT DEFAULT 'active',
    night_shift_ok BOOLEAN DEFAULT true,
    target_hours DECIMAL(5,1),   -- 月間目標時間
    min_hours DECIMAL(5,1),      -- 月間最低時間
    max_hours DECIMAL(5,1),      -- 月間上限時間
    max_consecutive_days INT,    -- 連続勤務上限（null = 制限なし）
    memo TEXT,                   -- 暗黙ルール等
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### STAFF_STORES（出勤可能店舗）
```sql
CREATE TABLE staff_stores (
    staff_id UUID REFERENCES staff(id),
    store_id UUID REFERENCES stores(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (staff_id, store_id)
);
```

#### STAFF_POSITIONS（対応可能ポジション）
```sql
CREATE TABLE staff_positions (
    staff_id UUID REFERENCES staff(id),
    position_id UUID REFERENCES positions(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (staff_id, position_id)
);
```

#### STAFF_AVAILABILITY（曜日別出勤可否）
```sql
CREATE TABLE staff_availability (
    id UUID PRIMARY KEY,
    staff_id UUID REFERENCES staff(id),
    day_of_week INT NOT NULL,    -- 0=日, 1=月, ..., 6=土
    status TEXT NOT NULL,        -- '○' / '△' / '×'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, day_of_week)
);
```

#### STAFF_NG_DATES（絶対NG日）
```sql
CREATE TABLE staff_ng_dates (
    id UUID PRIMARY KEY,
    staff_id UUID REFERENCES staff(id),
    ng_date DATE NOT NULL,
    reason TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, ng_date)
);
```

#### STORE_REQUIREMENTS（時間帯別必要人員）
```sql
CREATE TABLE store_requirements (
    id UUID PRIMARY KEY,
    store_id UUID REFERENCES stores(id),
    position_id UUID REFERENCES positions(id),
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    count INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### CONFLICT_LOGS（コンフリクト履歴）
```sql
CREATE TABLE conflict_logs (
    id UUID PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSON NOT NULL,
    new_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### SHIFT_ENTRIES
```sql
CREATE TABLE shift_entries (
    id UUID PRIMARY KEY,
    staff_id UUID REFERENCES staff(id),
    store_id UUID REFERENCES stores(id),
    position_id UUID REFERENCES positions(id),
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_time_minutes INT DEFAULT 0,
    is_ai_generated BOOLEAN DEFAULT true,
    is_manual_modified BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    position_ids: string[]; // staff_positions の ID 配列
    availability: Array<{ day_of_week: number, status: string }>;
    ng_dates: string[];     // ISO 形式の日付
    target_hours: number;
    min_hours: number;
    max_hours: number;
  }>,
  stores: Array<{
    id: string;
    requirements: Array<{
      position_id: string;
      work_date: string;
      slots: Array<{ start_time: string, end_time: string, count: number }>;
    }>;
  }>
}
```

### 3.2 Gemini プロンプト (匿名ベース)
プロンプトには「名前」を出さず、「匿名IDを座標として最適化せよ」と指示。
二重配置禁止ルールを最優先事項として組み込む。

**レスポンス形式**:
```typescript
{
  shifts: Array<{
    anonymous_id: string;
    store_id: string;
    position_id: string;
    work_date: string;       // YYYY-MM-DD
    start_time: string;      // HH:mm
    end_time: string;        // HH:mm
    break_time_minutes: number;
  }>;
  warnings: Array<{
    type: string;            // "understaffed" | "overtime_risk" 等
    message: string;
    affected_date: string;
  }>;
}
```

**エラーハンドリング**:
| ケース | 対処 |
|--------|------|
| トークン上限超過（スタッフ30人超目安） | 週単位に分割して複数回リクエスト |
| API タイムアウト / レート制限 | 指数バックオフでリトライ（最大3回） |
| 制約充足不可 | `warnings` で不足箇所を返却し、オーナーに判断を委ねる |

### 3.3 AI プロキシ認証
- **認証方式**: Supabase Auth の `access_token` (JWT) をリクエストヘッダーに含める。
- **検証**: Edge Function 側で `supabase.auth.getUser(token)` を実行し、正当なユーザーのみ受け付ける。
- **匿名性**: プロキシ側では `user_id` はログに記録せず、匿名化されたデータ処理のみを行う。

## 4. 業務ロジック・バリデーション

ローカルアプリ（Tauri/Expo）側でリアルタイムに実行。

| ルール名 | 閾値 | 処理 |
|----------|------|------|
| 休憩不足 | 6h超45m / 8h超1h | 警告（赤） |
| 二重配置 | 同一時刻に他店舗存在 | 確定ブロック（Error） |
| 長時間労働 | 週40h / 日12h | 警告（黄） |
| 連続勤務 | staff.max_consecutive_days 超過 (未設定時はデフォルト5日) | 警告（黄） |

## 5. 同期・セキュリティ (E2EE)

### 5.1 暗号化フロー
1. 端末 A で SQLite 更新。
2. 秘密鍵（パスワード由来）で AES-256-GCM 暗号化。
3. `SyncPayload` として Supabase へアップロード。
4. 端末 B で検知 → ダウンロード → 復号 → SQLite マージ。

### 5.2 同期単位
- テーブル単位ではなく **レコード単位** で変更を追跡。
- 各レコードに `updated_at` タイムスタンプを持たせ、変更検知に使用。

### 5.3 コンフリクト解決
**シフトデータ（shift_entries）**:
| 条件 | 解決方法 |
|------|----------|
| 異なるレコードの変更 | 両方を適用（競合なし） |
| 同一レコード・片方のみ手動修正 | `is_manual_modified = true` 側を優先 |
| 同一レコード・両方AI生成 | LWW（Last Write Wins: `updated_at` が新しい方を採用） |
| 同一レコード・両方手動修正 | 警告パネルに表示し、オーナーが選択 |

**マスタデータ（stores / staff / positions 等）**:
| 条件 | 解決方法 |
|------|----------|
| 異なるレコードの変更 | 両方を適用（競合なし） |
| 同一レコードの変更 | LWW（`updated_at` が新しい方を採用） |

- 上書きされた変更は `conflict_log` テーブルに保存し、必要に応じて復元可能にする。

## 6. セキュリティ詳細 (E2EE)

### 6.1 秘密鍵の生成と管理
- **鍵生成**: パスワード + Salt から PBKDF2 により導出。
- **ストレージ**: 各端末のセキュアストレージ（Keychain / Keystore / Tauri Safe Storage）に保管。

### 6.2 バックアップとリカバリ
- **リカバリーフレーズ**: 24単語の BIP39 ニーモニックを生成。
- **バックアップ**: オーナーはフレーズを紙に控えるか、物理的に安全な場所に保管する。
- **リカバリ**: 新しい端末でアプリをインストールした際、リカバリーフレーズを入力することで、クラウドからダウンロードした暗号化 Blob を復号可能にする。

## 7. パフォーマンス設計

- **React.memo**: カレンダーセルの再レンダリングを最小化。
- **Virtual Scroll**: 大規模なスタッフ数（50人〜）でも月間ビューを滑らかに表示。
- **Optimistic Updates**: D&D操作時は即座にローカルDBを更新し、同期はバックグラウンドで。
