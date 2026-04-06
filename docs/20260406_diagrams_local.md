# 図解集 — AIシフト作成アプリ「ShiftCraft (Local-first)」

> **最終更新**: 2026-04-06
> **関連ドキュメント**: `20260406_requirements_local.md` / `20260406_design_local.md` (v2.1)

---

## 目次

1. [アーキテクチャ図 (Local-first 詳細)](#1-アーキテクチャ図-local-first-詳細)
2. [画面遷移図 (Mobile & Desktop)](#2-画面遷移図-mobile--desktop)
3. [ER図 (Local SQLite Schema)](#3-er図-local-sqlite-schema)
4. [シーケンス図: 匿名化 AI シフト生成](#4-シーケンス図-匿名化-ai-シフト生成)
5. [シーケンス図: D&D 編集 (Local Optimistic)](#5-シーケンス図-dd-編集-local-optimistic)
6. [シーケンス図: E2EE 暗号化同期](#6-シーケンス図-e2ee-暗号化同期)
7. [シーケンス図: 同期コンフリクト解決](#7-シーケンス図-同期コンフリクト解決)
8. [シーケンス図: PDF 出力フロー](#8-シーケンス図-pdf-出力フロー)
9. [シーケンス図: CSV 出力フロー](#9-シーケンス図-csv-出力フロー)

---

## 1. アーキテクチャ図 (Local-first 詳細)

```mermaid
graph TB
    subgraph App["ローカルアプリ (Tauri / Expo)"]
        UI[React UI]
        Store[Zustand Store]
        DB[(Local SQLite)]
        Crypto[E2EE Engine]
        Val[Local Validator]

        UI <--> Store
        Store <--> Val
        Store <--> DB
        DB <--> Crypto
    end

    subgraph Cloud["クラウド / 外部"]
        Sync[(Supabase Storage)]
        Proxy[Anonymous AI Proxy]
        Gemini[Gemini API]

        Proxy <--> Gemini
    end

    Crypto <-->|Encrypted Blob| Sync
    Store <-->|Anonymous JSON| Proxy
```

---

## 2. 画面遷移図 (Mobile & Desktop)

```mermaid
graph TD
    Start((開始)) --> Login[パスワード入力]
    Login -- 鍵生成/復号成功 --> Dashboard[ダッシュボード]

    Dashboard --> Stores[店舗管理]
    Dashboard --> Staff[スタッフ管理]
    Dashboard --> Requirements[必要人員設定]
    Dashboard --> Shifts[シフトカレンダー]
    Dashboard --> Settings[設定 / 秘密鍵バックアップ]

    Shifts -- AI生成依頼 --> Generate[匿名化生成]
    Generate -- 生成完了 --> Shifts
    Shifts -- D&D調整 --> Shifts
    Shifts -- 印刷 --> Export[出力画面]
```

---

## 3. ER図 (Local SQLite Schema)

```mermaid
erDiagram
    STORES ||--o{ POSITIONS : "has"
    STORES ||--o{ SHIFT_ENTRIES : "at"
    STORES ||--o{ STAFF_STORES : "available_at"
    STAFF ||--o{ STAFF_STORES : "can_work_at"
    STAFF ||--o{ STAFF_POSITIONS : "can_do"
    POSITIONS ||--o{ STAFF_POSITIONS : "done_by"
    STAFF ||--o{ SHIFT_ENTRIES : "assigned"
    POSITIONS ||--o{ SHIFT_ENTRIES : "for"
    STAFF ||--o{ STAFF_AVAILABILITY : "available_on"
    STAFF ||--o{ STAFF_NG_DATES : "unavailable_on"
    STORES ||--o{ STORE_REQUIREMENTS : "defines"
    POSITIONS ||--o{ STORE_REQUIREMENTS : "applies_to"
    STORES {
        uuid id PK
        text name
        text color
        json business_hours
        int sort_order
        timestamp updated_at
    }

    POSITIONS {
        uuid id PK
        uuid store_id FK
        text name
        timestamp updated_at
    }

    STAFF {
        uuid id PK
        text display_name "本名（ローカルのみ）"
        text anonymous_id UK "API送信用"
        text status
        boolean night_shift_ok
        decimal target_hours
        decimal min_hours
        decimal max_hours
        int max_consecutive_days "連続勤務上限"
        text memo
        timestamp updated_at
    }

    STAFF_STORES {
        uuid staff_id FK
        uuid store_id FK
        timestamp updated_at
    }

    STAFF_POSITIONS {
        uuid staff_id FK
        uuid position_id FK
        timestamp updated_at
    }

    STAFF_AVAILABILITY {
        uuid id PK
        uuid staff_id FK
        int day_of_week "0=日 - 6=土"
        text status "○/△/×"
        timestamp updated_at
    }

    STAFF_NG_DATES {
        uuid id PK
        uuid staff_id FK
        date ng_date
        text reason
        timestamp updated_at
    }

    STORE_REQUIREMENTS {
        uuid id PK
        uuid store_id FK
        uuid position_id FK
        date work_date
        time start_time
        time end_time
        int count
        timestamp updated_at
    }

    CONFLICT_LOGS {
        uuid id PK
        text table_name "任意テーブルの競合を記録"
        uuid record_id
        json old_data
        json new_data
        timestamp created_at
    }

    SHIFT_ENTRIES {
        uuid id PK
        uuid staff_id FK
        uuid store_id FK
        uuid position_id FK
        date work_date
        time start_time
        time end_time
        int break_time_minutes
        boolean is_ai_generated
        boolean is_manual_modified
        timestamp updated_at
    }
```

---

## 4. シーケンス図: 匿名化 AI シフト生成

```mermaid
sequenceDiagram
    participant App as ローカルアプリ
    participant Proxy as AI プロキシ
    participant Gemini as Gemini API

    App->>App: データを抽出・匿名化<br/>(本名 -> anonymous_id)
    App->>Proxy: POST /api/generate (匿名データ)
    Proxy->>Gemini: シフト案の計算依頼
    Gemini-->>Proxy: 回答 (anonymous_idベース)
    Proxy-->>App: JSON データ
    App->>App: データを復元・DB保存<br/>(anonymous_id -> 本名)
```

---

## 5. シーケンス図: D&D 編集 (Local Optimistic)

```mermaid
sequenceDiagram
    actor Owner as オーナー
    participant UI as カレンダーUI
    participant DB as Local SQLite
    participant Val as Local Validator

    Owner->>UI: シフトを移動
    UI->>Val: リアルタイム検証
    Val-->>UI: 警告表示 (休憩不足等)
    UI->>DB: 非同期で保存
    Note right of DB: ネット不要、遅延ゼロ
```

---

## 6. シーケンス図: E2EE 暗号化同期

```mermaid
sequenceDiagram
    participant DevA as 端末 A (PC)
    participant Sync as クラウド同期
    participant DevB as 端末 B (スマホ)

    DevA->>DevA: SQLite 更新
    DevA->>DevA: AES-GCM で暗号化
    DevA->>Sync: 暗号化 Blob 送信
    Sync-->>DevB: 更新通知
    DevB->>Sync: Blob ダウンロード
    DevB->>DevB: ローカルの鍵で復号
    DevB->>DevB: SQLite マージ
```

---

## 7. シーケンス図: 同期コンフリクト解決

```mermaid
sequenceDiagram
    participant DevA as 端末 A (PC)
    participant Sync as クラウド同期
    participant DevB as 端末 B (スマホ)

    Note over DevA, DevB: 同じシフトを同時に編集した場合

    DevA->>Sync: 変更A (updated_at: T1)
    DevB->>Sync: 変更B (updated_at: T2)

    Sync-->>DevA: 変更B を受信
    DevA->>DevA: コンフリクト検出<br/>(同一レコードに異なる変更)

    alt 自動解決（LWW: Last Write Wins）
        DevA->>DevA: updated_at が新しい方を採用<br/>古い方を conflict_log に記録
    else 手動解決（競合が複雑な場合）
        DevA->>DevA: 両方の変更を保持<br/>警告パネルに表示
        Note right of DevA: オーナーが最終判断
    end

    DevA->>Sync: 解決済みデータを同期
    Sync-->>DevB: 解決済みデータを配信
```

---

## 8. シーケンス図: PDF 出力フロー

```mermaid
sequenceDiagram
    actor Owner as オーナー
    participant App as ローカルアプリ
    participant PDF as PDF Engine (Local)

    Owner->>App: PDF出力ボタン押下
    App->>App: ローカルDBから全データ取得
    App->>PDF: レイアウト生成 (A3横)
    PDF-->>Owner: PDFファイル保存/印刷
    Note right of PDF: サーバーへ送らずに手元で生成
```

---

## 9. シーケンス図: CSV 出力フロー

```mermaid
sequenceDiagram
    actor Owner as オーナー
    participant App as ローカルアプリ

    Owner->>App: CSV出力ボタン押下
    App->>App: 表示中期間のシフトデータを取得
    App->>App: UTF-8 BOM付きCSV生成
    App-->>Owner: CSVファイル保存
    Note right of App: Excel等で開いて加工可能
```
