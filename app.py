# app.py
import os
from flask import Flask, jsonify, send_from_directory
from data import CharacterManager
import json
import psycopg2
from psycopg2 import pool


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 游戏代码映射
GAME_CODES = {
    '千戀＊萬花': 'senren',
    '天使紛擾': 'tenshi',
    '星光咖啡館與死神之蝶': 'cafe',
    '魔女的夜宴': 'sabbat'
}

# ===== Neon 数据库配置 =====
DATABASE_URL = os.environ.get("DATABASE_URL")

db_pool = None
if DATABASE_URL:
    try:
        db_pool = psycopg2.pool.SimpleConnectionPool(1, 10, DATABASE_URL)
        print("Neon 資料庫連線池建立成功")
    except Exception as e:
        print("資料庫連線池建立失敗:", e)


def init_db():
    """初始化資料庫：建立存瀏覽量的表"""
    if not db_pool:
        print("未設定 DATABASE_URL，跳過資料庫初始化")
        return
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS view_counts (
                character_name TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        print("view_counts 表已就緒")
    except Exception as e:
        print("初始化資料表失敗:", e)


def load_view_counts():
    """從資料庫載入所有瀏覽量"""
    if not db_pool:
        # 沒設 DATABASE_URL → 用本地文件（開發用）
        if os.path.exists('view_counts.json'):
            try:
                with open('view_counts.json', 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT character_name, count FROM view_counts")
        data = {row[0]: row[1] for row in cur.fetchall()}
        cur.close()
        db_pool.putconn(conn)
        return data
    except Exception as e:
        print("讀取瀏覽量失敗:", e)
        return {}


def save_view_counts():
    """將記憶體中的瀏覽量全量同步到資料庫（備用，主要用增量更新）"""
    if not db_pool or not view_counts:
        return
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        for name, count in view_counts.items():
            cur.execute("""
                INSERT INTO view_counts (character_name, count)
                VALUES (%s, %s)
                ON CONFLICT (character_name)
                DO UPDATE SET count = EXCLUDED.count
            """, (name, count))
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
    except Exception as e:
        print("保存瀏覽量失敗:", e)


view_counts = load_view_counts()

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
manager = CharacterManager()


def _character_to_dict(char):
    return {
        'name': char.name,
        'age': char.age,
        'gender': char.gender,
        'height': char.height,
        'body_type': char.body_type,
        'personality': char.personality,
        'identity': char.identity,
        'likes': char.likes,
        'dislikes': char.dislikes,
        'clothes': char.clothes,
    }


# ---------- 頁面 ----------
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


# ---------- API：角色 ----------
@app.route('/api/characters')
def api_all_characters():
    return jsonify(manager.get_all_names())


@app.route('/api/characters/<path:name>')
def api_character(name):
    char = manager.get_character(name)
    if not char:
        return jsonify({'error': '角色不存在'}), 404
    return jsonify(_character_to_dict(char))


# ---------- API：攻略 ----------
@app.route('/api/guides')
def api_all_guides():
    return jsonify(list(manager.guides.keys()))


@app.route('/api/guides/<path:name>')
def api_guide(name):
    guide = manager.get_guide(name)
    if not guide:
        return jsonify({'error': '攻略不存在'}), 404
    return jsonify({
        'character_name': guide.character_name,
        'options': guide.get_all_options()
    })


# ---------- API：瀏覽量 ----------
@app.route('/api/view/<path:name>', methods=['POST'])
def api_view(name):
    """記錄一次瀏覽（直接更新資料庫）"""
    if manager.get_character(name):
        # 更新記憶體
        view_counts[name] = view_counts.get(name, 0) + 1

        # 增量更新資料庫（只更新這一條）
        if db_pool:
            try:
                conn = db_pool.getconn()
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO view_counts (character_name, count)
                    VALUES (%s, 1)
                    ON CONFLICT (character_name)
                    DO UPDATE SET count = view_counts.count + 1
                """, (name,))
                conn.commit()
                cur.close()
                db_pool.putconn(conn)
            except Exception as e:
                print("更新瀏覽量失敗:", e)

    return jsonify({'ok': True})


@app.route('/api/ranking')
def api_ranking():
    """返回瀏覽量排行（前 5）"""
    result = []

    # 遍歷所有角色（包括 0 次的）
    all_names = manager.get_all_names()
    items = [(name, view_counts.get(name, 0)) for name in all_names]

    # 按瀏覽量降序
    items.sort(key=lambda x: -x[1])

    # 只取前 5 名
    items = items[:5]

    for rank, (name, count) in enumerate(items, start=1):
        char = manager.get_character(name)
        if not char:
            continue

        game = manager.get_game_of_character(name) or ''
        chars_in_game = manager.get_characters_by_game(game) if game else []
        idx = chars_in_game.index(name) + 1 if name in chars_in_game else 0

        result.append({
            'rank': rank,
            'name': name,
            'game': game,
            'count': count,
            'code': GAME_CODES.get(game, 'game'),
            'index': idx,
        })

    return jsonify(result)


# ---------- API：遊戲分組 ----------
@app.route('/api/games')
def api_games():
    return jsonify(manager.get_games())


@app.route('/api/games/<path:game>/characters')
def api_game_characters(game):
    return jsonify(manager.get_characters_by_game(game))


@app.route('/api/games/<path:game>/guides')
def api_game_guides(game):
    return jsonify(manager.get_guides_by_game(game))


# 初始化資料庫
init_db()


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)