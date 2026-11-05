# 文件：backend/db.py
import os
import json

DATABASE_URL = os.environ.get("DATABASE_URL")
db_pool = None

if DATABASE_URL:
    try:
        import psycopg2
        from psycopg2 import pool
        db_pool = psycopg2.pool.SimpleConnectionPool(1, 10, DATABASE_URL)
        print("✅ Neon 雲端資料庫連線池建立成功")
    except Exception as e:
        print("❌ 資料庫連線池建立失敗:", e)
else:
    print("⚠️ 未設定 DATABASE_URL，將使用本地記憶體資料庫（重啟後資料消失）")

class MemoryDB:
    def __init__(self):
        self.users = {}
        self.player_data = {}
        self.next_id = 1

memory_db = MemoryDB()

def init_db():
    if not db_pool:
        return
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # 1. 建立 users 表
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
        
        # 2. 建立 player_data 表
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
        
        # 3. 建立 view_counts 表
        cur.execute("""
            CREATE TABLE IF NOT EXISTS view_counts (
                character_name TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0
            )
        """)
        
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        print("✅ 所有資料表已就緒")
    except Exception as e:
        print("❌ 初始化資料表失敗:", e)


def load_view_counts():
    if not db_pool:
        if os.path.exists('view_counts.json'):
            try:
                with open('view_counts.json', 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT character_name, count FROM view_counts")
        data = {row[0]: row[1] for row in cur.fetchall()}
        cur.close()
        db_pool.putconn(conn)
        return data
    except Exception:
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
    except Exception:
        pass