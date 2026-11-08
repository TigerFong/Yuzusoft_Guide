# 文件：app.py
import os
import datetime
from dotenv import load_dotenv
load_dotenv()
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
from backend.game_core import (
    get_pool_info, update_wishlist, draw_cards, get_awaken_info, do_awaken,
    start_battle, battle_action, battle_end_turn, claim_battle_reward,
    get_battle_party_info, get_battle_progress, upgrade_character, set_awaken_level,
    toggle_stage_unlock, update_daily_task, get_daily_status, claim_daily_reward,
    get_weekly_status, claim_weekly_reward,get_character_skills,
)
from werkzeug.security import generate_password_hash, check_password_hash
from backend.db import db_pool, memory_db

app = Flask(__name__)

app.secret_key = os.environ.get('SECRET_KEY')
if not app.secret_key:
    app.secret_key = os.urandom(24)
app.permanent_session_lifetime = datetime.timedelta(days=365)

@app.after_request
def _security_headers(response):
    return apply_security_headers(response)

# =========================================================
# 頁面路由
# =========================================================
@app.route('/')
def index(): return render_template('index.html')

@app.route('/game')
def game_page(): return render_template('game.html')

# =========================================================
# Auth
# =========================================================
@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.json or {}
    res, status = register_user(data.get('username', ''), data.get('password', ''))
    if status == 200:
        session.permanent = True
        session['user_id'] = res['user_id']
        session['username'] = res['username']
    return jsonify(res), status

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    ip = request.headers.get('X-Forwarded-For', request.remote_addr) or 'unknown'
    res, status = login_user(data.get('username', ''), data.get('password', ''), ip)
    return jsonify(res), status

@app.route('/api/auth/logout', methods=['POST'])
@require_login
def api_logout():
    session.clear()
    return jsonify({"ok": True})

@app.route('/api/auth/me', methods=['GET'])
def api_me():
    if 'user_id' not in session: return jsonify({"logged_in": False}), 401
    user_id = session['user_id']
    player_data = get_player_data(user_id)
    if not player_data:
        session.clear()
        return jsonify({"logged_in": False}), 401
    return jsonify({"logged_in": True, "user_id": user_id, "username": session.get('username'), "player": player_data})

# =========================================================
# 帳號安全：修改密碼 & 刪除帳號
# =========================================================
@app.route('/api/auth/change-password', methods=['POST'])
@require_login
def api_change_password():
    data = request.json or {}
    old_pw = data.get('old_password', '')
    new_pw = data.get('new_password', '')
    
    if len(new_pw) < 6:
        return jsonify({"ok": False, "error": "新密碼長度至少為 6 位"}), 400
        
    user_id = session['user_id']
    username = session.get('username', '')
    user_key = username.lower()
    
    if not db_pool:
        user = memory_db.users.get(user_key)
        if not user:
            return jsonify({"ok": False, "error": "用戶不存在"}), 404
        if not check_password_hash(user['password_hash'], old_pw):
            return jsonify({"ok": False, "error": "舊密碼錯誤"}), 400
        user['password_hash'] = generate_password_hash(new_pw)
        return jsonify({"ok": True})
    else:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); db_pool.putconn(conn)
                return jsonify({"ok": False, "error": "用戶不存在"}), 404
                
            if not check_password_hash(row[0], old_pw):
                cur.close(); db_pool.putconn(conn)
                return jsonify({"ok": False, "error": "舊密碼錯誤"}), 400
                
            new_hash = generate_password_hash(new_pw)
            cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
            conn.commit()
            cur.close(); db_pool.putconn(conn)
            return jsonify({"ok": True})
        except Exception as e:
            print("修改密碼失敗:", e)
            return jsonify({"ok": False, "error": "伺服器內部錯誤"}), 500

