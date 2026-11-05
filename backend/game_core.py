# 文件：backend/game_core.py
import random
from .db import db_pool, memory_db
from .game_data import GAME_CHARACTERS, RARITY_WEIGHTS

try:
    from psycopg2.extras import Json
except ImportError:
    class Json:
        def __init__(self, obj): self.obj = obj

POOL_BY_RARITY = {"SSR": [], "SR": [], "R": []}
for name, data in GAME_CHARACTERS.items():
    POOL_BY_RARITY[data["rarity"]].append(name)

TESTER_COINS = 999999

# 文件：backend/game_core.py (追加在最後)

# 簡單的關卡配置
BATTLE_STAGES = {
    "senren-1": {
        "name": "千戀＊萬花 · 第一章",
        "enemies": [
            {"name": "心魔·叢雨", "hp": 500, "max_hp": 500, "mind": "陽", "code": "senren", "index": 3},
            {"name": "心魔·茉子", "hp": 800, "max_hp": 800, "mind": "戲", "code": "senren", "index": 2}
        ],
        "reward_coins": 80
    }
}

def start_battle(user_id, stage_id):
    if stage_id not in BATTLE_STAGES:
        return {"ok": False, "error": "關卡不存在"}, 404
        
    stage = BATTLE_STAGES[stage_id]
    
    # 獲取玩家擁有的角色作為可用卡牌來源
    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        owned_cards = pd["cards"] if pd else {}
    else:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT cards FROM player_data WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        db_pool.putconn(conn)
        owned_cards = row[0] if row else {}
        
    if not owned_cards:
        return {"ok": False, "error": "你沒有任何角色，無法戰鬥！"}, 400

    return {
        "ok": True,
        "stage_name": stage["name"],
        "enemies": stage["enemies"],
        "owned_cards": list(owned_cards.keys()), # 返回玩家擁有的角色名字列表
        "reward_coins": stage["reward_coins"]
    }, 200

def end_battle(user_id, stage_id, is_win):
    if not is_win:
        return {"ok": True, "msg": "戰鬥失敗，沒有獎勵"}, 200
        
    if stage_id not in BATTLE_STAGES:
        return {"ok": False, "error": "關卡不存在"}, 404
        
    reward = BATTLE_STAGES[stage_id]["reward_coins"]
    
    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        if pd:
            pd["coins"] += reward
        return {"ok": True, "reward": reward}, 200
        
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("UPDATE player_data SET coins = coins + %s WHERE user_id = %s", (reward, user_id))
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        return {"ok": True, "reward": reward}, 200
    except Exception as e:
        return {"ok": False, "error": "結算失敗"}, 500

def is_tester(user_id):
    """檢查是否為 tester 帳號"""
    if not db_pool:
        # 記憶體模式
        for u in memory_db.users.values():
            if u["id"] == user_id and u["username"].lower() == "tester":
                return True
        return False
    else:
        # 資料庫模式
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT username_lower FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            cur.close()
            db_pool.putconn(conn)
            return row and row[0] == "tester"
        except:
            return False


def get_pool_info(user_id):
    tester = is_tester(user_id)
    
    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        if not pd: return {"ok": False, "error": "玩家數據不存在"}, 404
        coins = TESTER_COINS if tester else pd["coins"]
        return {
            "ok": True, "coins": coins, "pity": pd["pity"], "wishlist": pd["wishlist"], "rates": RARITY_WEIGHTS
        }, 200
        
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT coins, pity, wishlist FROM player_data WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        db_pool.putconn(conn)
        if not row: return {"ok": False, "error": "玩家數據不存在"}, 404
        
        coins = TESTER_COINS if tester else row[0]
        return {"ok": True, "coins": coins, "pity": row[1], "wishlist": row[2], "rates": RARITY_WEIGHTS}, 200
    except Exception as e:
        return {"ok": False, "error": "伺服器內部錯誤"}, 500


