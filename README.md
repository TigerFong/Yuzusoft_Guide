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
| 🔍 **全站搜尋** | 支援搜尋角色名、遊戲名、身份、性格、喜好、服裝等全部欄位 |
| 🎯 **命運邂逅** | 依身高、體型、年齡、性格篩選，找出符合喜好的角色，並可隨機抽選 |
| ⭐ **我的最愛** | 收藏喜歡的角色，獨立頁面集中管理 |
| 📊 **攻略進度** | 勾選已完成選項，進度條視覺化，資料存 localStorage |
| 🏆 **人氣排行** | 瀏覽量前五名角色排行 |
| 🎬 **視覺特效** | 立繪切換、頁面淡入、光暈脈動、全通路線慶祝等 |
| 🎮 **隱藏彩蛋** | Konami 密碼、Ciallo、雙擊頭像等 8 個彩蛋 |

---

## 🛠 技術架構

本項目採用 **API 驅動的單體應用風格**，前後端職責分離。

```
┌─────────────────────────────────────────────┐
│  瀏覽器（HTML / CSS / JS）                    │
│  ┌────────────┐  ┌────────────┐             │
│  │ index.html │  │ script.js  │             │
│  └────────────┘  └──────┬─────┘             │
│                         │ fetch()            │
└─────────────────────────┼───────────────────┘
                          │
                          │ JSON
                          ▼
┌─────────────────────────────────────────────┐
│  Flask 後端                                  │
│  ┌────────────┐  ┌────────────┐             │
│  │  app.py    │──│  data.py   │             │
│  │  (API)     │  │  (數據層)  │             │
│  └────────────┘  └────────────┘             │
│         │                                    │
│         │ psycopg2                           │
│         ▼                                    │
│  ┌────────────┐                              │
│  │  Neon DB   │  （雲端 PostgreSQL）         │
│  └────────────┘                              │
└─────────────────────────────────────────────┘
```

### 技術棧

| 層 | 技術 |
|----|------|
| 後端 | Python 3.8+ / Flask 3.x |
| 前端 | 原生 HTML5 / CSS3 / JavaScript（無框架） |
| 數據 | `data.py` 中的 `GAME_DATA` 字典，記憶體載入 |
| 存儲 | `localStorage`（收藏、攻略進度等）+ Neon PostgreSQL（瀏覽量） |
| 部署 | Render（Web Service） |

### 核心優勢

- **數據與頁面解耦**：修改角色或新增遊戲只需維護 `data.py`，前端無須重構。
- **輕量零依賴**：前端無需 npm 或建構工具，直接瀏覽器運行。
- **響應式設計**：桌面、平板、手機皆自適應。
- **安全防護**：CSP 標頭 + 輸入轉義 + IP 限流。

---

## 📁 項目結構

```
Yuzusoft_Guide/
├── app.py              # Flask 後端主程式（API 接口）
├── data.py             # 數據層（角色、遊戲、攻略）
├── requirements.txt    # Python 依賴
├── Procfile            # 部署用進程文件
├── index.html          # 首頁
├── script.js           # 前端邏輯（API 請求、DOM 渲染）
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
| `/api/games` | GET | 取得全部遊戲列表 |
| `/api/games/<game>/characters` | GET | 取得某遊戲的全部角色名 |
| `/api/games/<game>/guides` | GET | 取得某遊戲的全部攻略角色 |
| `/api/characters` | GET | 取得全部角色名 |
| `/api/characters/<name>` | GET | 取得單一角色的詳細資料 |
| `/api/guides` | GET | 取得全部攻略角色 |
| `/api/guides/<name>` | GET | 取得單一角色的攻略選項 |
| `/api/view/<name>` | POST | 記錄一次瀏覽 |
| `/api/ranking` | GET | 取得瀏覽量前 5 名排行 |
| `/health` | GET | 健康檢查（DB 連線、瀏覽量總計） |

### 範例

```bash
curl http://localhost:5000/api/games/千戀＊萬花/characters
```

```json
["朝武芳乃", "常陸茉子", "叢雨", "蕾娜·列支敦瑙爾", "鞍馬小春", "馬庭蘆花"]
```

```bash
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

---

## 📊 數據結構

`data.py` 中的 `GAME_DATA` 是頂層大字典：

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

### 三個核心類別

| 類別 | 職責 |
|------|------|
| `Character` | 封裝單一角色資料 |
| `CharacterGuide` | 封裝單一角色攻略選項 |
| `CharacterManager` | 啟動時載入 `GAME_DATA`，提供查詢方法 |

---

## 🌐 部署

本項目已部署於 Render 免費方案（見頁首徽章連結）。

### 部署步驟

#### 1. 建立 `requirements.txt`

```
Flask==3.0.0
psycopg2-binary
gunicorn
```

#### 2. 建立 `Procfile`

```
web: python app.py
```

#### 3. 設定環境變數

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
| 🚀 **連點回到頂部** | 3 秒內點 5 下 |
| 🍊 **搜尋柚子** | 搜尋框輸入 `柚子` / `yuzu` / `yuzusoft` |

---

## ❓ 常見問題

### Q：修改 `data.py` 後前端沒反應？

`CharacterManager` 在程式啟動時一次性載入數據到記憶體。修改 `data.py` 後需**重啟 Flask 伺服器**才會生效。

### Q：搜尋不到簡體輸入的關鍵字？

`script.js` 已加入簡轉繁映射表，輸入簡體會自動轉成繁體匹配。

### Q：瀏覽量沒有寫入資料庫？

1. 檢查 `DATABASE_URL` 是否設定正確（需含 `?sslmode=require`）
2. 訪問 `/health` 端點確認 `using_db: true`
3. 若在 10 分鐘內重複瀏覽同一角色，會被限流（正常行為）

### Q：如何新增一款遊戲？

1. 在 `data.py` 的 `GAME_DATA` 加入新遊戲的 `characters` 和 `guides`
2. 在 `script.js` 的 `GAME_BACKGROUNDS`、`GAME_CODES`、`GAME_STORIES`、`GAME_INFO` 加入對應資料
3. 在 `index.html` 的 `#gameList` 加入選項
4. 準備對應圖片（`bg-*.jpg`、`story-*.jpg`、`char-*-*.png`、`thumb-*-*.png`）

---

## ⚖️ 版權聲明

1. 本項目涉及的所有遊戲名稱、角色人設、原畫插圖及相關 IP 資產**版權均歸 YUZUSOFT 官方所有**。
2. 本站點收錄之文字攻略、劇情梗概及資料均由粉絲愛好者整理，**僅供個人學習與交流使用**。
3. **嚴禁將本項目及其衍生代碼用於任何形式的商業盈利行為**。

---

## 🙏 致謝

- [YUZUSOFT 官方網站](https://yuzusoft.jp/)
- 所有支持柚子社作品的玩家

---

## 📄 授權

本項目**代碼部分**採用 [MIT License](LICENSE) 授權。

> ⚠️ **注意**：授權僅適用於**代碼本身**，不包含任何遊戲素材、角色立繪、原畫、音樂等版權內容。這些內容的版權歸 YUZUSOFT 所有。

---

<p align="center">
  <strong>🍊 Made with Love by Yuzusoft Fans 🍊</strong>
</p>
