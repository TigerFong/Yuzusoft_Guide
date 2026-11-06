# 文件：app.py
import os
import datetime
from dotenv import load_dotenv
load_dotenv()
import datetime
from flask import Flask, jsonify, render_template, request, session

from backend.core import (
    apply_security_headers, list_all_characters, list_all_guides,
    list_games, list_game_characters, list_game_guides, get_meta,
    get_ranking, get_health_info, handle_character, handle_guide,
    handle_view, handle_search, handle_matchmaker,
)
from backend.auth import (
    require_login, register_user, login_user, get_player_data
)
# 新增引入 game_core
from backend.game_core import (
    get_pool_info, update_wishlist, draw_cards, get_awaken_info, do_awaken,
    start_battle, battle_action, battle_end_turn, claim_battle_reward,
)

app = Flask(__name__)

# =========================================================
# Session / Secret Key 配置
# =========================================================
app.secret_key = os.environ.get('SECRET_KEY')
if not app.secret_key:
    print("⚠️ 警告：未設定 SECRET_KEY，使用本地隨機 Key (重啟後 Session 失效)")
    app.secret_key = os.urandom(24)

app.permanent_session_lifetime = datetime.timedelta(days=365)


@app.after_request
def _security_headers(response):
    return apply_security_headers(response)

# =========================================================
# 新增：Gacha API
# =========================================================
@app.route('/api/gacha/pool', methods=['GET'])
@require_login
def api_gacha_pool():
    res, status = get_pool_info(session['user_id'])
    return jsonify(res), status

@app.route('/api/gacha/draw', methods=['POST'])
@require_login
def api_gacha_draw():
    data = request.json or {}
    count = data.get('count', 1)
    res, status = draw_cards(session['user_id'], count)
    return jsonify(res), status

@app.route('/api/gacha/wishlist', methods=['POST'])
@require_login
def api_gacha_wishlist():
    data = request.json or {}
    wishlist = data.get('wishlist', [])
    res, status = update_wishlist(session['user_id'], wishlist)
    return jsonify(res), status

@app.route('/battle-test')
def battle_test():
    return render_template('battle-test.html')


# =========================================================
# 頁面路由
# =========================================================
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/game')
def game_page():
    return render_template('game.html')


# =========================================================
# API：Auth
# =========================================================
@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.json or {}
    username = data.get('username', '')
    password = data.get('password', '')
    
    res, status = register_user(username, password)
    if status == 200:
        session.permanent = True
        session['user_id'] = res['user_id']
        session['username'] = res['username']
    return jsonify(res), status


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    username = data.get('username', '')
    password = data.get('password', '')
    
    ip = request.headers.get('X-Forwarded-For', request.remote_addr) or 'unknown'
    res, status = login_user(username, password, ip)
    return jsonify(res), status


@app.route('/api/auth/logout', methods=['POST'])
@require_login
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.route('/api/auth/me', methods=['GET'])
def api_me():
    if 'user_id' not in session:
        return jsonify({"logged_in": False}), 401
    
    user_id = session['user_id']
    player_data = get_player_data(user_id)
    if not player_data:
        session.clear()
        return jsonify({"logged_in": False}), 401
        
    return jsonify({
        "logged_in": True,
        "user_id": user_id,
        "username": session.get('username'),
        "player": player_data
    })


# =========================================================
# API：角色
# =========================================================
@app.route('/api/characters')
def api_all_characters():
    return jsonify(list_all_characters())


@app.route('/api/characters/<path:name>')
def api_character(name):
    data, status = handle_character(name)
    return jsonify(data), status


# =========================================================
# API：攻略
# =========================================================
@app.route('/api/guides')
def api_all_guides():
    return jsonify(list_all_guides())


@app.route('/api/guides/<path:name>')
def api_guide(name):
    data, status = handle_guide(name)
    return jsonify(data), status


# =========================================================
# API：瀏覽量
# =========================================================
@app.route('/api/view/<path:name>', methods=['POST'])
def api_view(name):
    data, status = handle_view(
        name,
        xff=request.headers.get('X-Forwarded-For'),
        remote_addr=request.remote_addr,
    )
    return jsonify(data), status


@app.route('/api/ranking')
def api_ranking():
    return jsonify(get_ranking(5))


# =========================================================
# API：遊戲分組
# =========================================================
@app.route('/api/games')
def api_games():
    return jsonify(list_games())


@app.route('/api/games/<path:game>/characters')
def api_game_characters(game):
    return jsonify(list_game_characters(game))


@app.route('/api/games/<path:game>/guides')
def api_game_guides(game):
    return jsonify(list_game_guides(game))


# =========================================================
# API：元數據 / 搜索 / 命運邂逅
# =========================================================
@app.route('/api/meta')
def api_meta():
    return jsonify(get_meta())


@app.route('/api/search')
def api_search():
    return jsonify(handle_search(request.args.to_dict()))


@app.route('/api/matchmaker')
def api_matchmaker():
    return jsonify(handle_matchmaker(request.args.to_dict()))


# =========================================================
# 健康檢查
# =========================================================
@app.route('/health')
def health():
    return jsonify(get_health_info())

@app.route('/api/awaken/<path:character>', methods=['GET'])
@require_login
def api_awaken_info(character):
    res, status = get_awaken_info(session['user_id'], character)
    return jsonify(res), status

@app.route('/api/awaken/<path:character>', methods=['POST'])
@require_login
def api_awaken_do(character):
    res, status = do_awaken(session['user_id'], character)
    return jsonify(res), status

# =========================================================
# Battle API
# =========================================================
@app.route('/api/battle/<stage_id>', methods=['GET'])
@require_login
def api_battle_start(stage_id):
    res, status = start_battle(session['user_id'], stage_id)
    return jsonify(res), status


@app.route('/api/battle/action', methods=['POST'])
@require_login
def api_battle_action():
    data = request.json or {}
    res, status = battle_action(
        session['user_id'],
        data.get('card_index', 0),
        data.get('target_index'),
    )
    return jsonify(res), status


@app.route('/api/battle/end-turn', methods=['POST'])
@require_login
def api_battle_end_turn():
    res, status = battle_end_turn(session['user_id'])
    return jsonify(res), status


@app.route('/api/battle/claim-reward', methods=['POST'])
@require_login
def api_battle_claim_reward():
    res, status = claim_battle_reward(session['user_id'])
    return jsonify(res), status


# =========================================================
# 啟動
# =========================================================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)