def update_wishlist(user_id, new_wishlist):
    if not isinstance(new_wishlist, list) or len(new_wishlist) > 3:
        return {"ok": False, "error": "心願單最多只能放 3 個角色"}, 400
    for name in new_wishlist:
        if name not in GAME_CHARACTERS:
            return {"ok": False, "error": f"角色 {name} 不存在"}, 400

    if not db_pool:
        if user_id in memory_db.player_data:
            memory_db.player_data[user_id]["wishlist"] = new_wishlist
            return {"ok": True, "wishlist": new_wishlist}, 200
        return {"ok": False, "error": "玩家不存在"}, 404

    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("UPDATE player_data SET wishlist = %s WHERE user_id = %s", (Json(new_wishlist), user_id))
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        return {"ok": True, "wishlist": new_wishlist}, 200
    except Exception as e:
        return {"ok": False, "error": "伺服器內部錯誤"}, 500


def draw_cards(user_id, count):
    if count not in (1, 10):
        return {"ok": False, "error": "無效的抽卡次數"}, 400
    cost = 160 * count
    tester = is_tester(user_id)

    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        if not pd: return {"ok": False, "error": "玩家數據不存在"}, 404
        
        current_coins = TESTER_COINS if tester else pd["coins"]
        if current_coins < cost: return {"ok": False, "error": "柚幣不足"}, 400

        pity, wishlist, cards = pd["pity"], pd["wishlist"], pd["cards"]
        
        results = []
        has_sr_or_above = False
        
        for i in range(count):
            is_last = (i == count - 1)
            rarity = "R"
            
            if pity >= 79:
                rarity = "SSR"
            else:
                roll = random.uniform(0, 100)
                if roll < 0.8: rarity = "SSR"
                elif roll < 15.8: rarity = "SR"
                else: rarity = "R"
                    
            if count == 10 and is_last and not has_sr_or_above:
                if rarity == "R": rarity = "SR"

            if rarity in ("SR", "SSR"): has_sr_or_above = True
            if rarity == "SSR": pity = 0
            else: pity += 1
                
            pool = POOL_BY_RARITY[rarity]
            wish_pool = [name for name in wishlist if name in pool]
            
            if wish_pool and random.random() < 0.67:
                char_name = random.choice(wish_pool)
            else:
                char_name = random.choice(pool)
                
            is_new = False
            shards = 0
            awaken = 0
            
            if char_name in cards:
                cards[char_name]["shards"] += 1
                shards = cards[char_name]["shards"]
                awaken = cards[char_name]["awaken"]
            else:
                is_new = True
                cards[char_name] = {"shards": 0, "awaken": 0}
                
            results.append({"name": char_name, "rarity": rarity, "is_new": is_new, "shards": shards, "awaken": awaken})

        # 更新餘額
        if tester:
            pd["coins"] = TESTER_COINS
        else:
            pd["coins"] -= cost
            
        pd["pity"] = pity
        pd["cards"] = cards
        
        return {"ok": True, "results": results, "coins": pd["coins"], "pity": pity}, 200

    # DB 模式
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT coins, pity, wishlist, cards FROM player_data WHERE user_id = %s FOR UPDATE", (user_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            db_pool.putconn(conn)
            return {"ok": False, "error": "玩家數據不存在"}, 404
            
        db_coins, pity, wishlist, cards = row
        current_coins = TESTER_COINS if tester else db_coins
        
        if current_coins < cost:
            cur.close()
            db_pool.putconn(conn)
            return {"ok": False, "error": "柚幣不足"}, 400

        results = []
        has_sr_or_above = False
        
        for i in range(count):
            is_last = (i == count - 1)
            rarity = "R"
            
            if pity >= 79:
                rarity = "SSR"
            else:
                roll = random.uniform(0, 100)
                if roll < 0.8: rarity = "SSR"
                elif roll < 15.8: rarity = "SR"
                else: rarity = "R"
                    
            if count == 10 and is_last and not has_sr_or_above:
                if rarity == "R": rarity = "SR"

            if rarity in ("SR", "SSR"): has_sr_or_above = True
            if rarity == "SSR": pity = 0
            else: pity += 1
                
            pool = POOL_BY_RARITY[rarity]
            wish_pool = [name for name in wishlist if name in pool]
            
            if wish_pool and random.random() < 0.67:
                char_name = random.choice(wish_pool)
            else:
                char_name = random.choice(pool)
                
            is_new = False
            shards = 0
            awaken = 0
            
            if char_name in cards:
                cards[char_name]["shards"] += 1
                shards = cards[char_name]["shards"]
                awaken = cards[char_name]["awaken"]
            else:
                is_new = True
                cards[char_name] = {"shards": 0, "awaken": 0}
                
            results.append({"name": char_name, "rarity": rarity, "is_new": is_new, "shards": shards, "awaken": awaken})

        if tester:
            new_coins = TESTER_COINS
        else:
            new_coins = db_coins - cost
            
        cur.execute("UPDATE player_data SET coins = %s, pity = %s, cards = %s WHERE user_id = %s", (new_coins, pity, Json(cards), user_id))
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        return {"ok": True, "results": results, "coins": new_coins, "pity": pity}, 200
        
    except Exception as e:
        print("抽卡發生錯誤:", e)
        return {"ok": False, "error": "伺服器內部錯誤"}, 500


