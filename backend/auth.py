# 文件：backend/auth.py
import re
from functools import wraps
from time import time
from collections import defaultdict

from flask import session, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash

from .db import db_pool

# 登录失败限流器 (IP: [timestamps])
_login_attempts = defaultdict(list)
MAX_LOGIN_FAILS_PER_MIN = 5


def require_login(f):
    """装饰器：必须登录才能访问的 API"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"ok": False, "error": "未登入"}), 401
        return f(*args, **kwargs)
    return decorated_function


def register_user(username, password):
    if not db_pool:
        return {"ok": False, "error": "資料庫未連線"}, 500

    username = username.strip()
    # 校验用户名：1-20 字元，允许中文/英文/数字/下划线
    if not re.match(r'^[\w\u4e00-\u9fa5]{1,20}$', username):
        return {"ok": False, "error": "用戶名需為 1-20 字，僅限中英數及下劃線"}, 400

    if len(password) < 6 or len(password) > 64:
        return {"ok": False, "error": "密碼長度需為 6-64 位"}, 400

    username_lower = username.lower()

    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # 查重
        cur.execute("SELECT id FROM users WHERE username_lower = %s", (username_lower,))
        if cur.fetchone():
            cur.close()
            db_pool.putconn(conn)
            return {"ok": False, "error": "用戶名已存在"}, 400

        # 插入 users
        pwd_hash = generate_password_hash(password)
        cur.execute("""
            INSERT INTO users (username, username_lower, password_hash)
            VALUES (%s, %s, %s) RETURNING id
        """, (username, username_lower, pwd_hash))
        user_id = cur.fetchone()[0]

        # 插入 player_data 默认值
        cur.execute("INSERT INTO player_data (user_id) VALUES (%s)", (user_id,))
        
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        
        return {"ok": True, "user_id": user_id, "username": username}, 200
    except Exception as e:
        print("註冊失敗:", e)
        return {"ok": False, "error": "伺服器內部錯誤"}, 500


def login_user(username, password, ip):
    if not db_pool:
        return {"ok": False, "error": "資料庫未連線"}, 500

    # 检查限流
    now = time()
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < 60]
    if len(_login_attempts[ip]) >= MAX_LOGIN_FAILS_PER_MIN:
        return {"ok": False, "error": "嘗試次數過多，請稍後再試"}, 429

    username_lower = username.strip().lower()

    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, username, password_hash FROM users 
            WHERE username_lower = %s
        """, (username_lower,))
        row = cur.fetchone()

        if not row or not check_password_hash(row[2], password):
            cur.close()
            db_pool.putconn(conn)
            _login_attempts[ip].append(now)
            return {"ok": False, "error": "用戶名或密碼錯誤"}, 401

        user_id, real_username = row[0], row[1]

        # 更新最后登录时间
        cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user_id,))
        conn.commit()
        cur.close()
        db_pool.putconn(conn)

        # 记录 Session
        session.permanent = True
        session['user_id'] = user_id
        session['username'] = real_username

        return {"ok": True, "user_id": user_id}, 200
    except Exception as e:
        print("登入失敗:", e)
        return {"ok": False, "error": "伺服器內部錯誤"}, 500


def get_player_data(user_id):
    if not db_pool:
        return None
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("""
            SELECT coins, pity, wishlist, cards, stats, rewards 
            FROM player_data WHERE user_id = %s
        """, (user_id,))
        row = cur.fetchone()
        cur.close()
        db_pool.putconn(conn)

        if row:
            return {
                "coins": row[0],
                "pity": row[1],
                "wishlist": row[2],
                "cards": row[3],
                "stats": row[4],
                "rewards": row[5]
            }
        return None
    except Exception as e:
        print("讀取玩家數據失敗:", e)
        return None