@app.route('/api/auth/delete-account', methods=['POST'])
@require_login
def api_delete_account():
    data = request.json or {}
    password = data.get('password', '')
    
    user_id = session['user_id']
    username = session.get('username', '')
    user_key = username.lower()
    
    if not db_pool:
        user = memory_db.users.get(user_key)
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({"ok": False, "error": "密碼錯誤"}), 400
            
        del memory_db.users[user_key]
        if user_id in memory_db.player_data:
            del memory_db.player_data[user_id]
        session.clear()
        return jsonify({"ok": True})
    else:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if not row or not check_password_hash(row[0], password):
                cur.close(); db_pool.putconn(conn)
                return jsonify({"ok": False, "error": "密碼錯誤"}), 400
                
            cur.execute("DELETE FROM player_data WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
            cur.close(); db_pool.putconn(conn)
            session.clear()
            return jsonify({"ok": True})
        except Exception as e:
            print("刪除帳號失敗:", e)
            return jsonify({"ok": False, "error": "伺服器內部錯誤"}), 500

# =========================================================
# 每日任務
# =========================================================
@app.route('/api/daily', methods=['GET'])
@require_login
def api_daily(): return jsonify(get_daily_status(session['user_id'])[0])

@app.route('/api/daily/claim', methods=['POST'])
@require_login
def api_daily_claim():
    res, status = claim_daily_reward(session['user_id'], (request.json or {}).get('tier'))
    return jsonify(res), status

@app.route('/api/daily/view-roster', methods=['POST'])
@require_login
def api_daily_view_roster():
    update_daily_task(session['user_id'], "view_roster")
    return jsonify({"ok": True})

@app.route('/api/daily/change-party', methods=['POST'])
@require_login
def api_daily_change_party():
    update_daily_task(session['user_id'], "change_party")
    return jsonify({"ok": True})

# =========================================================
# 週常
# =========================================================
@app.route('/api/weekly', methods=['GET'])
@require_login
def api_weekly():
    return jsonify(get_weekly_status(session['user_id'])[0])

@app.route('/api/weekly/claim', methods=['POST'])
@require_login
def api_weekly_claim():
    data = request.json or {}
    res, status = claim_weekly_reward(
        session['user_id'], data.get('stage_id'), data.get('grade')
    )
    return jsonify(res), status

# =========================================================
# 抽卡與覺醒
# =========================================================
@app.route('/api/gacha/pool', methods=['GET'])
@require_login
def api_gacha_pool(): return jsonify(get_pool_info(session['user_id'])[0])

@app.route('/api/gacha/draw', methods=['POST'])
@require_login
def api_gacha_draw():
    res, status = draw_cards(session['user_id'], (request.json or {}).get('count', 1))
    return jsonify(res), status

@app.route('/api/gacha/wishlist', methods=['POST'])
@require_login
def api_gacha_wishlist():
    res, status = update_wishlist(session['user_id'], (request.json or {}).get('wishlist', []))
    return jsonify(res), status

@app.route('/api/awaken/<path:character>', methods=['GET'])
@require_login
def api_awaken_info(character): return jsonify(get_awaken_info(session['user_id'], character)[0])

@app.route('/api/awaken/<path:character>', methods=['POST'])
@require_login
def api_awaken_do(character): return jsonify(do_awaken(session['user_id'], character)[0])

@app.route('/api/upgrade', methods=['POST'])
@require_login
def api_upgrade():
    data = request.json or {}
    res, status = upgrade_character(session['user_id'], data.get('name'), data.get('target_level'))
    return jsonify(res), status
@app.route('/api/character/<path:character>/skills', methods=['GET'])
def api_character_skills(character):
    res, status = get_character_skills(character)
    return jsonify(res), status

# =========================================================
# 戰鬥 API
# =========================================================
@app.route('/api/battle/party', methods=['GET'])
@require_login
def api_battle_party(): return jsonify(get_battle_party_info(session['user_id'])[0])

@app.route('/api/battle/progress', methods=['GET'])
@require_login
def api_battle_progress(): return jsonify(get_battle_progress(session['user_id'])[0])

@app.route('/api/battle/start', methods=['POST'])
@require_login
def api_battle_start_new():
    data = request.json or {}
    res, status = start_battle(session['user_id'], data.get('stage_id'), data.get('party', []))
    return jsonify(res), status

@app.route('/api/battle/action', methods=['POST'])
@require_login
def api_battle_action():
    data = request.json or {}
    res, status = battle_action(session['user_id'], data.get('card_index', 0), data.get('target_index'))

    if res.get("ok") and "events" in res:
        has_crit = any(ev.get("daily_crit") for ev in res["events"])
        has_ult = any(ev.get("daily_ult") for ev in res["events"])
        sp_spent = sum(ev.get("daily_sp", 0) for ev in res["events"])

        if has_crit: update_daily_task(session['user_id'], "use_counter")
        if has_ult: update_daily_task(session['user_id'], "use_ultimate")
        if sp_spent > 0: update_daily_task(session['user_id'], "spend_sp", sp_spent)

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
# 測試員 API
# =========================================================
@app.route('/api/tester/stage', methods=['POST'])
@require_login
def api_tester_stage():
    data = request.json or {}
    res, status = toggle_stage_unlock(session['user_id'], data.get('stage_id'), data.get('action'))
    return jsonify(res), status

@app.route('/api/tester/awaken', methods=['POST'])
@require_login
def api_tester_awaken():
    data = request.json or {}
    res, status = set_awaken_level(session['user_id'], data.get('name'), data.get('target_lvl'))
    return jsonify(res), status

# =========================================================
# 攻略站原有 API
# =========================================================
@app.route('/api/characters')
def api_all_characters(): return jsonify(list_all_characters())

@app.route('/api/characters/<path:name>')
def api_character(name): return jsonify(handle_character(name)[0])

@app.route('/api/guides')
def api_all_guides(): return jsonify(list_all_guides())

@app.route('/api/guides/<path:name>')
def api_guide(name): return jsonify(handle_guide(name)[0])

@app.route('/api/view/<path:name>', methods=['POST'])
def api_view(name): return jsonify(handle_view(name, request.headers.get('X-Forwarded-For'), request.remote_addr)[0])

@app.route('/api/ranking')
def api_ranking(): return jsonify(get_ranking(5))

@app.route('/api/games')
def api_games(): return jsonify(list_games())

@app.route('/api/games/<path:game>/characters')
def api_game_characters(game): return jsonify(list_game_characters(game))

@app.route('/api/games/<path:game>/guides')
def api_game_guides(game): return jsonify(list_game_guides(game))

@app.route('/api/meta')
def api_meta(): return jsonify(get_meta())

@app.route('/api/search')
def api_search(): return jsonify(handle_search(request.args.to_dict()))

@app.route('/api/matchmaker')
def api_matchmaker(): return jsonify(handle_matchmaker(request.args.to_dict()))

@app.route('/health')
def health(): return jsonify(get_health_info())

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    # 加入 threaded=True 支援多線程處理，避免排隊卡頓
    app.run(host='0.0.0.0', port=port, threaded=True)