def get_awaken_info(user_id, char_name):
    if char_name not in GAME_CHARACTERS:
        return {"ok": False, "error": "角色不存在"}, 404

    # 獲取玩家卡片數據
    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        if not pd: return {"ok": False, "error": "玩家不存在"}, 404
        card_data = pd["cards"].get(char_name, {"shards": 0, "awaken": 0})
    else:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT cards FROM player_data WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            cur.close()
            db_pool.putconn(conn)
            if not row: return {"ok": False, "error": "玩家不存在"}, 404
            card_data = row[0].get(char_name, {"shards": 0, "awaken": 0})
        except Exception as e:
            return {"ok": False, "error": "資料庫錯誤"}, 500

    char_info = GAME_CHARACTERS[char_name]
    return {
        "ok": True,
        "name": char_name,
        "rarity": char_info["rarity"],
        "awaken": card_data["awaken"],
        "shards": card_data["shards"],
        "effects": char_info["awaken"] # 包含 I, II, III 三個等級的描述
    }, 200


def do_awaken(user_id, char_name):
    if char_name not in GAME_CHARACTERS:
        return {"ok": False, "error": "角色不存在"}, 404

    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        if not pd: return {"ok": False, "error": "玩家不存在"}, 404
        
        card_data = pd["cards"].get(char_name)
        if not card_data:
            return {"ok": False, "error": "尚未擁有該角色"}, 400
            
        current_lvl = card_data["awaken"]
        current_shards = card_data["shards"]
        
        if current_lvl >= 3:
            return {"ok": False, "error": "已達最高覺醒等級"}, 400
            
        # 升級消耗：I=1, II=2, III=3
        cost = current_lvl + 1
        if current_shards < cost:
            return {"ok": False, "error": f"碎片不足，需要 {cost} 個"}, 400
            
        card_data["shards"] -= cost
        card_data["awaken"] += 1
        pd["cards"][char_name] = card_data
        
        # 紀錄首次覺醒獎勵（如果需要的話，這裡先保留接口）
        return {"ok": True, "awaken": card_data["awaken"], "shards": card_data["shards"]}, 200

    # DB 模式
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        # 加鎖防止連點
        cur.execute("SELECT cards FROM player_data WHERE user_id = %s FOR UPDATE", (user_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            db_pool.putconn(conn)
            return {"ok": False, "error": "玩家不存在"}, 404
            
        cards = row[0]
        card_data = cards.get(char_name)
        if not card_data:
            cur.close()
            db_pool.putconn(conn)
            return {"ok": False, "error": "尚未擁有該角色"}, 400
            
        current_lvl = card_data["awaken"]
        current_shards = card_data["shards"]
        
        if current_lvl >= 3:
            cur.close()
            db_pool.putconn(conn)
            return {"ok": False, "error": "已達最高覺醒等級"}, 400
            
        cost = current_lvl + 1
        if current_shards < cost:
            cur.close()
            db_pool.putconn(conn)
            return {"ok": False, "error": f"碎片不足，需要 {cost} 個"}, 400
            
        # 扣除碎片，等級 +1
        cards[char_name]["shards"] -= cost
        cards[char_name]["awaken"] += 1
        
        cur.execute("UPDATE player_data SET cards = %s WHERE user_id = %s", (Json(cards), user_id))
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        
        return {"ok": True, "awaken": cards[char_name]["awaken"], "shards": cards[char_name]["shards"]}, 200
    except Exception as e:
        print("覺醒錯誤:", e)
        return {"ok": False, "error": "伺服器內部錯誤"}, 500