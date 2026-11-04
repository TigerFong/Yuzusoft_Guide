# 文件：backend/db.py
import os
import json
from psycopg2.extras import Json

import psycopg2
from psycopg2 import pool


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


def init_db():
    if not db_pool:
        print("未設定 DATABASE_URL，跳過資料庫初始化")
        return
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # 1. 原有瀏覽量表
        cur.execute("""
            CREATE TABLE IF NOT EXISTS view_counts (
                character_name TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0
            )
        """)
        
        # 2. 新增 users 表
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id             SERIAL PRIMARY KEY,
                username       TEXT NOT NULL,
                username_lower TEXT NOT NULL UNIQUE,
                password_hash  TEXT NOT NULL,
                created_at     TIMESTAMPTZ DEFAULT NOW(),
                last_login     TIMESTAMPTZ
            )
        """)
        
        # 3. 新增 player_data 表
        cur.execute("""
            CREATE TABLE IF NOT EXISTS player_data (
                user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                coins        INTEGER NOT NULL DEFAULT 670,
                pity         INTEGER NOT NULL DEFAULT 0,
                wishlist     JSONB   NOT NULL DEFAULT '[]',
                cards        JSONB   NOT NULL DEFAULT '{}',
                stats        JSONB   NOT NULL DEFAULT '{}',
                rewards      JSONB   NOT NULL DEFAULT '{}',
                updated_at   TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        print("資料表已就緒 (view_counts, users, player_data)")
    except Exception as e:
        print("初始化資料表失敗:", e)


def load_view_counts():
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


init_db()
view_counts = load_view_counts()


def record_view(name):
    view_counts[name] = view_counts.get(name, 0) + 1
    if not db_pool:
        return
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