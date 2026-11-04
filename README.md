# 🍊 柚子社攻略站 · Yuzusoft Guide

> 收錄柚子社（YUZUSOFT）歷代作品的角色資料、劇情簡介與全路線攻略的非官方粉絲站。

[![網站](https://img.shields.io/badge/網站-點此訪問-brightgreen?logo=googlechrome&logoColor=white)](https://yuzusoft-guide.onrender.com/)
![狀態](https://img.shields.io/badge/status-active-success)
![授權](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

> ⏱ 本站部署於 Render 免費方案，首次訪問可能需要 30～50 秒喚醒伺服器，請耐心等待。

---

## 📖 項目簡介

柚子社攻略站是一個由粉絲自發搭建的非官方資料查詢站，專門收錄日本美少女遊戲品牌 **柚子社（YUZUSOFT）** 歷代作品的角色檔案、劇情簡介與全路線攻略。

涵蓋作品：

- 《千戀＊萬花》
- 《天使紛擾》
- 《星光咖啡館與死神之蝶》
- 《魔女的夜宴》

本項目純為學習與交流目的建立，所有遊戲名稱、角色人設、原畫及相關版權均歸 **YUZUSOFT** 所有，不作任何商業用途。

---

## ✨ 功能一覽

| 功能 | 說明 |
|------|------|
| 🏠 **首頁** | 打字機效果展示遊戲／品牌簡介，點擊可跳過 |
| 📖 **故事介紹** | 各作品世界觀與劇情梗概（圖片呈現） |
| 👤 **角色介紹** | 動態拉取角色立繪、年齡、身高、體型、性格、身份、喜好、討厭、服裝等資料 |
| 🗺 **攻略** | 各角色攻略選項與分支路線，滾動式面板 |
| 🔍 **全站搜尋** | 後端加權評分演算法，支援角色名、遊戲名、身份、性格、喜好、服裝等全部欄位，含簡轉繁、拼音、`-` 排除語法、關鍵字高亮 |
| 🎯 **命運邂逅** | 後端多條件評分，依身高、體型、年齡、性格篩選，附匹配百分比與命中理由 |
| ⭐ **我的最愛** | 收藏喜歡的角色，獨立頁面集中管理 |
| 📊 **攻略進度** | 勾選已完成選項，進度條視覺化，資料存 localStorage |
| 🏆 **人氣排行** | 瀏覽量前五名角色排行 |
| 🎬 **視覺特效** | 立繪切換、頁面淡入、光暈脈動、全通路線慶祝等 |
| 🎮 **隱藏彩蛋** | Konami 密碼、Ciallo、雙擊頭像等 8 個彩蛋 |

---

## 🛠 技術架構

本項目採用 **API 驅動的單體應用風格**，後端三檔分離、前端薄渲染。

```
┌─────────────────────────────────────────────┐
│  瀏覽器（HTML / CSS / JS）                    │
│  ┌────────────┐  ┌────────────┐             │
│  │ index.html │  │ script.js  │             │
│  │ styles.css │  │ (薄渲染層)  │             │
│  └────────────┘  └──────┬─────┘             │
│                         │ fetch()            │
└─────────────────────────┼───────────────────┘
                          │
                          │ JSON
                          ▼
┌─────────────────────────────────────────────┐
│  Flask 後端（三檔分離）                       │
│  ┌────────────┐                              │
│  │  app.py    │  ← 路由層（薄）              │
│  │  @route    │                              │
│  └─────┬──────┘                              │
│        │ import                              │
│        ▼                                     │
│  ┌────────────┐  ┌────────────┐             │
│  │  core.py   │──│  data.py   │             │
│  │  業務大腦   │  │  純數據     │             │
│  └─────┬──────┘  └────────────┘             │
│        │ psycopg2                            │
│        ▼                                     │
│  ┌────────────┐                              │
│  │  Neon DB   │  （雲端 PostgreSQL）         │
│  └────────────┘                              │
└─────────────────────────────────────────────┘
```

### 三檔職責劃分

| 檔案 | 職責 | 是否依賴 Flask |
|------|------|:---:|
| `data.py` | 只放 `GAME_DATA` 純數據字典 | ❌ |
| `core.py` | **全部業務邏輯**：數據類、DB、限流、安全標頭、搜索演算法、命運邂逅評分、`handle_*` 入口函式 | ❌ |
| `app.py` | **只做** app 建立、`@app.route` 註冊、`@app.after_request` 套安全標頭、啟動 | ✅ |

### 技術棧

| 層 | 技術 |
|----|------|
| 後端 | Python 3.8+ / Flask 3.x |
| 前端 | 原生 HTML5 / CSS3 / JavaScript（無框架，薄渲染層） |
| 數據 | `data.py` 中的 `GAME_DATA` 字典，啟動時載入記憶體 |
| 計算 | 搜索加權評分、命運邂逅匹配度 → **全部在 `core.py` 後端完成** |
| 存儲 | `localStorage`（收藏、攻略進度、搜尋歷史、前端防刷）+ Neon PostgreSQL（瀏覽量） |
| 部署 | Render（Web Service） |

### 核心優勢

- **後端三層分離**：`data.py` 只管數據、`core.py` 只管業務、`app.py` 只管路由，新增功能不動路由層。
- **前端極薄**：`script.js` 只負責 DOM 渲染與 `localStorage`，所有搜尋、篩選、評分計算都交給後端。
- **零建構工具**：前端無 npm、無打包，直接瀏覽器運行。
- **響應式設計**：桌面、平板、手機皆自適應。
- **安全防護**：嚴格 CSP 標頭 + 後端轉義 + IP 限流 + 前端本地去重雙層防刷。

---

## 📁 項目結構

```
Yuzusoft_Guide/
├── app.py              # 路由層（薄）：只做 app 建立與 @app.route 註冊
├── core.py             # 業務大腦：數據類、DB、限流、安全標頭、搜索、命運邂逅
├── data.py             # 純數據：GAME_DATA 字典
├── requirements.txt    # Python 依賴
├── Procfile            # 部署用進程文件
├── index.html          # 首頁
├── script.js           # 前端薄渲染層（DOM / localStorage / 動畫 / 彩蛋）
├── styles.css          # 樣式
├── README.md
├── LICENSE
└── picture/            # 圖片資源
    ├── yuzusoft-logo.jpg
    ├── background.jpg
    ├── bg-senren.jpg
    ├── bg-tenshi.jpg
    ├── bg-cafe.jpg
    ├── bg-sabbat.jpg
    ├── story-senren.jpg
    ├── story-tenshi.jpg
    ├── story-cafe.jpg
    ├── story-sabbat.jpg
    ├── return-top.png
    ├── char-{code}-{n}.png     # 角色立繪
    └── thumb-{code}-{n}.png    # 角色頭像
```

### 圖片命名規則

- `{code}` 對應遊戲代碼：
  - `senren` → 千戀＊萬花
  - `tenshi` → 天使紛擾
  - `cafe` → 星光咖啡館與死神之蝶
  - `sabbat` → 魔女的夜宴
- `{n}` 為角色在 `data.py` 中的順序（從 1 開始）

---

## 🚀 本地運行

### 環境需求

- Python 3.8 或以上
- pip

### 1. 安裝依賴

```bash
pip install -r requirements.txt
```

### 2. （可選）設定資料庫

若不設定 `DATABASE_URL`，瀏覽量會 fallback 到本地 `view_counts.json`：

```bash
export DATABASE_URL="postgresql://xxx@xxx.neon.tech/neondb?sslmode=require"
```

### 3. 啟動伺服器

```bash
python app.py
```

### 4. 訪問

打開瀏覽器：<http://localhost:5000>

---

## 🔌 API 接口

| 端點 | 方法 | 說明 |
|------|------|------|
| `/` | GET | 返回 `index.html` |
| `/api/meta` | GET | 一次取得遊戲元數據（背景圖、故事圖、首頁文案）+ 預設首頁文案 + 預設背景 |
| `/api/games` | GET | 取得全部遊戲列表 |
| `/api/games/<game>/characters` | GET | 取得某遊戲的全部角色名 |
| `/api/games/<game>/guides` | GET | 取得某遊戲的全部攻略角色 |
| `/api/characters` | GET | 取得全部角色名 |
| `/api/characters/<name>` | GET | 取得單一角色的詳細資料 |
| `/api/guides` | GET | 取得全部攻略角色 |
| `/api/guides/<name>` | GET | 取得單一角色的攻略選項 |
| `/api/search?q=<query>&tab=<all\|character\|guide>` | GET | 後端加權評分搜索（含簡轉繁、拼音、`-` 排除、分組、高亮、建議） |
| `/api/matchmaker?height=&body=&age=&personality=&threshold=` | GET | 後端多條件匹配，回傳百分比 + 命中理由，按匹配度排序 |
| `/api/view/<name>` | POST | 記錄一次瀏覽 |
| `/api/ranking` | GET | 取得瀏覽量前 5 名排行 |
| `/health` | GET | 健康檢查（DB 連線、瀏覽量總計） |

### 範例

```bash
# 取單一遊戲角色
curl http://localhost:5000/api/games/千戀＊萬花/characters
```

```json
["朝武芳乃", "常陸茉子", "叢雨", "蕾娜·列支敦瑙爾", "鞍馬小春", "馬庭蘆花"]
```

```bash
# 取角色詳情
curl http://localhost:5000/api/characters/叢雨
```

```json
{
  "name": "叢雨",
  "age": "500歲",
  "gender": "女",
  "height": "148cm",
  "body_type": "蘿莉",
  "personality": "活潑開朗、愛撒嬌且帶有強烈的反差萌",
  "identity": "寄宿在建實神社的神刀「叢雨丸」中的靈魂與管理者",
  "likes": ["被摸頭", "惡作劇", "自由與交流", "泡溫泉"],
  "dislikes": ["幽靈鬼怪", "孤獨寂寞"],
  "clothes": ["神刀服", "校服"]
}
```

```bash
# 後端搜索（含高亮、分組、建議）
curl "http://localhost:5000/api/search?q=巫女"
```

```json
{
  "q": "巫女",
  "tab": "all",
  "total": 3,
  "counts": { "all": 3, "character": 3, "guide": 0 },
  "groups": [
    {
      "game": "千戀＊萬花",
      "items": [
        {
          "type": "character",
          "name": "朝武芳乃",
          "game": "千戀＊萬花",
          "code": "senren",
          "index": 1,
          "name_html": "朝武芳乃",
          "sub_html": "· 身份",
          "score": 40
        }
      ]
    }
  ],
  "suggestions": []
}
```

```bash
# 命運邂逅（多條件）
curl "http://localhost:5000/api/matchmaker?body=蘿莉&age=old&threshold=50"
```

```json
{
  "filters": { "height": [], "body": ["蘿莉"], "age": ["old"], "personality": [] },
  "threshold": 50,
  "total": 1,
  "results": [
    {
      "name": "叢雨",
      "game": "千戀＊萬花",
      "code": "senren",
      "index": 3,
      "height": "148cm",
      "match_percent": 100,
      "matched": ["體型 蘿莉", "年齡"],
      "missed": []
    }
  ]
}
```

---

## 📊 數據結構

### `data.py` — 純數據

`data.py` 只放 `GAME_DATA` 一個頂層大字典，不 import 任何東西，不含任何類：

```python
GAME_DATA = {
    "千戀＊萬花": {
        "characters": [
            {
                "name": "朝武芳乃",
                "age": "17歲",
                "gender": "女",
                "height": "152cm",
                "body_type": "少女",
                "personality": "認真負責、略微穩重、有著孩子氣的一面",
                "identity": "穗織建實神社的巫女姬",
                "likes": ["甜食糕點", "新奇事物", "歷史傳統"],
                "dislikes": ["不端正的舉止", "自己的固執"],
                "clothes": ["巫女服", "日常和服/校服"]
            }
            # ...
        ],
        "guides": {
            "朝武芳乃": [
                "敷衍過去",
                "不好説",
                # ...
            ]
            # ...
        }
    }
    # ...
}
```

### `core.py` — 三個核心類別

| 類別 | 職責 |
|------|------|
| `Character` | 封裝單一角色資料 |
| `CharacterGuide` | 封裝單一角色攻略選項 |
| `CharacterManager` | 啟動時載入 `GAME_DATA`，提供查詢方法（單例 `manager`） |

### `core.py` — 其他關鍵模組

| 模組 / 函式 | 職責 |
|------|------|
| `GAME_META` | 各遊戲的代碼、背景圖、故事圖、首頁文案（原本寫死在前端的三張表） |
| `SECURITY_HEADERS` / `apply_security_headers()` | CSP 等安全標頭 |
| `init_db()` / `load_view_counts()` / `record_view()` | Neon DB 讀寫 |
| `check_view_allowed()` | IP 限流 + 同角色冷卻 |
| `_build_search_index()` / `search_all()` | 後端加權評分搜索（含簡轉繁、拼音、`-` 排除、分組、高亮、建議） |
| `_build_mm_index()` / `matchmaker()` | 後端命運邂逅評分（身高 20 / 體型 30 / 年齡 25 / 性格 15） |
| `handle_*()` | 給 `app.py` 呼叫的薄入口函式，回傳 `(data, status)` 二元組 |

### `app.py` — 路由層

```python
@app.route('/api/search')
def api_search():
    return jsonify(handle_search(request.args.to_dict()))
```

所有業務邏輯都在 `core.py`，`app.py` 只負責把 `request` 轉成 `dict` 丟進去、把結果 `jsonify` 出來。

---

## 🌐 部署

本項目已部署於 Render 免費方案（見頁首徽章連結）。

### 部署步驟

#### 1. `requirements.txt`

```
Flask==3.0.0
psycopg2-binary
gunicorn
```

#### 2. `Procfile`

```
web: python app.py
```

#### 3. 環境變數

在 Render Dashboard → Environment 加入：

```
DATABASE_URL = postgresql://xxx@xxx.neon.tech/neondb?sslmode=require
```

#### 4. 部署到 Render

- 連接 GitHub 倉庫
- 選擇 **Web Service**
- Build Command：`pip install -r requirements.txt`
- Start Command：`python app.py`

---

## 🎮 隱藏彩蛋

玩家可以試試這些：

| 彩蛋 | 觸發方式 |
|------|----------|
| 🎮 **Konami 密碼** | 鍵盤輸入 `↑ ↑ ↓ ↓ ← → ← → B A` |
| ⭐ **Ciallo** | 搜尋框輸入 `ciallo` |
| 🍊 **點標題 10 次** | 連續點頂部標題 10 下 |
| 💖 **雙擊頭像** | 雙擊角色頭像或立繪 |
| 🤔 **切換遊戲 5 次** | 4 秒內切換 5 個遊戲 |
| 🧙 **蘿莉 + 30+** | 命運邂逅同時選「蘿莉」與「30+」 |
| 🚀 **連點回到頂部** | 3 秒內點 5 下 |
| 🍊 **搜尋柚子** | 搜尋框輸入 `柚子` / `yuzu` / `yuzusoft` |

---

## ❓ 常見問題

### Q：修改 `data.py` 或 `core.py` 後前端沒反應？

`CharacterManager` 在程式啟動時一次性載入數據到記憶體，`GAME_META`、搜索索引 `_search_index`、命運邂逅索引 `_mm_index` 也都在啟動時建好。修改 `data.py` 或 `core.py` 後需**重啟 Flask 伺服器**才會生效。

### Q：搜尋不到簡體輸入的關鍵字？

現在簡轉繁在**後端** `core.py` 的 `SIMP_TO_TRAD` 表處理，前端送什麼進去都會自動轉成繁體匹配。

### Q：瀏覽量沒有寫入資料庫？

1. 檢查 `DATABASE_URL` 是否設定正確（需含 `?sslmode=require`）
2. 訪問 `/health` 端點確認 `using_db: true`
3. 若在 10 分鐘內重複瀏覽同一角色，會被限流（正常行為）

### Q：如何新增一款遊戲？

1. 在 `data.py` 的 `GAME_DATA` 加入新遊戲的 `characters` 和 `guides`
2. 在 `core.py` 的 `GAME_CODES` 和 `GAME_META` 加入對應代碼、背景圖、故事圖、首頁文案
3. 在 `index.html` 的 `#gameList` 加入選項
4. 準備對應圖片（`bg-*.jpg`、`story-*.jpg`、`char-*-*.png`、`thumb-*-*.png`）
5. 重啟伺服器

> 不需要動 `script.js`——所有遊戲元數據都從 `/api/meta` 拉取。

### Q：為什麼 `script.js` 裡找不到 `GAME_CODES` / `SIMP_TO_TRAD` / 搜索演算法了？

這些都搬到 `core.py` 後端了。前端在啟動時會先 `fetch('/api/meta')`，把 `GAME_CODES`、`DEFAULT_INFO`、`DEFAULT_BG` 掛到 `window` 上，所以舊的寫法仍能用；搜索和命運邂逅則改成直接 `fetch('/api/search')` 和 `fetch('/api/matchmaker')`，計算全在後端跑。

---

## ⚖️ 版權聲明

1. 本項目涉及的所有遊戲名稱、角色人設、原畫插圖及相關 IP 資產**版權均歸 YUZUSOFT 官方所有**。
2. 本站點收錄之文字攻略、劇情梗概及資料均由粉絲愛好者整理，**僅供個人學習與交流使用**。
3. **嚴禁將本項目及其衍生代碼用於任何形式的商業盈利行為**。

---

## 🙏 致謝

### 版權與數據

- [YUZUSOFT 官方網站](https://yuzusoft.jp/)
- 所有支持柚子社作品的玩家

### 開源代碼

本項目部分功能參考或使用了以下開源項目，謹此致謝：

- **[仝娘之家 · 通用業務核心庫（ai-musume / core.py）](https://github.com/whaylu/ai-musume)**
  - 作者：whaylu
  - 授權：MIT License
  - 使用部分：搜尋子系統（加權評分演算法、`-` 排除語法、同義詞展開、關鍵字高亮、搜尋歷史），已改寫移植至 `core.py`

> 該項目的完整授權條款請參閱其倉庫中的 LICENSE 文件。

---

## 📄 授權

本項目**代碼部分**採用 [MIT License](LICENSE) 授權。

> ⚠️ **注意**：授權僅適用於**代碼本身**，不包含任何遊戲素材、角色立繪、原畫、音樂等版權內容。這些內容的版權歸 YUZUSOFT 所有。

---

<p align="center">
  <strong>🍊 Made with Love by Yuzusoft Fans 🍊</strong>
</p>
