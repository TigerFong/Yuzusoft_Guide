# app.py
import os
import json
from time import time
from collections import defaultdict

import psycopg2
from psycopg2 import pool
from flask import Flask, jsonify, send_from_directory, request

from data import CharacterManager


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 遊戲代碼映射（用於圖片命名）
GAME_CODES = {
    '千戀＊萬花': 'senren',
    '天使紛擾': 'tenshi',
    '星光咖啡館與死神之蝶': 'cafe',
    '魔女的夜宴': 'sabbat'
}

# ===== Neon 資料庫配置 =====
DATABASE_URL = os.environ.get("DATABASE_URL")

db_pool = None
if DATABASE_URL:
    try:
        db_pool = psycopg2.pool.SimpleConnectionPool(1, 10, DATABASE_URL)
        print("Neon 資料庫連線池建立成功")
    except Exception as e:
        print("資料庫連線池建立失敗:", e)
else:
    print("未設定 DATABASE_URL，將使用本地 view_counts.json（開發模式）")


# =========================================================
# 資料庫初始化與讀寫
# =========================================================
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
    """從資料庫載入所有瀏覽量；沒 DB 時 fallback 到本地 JSON"""
    if not db_pool:
        if os.path.exists('view_counts.json'):
            try:
                with open('view_counts.json', 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print("讀取本地 view_counts.json 失敗:", e)
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


# =========================================================
# 防刷：IP 限流 + 角色冷卻
# =========================================================
VIEW_COOLDOWN = 600         # 同一 IP 對同一角色，10 分鐘內只算一次
GLOBAL_LIMIT_PER_MIN = 30    # 同一 IP 每分鐘最多打 30 次 /api/view
CLEANUP_THRESHOLD = 5000     # 追蹤的 IP 數超過這個就觸發清理

_view_guard = {}                  # {ip: {name: timestamp}}
_ip_rate = defaultdict(list)      # {ip: [timestamps]}


def get_client_ip():
    """
    取得客戶端真實 IP。
    Render 走反向代理，X-Forwarded-For 會 append 真實 IP 到最後，
    因此取「最右邊」的值才不會被偽造（取最左邊客戶端可自行填）。
    """
    xff = request.headers.get('X-Forwarded-For')
    if xff:
        # 取最右邊那個（Render 代理附加的真實 IP）
        return xff.split(',')[-1].strip()
    return request.remote_addr or 'unknown'


def _cleanup_guard(now):
    """清理過期的 IP 記錄，避免記憶體無限增長"""
    cutoff = now - VIEW_COOLDOWN
    for k in list(_view_guard.keys()):
        _view_guard[k] = {n: t for n, t in _view_guard[k].items() if t > cutoff}
        if not _view_guard[k]:
            del _view_guard[k]

    for k in list(_ip_rate.keys()):
        _ip_rate[k] = [t for t in _ip_rate[k] if now - t < 60]
        if not _ip_rate[k]:
            del _ip_rate[k]


def check_view_allowed(ip, name):
    """
    回傳 (是否允許計數, 原因)
    只有全部檢查通過才會記帳（append timestamp）
    """
    now = time()

    # 1. 全域頻率限制（防腳本爆打）
    hits = _ip_rate[ip]
    hits[:] = [t for t in hits if now - t < 60]
    if len(hits) >= GLOBAL_LIMIT_PER_MIN:
        return False, 'rate_limit'

    # 2. 同 IP + 同角色冷卻
    per_char = _view_guard.setdefault(ip, {})
    if now - per_char.get(name, 0) < VIEW_COOLDOWN:
        return False, 'cooldown'

    # 3. 全部通過 → 記帳
    hits.append(now)
    per_char[name] = now

    # 4. 定期清理（門檻觸發，避免每次都掃）
    if len(_view_guard) > CLEANUP_THRESHOLD:
        _cleanup_guard(now)

    return True, 'ok'


# =========================================================
# Flask App
# =========================================================
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

# =========================================================
# 安全標頭（XSS / 點擊劫持 / MIME 混淆防護）
# =========================================================
@app.after_request
def add_security_headers(response):
    # CSP：只允許自家資源，禁止 inline script
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    # 禁止 MIME 猜測
    response.headers['X-Content-Type-Options'] = 'nosniff'
    # 禁止 iframe 嵌入（防點擊劫持）
    response.headers['X-Frame-Options'] = 'DENY'
    # Referrer 保護
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    # 禁止舊瀏覽器的 XSS 過濾器（它本身有漏洞）
    response.headers['X-XSS-Protection'] = '0'
    return response


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
    """記錄一次瀏覽（帶 IP 限流）"""
    if not manager.get_character(name):
        return jsonify({'ok': False, 'error': '角色不存在'}), 404

    ip = get_client_ip()
    allowed, reason = check_view_allowed(ip, name)

    if not allowed:
        # 被限流：不回錯誤碼（避免前端報錯），只是 counted=False
        return jsonify({'ok': True, 'counted': False, 'reason': reason})

    # === 通過限流，才真的 +1 ===
    view_counts[name] = view_counts.get(name, 0) + 1

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

    return jsonify({'ok': True, 'counted': True})


@app.route('/api/ranking')
def api_ranking():
    """返回瀏覽量排行（前 5）"""
    result = []

    all_names = manager.get_all_names()
    items = [(name, view_counts.get(name, 0)) for name in all_names]
    items.sort(key=lambda x: -x[1])
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


# ---------- 健康檢查（可選，方便驗證 Neon） ----------
@app.route('/health')
def health():
    info = {
        'database_url_set': bool(DATABASE_URL),
        'db_pool_available': db_pool is not None,
        'using_db': False,
        'tracked_ips': len(_view_guard),
        'db_check': None,
    }

    if db_pool:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*), COALESCE(SUM(count), 0) FROM view_counts")
            distinct_count, total = cur.fetchone()
            cur.close()
            db_pool.putconn(conn)
            info['using_db'] = True
            info['db_check'] = {
                'distinct_characters': distinct_count,
                'total_views': total,
            }
        except Exception as e:
            info['db_check'] = f'ERROR: {e}'

    return jsonify(info)


# =========================================================
# 初始化 & 啟動
# =========================================================
init_db()


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)