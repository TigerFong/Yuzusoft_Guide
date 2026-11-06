# 文件：backend/game_core.py
import random
import json
import math
from .db import db_pool, memory_db
from .game_data import GAME_CHARACTERS, RARITY_WEIGHTS
from .auth import get_player_data

try:
    from psycopg2.extras import Json
except ImportError:
    class Json:
        def __init__(self, obj): self.obj = obj

POOL_BY_RARITY = {"SSR": [], "SR": [], "R": []}
for name, data in GAME_CHARACTERS.items():
    POOL_BY_RARITY[data["rarity"]].append(name)

TESTER_COINS = 999999

# =========================================================
# 完整關卡配置（契合原作日常與奇幻設定）
# =========================================================
BATTLE_STAGES = {
    # ================= 千戀＊萬花 =================
    "senren-1": {
        "name": "千戀＊萬花 · 第一章：神刀的試煉",
        "story": "你意外來到了穗織町，為了證明自己有資格握住神刀「叢雨丸」，芳乃決定對你進行一場淨化試煉。叢雨和茉子的幻影出現在你面前……",
        "waves": [
            [{"name": "幻影·叢雨", "hp": 1000, "mind": "陽", "code": "senren", "index": 3}, {"name": "幻影·茉子", "hp": 1000, "mind": "戲", "code": "senren", "index": 2}],
            [{"name": "淨化之刃", "hp": 2500, "mind": "和", "code": "senren", "index": 3}]
        ],
        "reward_coins": 120
    },
    "senren-2": {
        "name": "千戀＊萬花 · 第二章：甜品店的日常",
        "story": "在甜品店打工的日常中，小春因為過度勞累，不小心讓「想要做出最棒甜點」的執念具象化了。快幫她打碎這些暴走的甜點！",
        "waves": [
            [{"name": "暴走甜點", "hp": 1500, "mind": "陽", "code": "senren", "index": 5}, {"name": "暴走甜點", "hp": 1500, "mind": "陽", "code": "senren", "index": 5}],
            [{"name": "執念·小春", "hp": 2500, "mind": "和", "code": "senren", "index": 5}, {"name": "執念·蘆花", "hp": 2500, "mind": "和", "code": "senren", "index": 6}]
        ],
        "reward_coins": 150
    },
    "senren-3": {
        "name": "千戀＊萬花 · 第三章：巫女姬的決意",
        "story": "面對小鎮的詛咒，芳乃決定直面自己的軟弱。在這片精神空間中，她必須先戰勝自己的「心魔」，才能完成真正的蛻變。",
        "waves": [
            [{"name": "過去的記憶", "hp": 2000, "mind": "陽", "code": "senren", "index": 4}, {"name": "害怕的幻影", "hp": 2000, "mind": "戲", "code": "senren", "index": 2}],
            [{"name": "心魔·芳乃", "hp": 4500, "mind": "凜", "code": "senren", "index": 1}]
        ],
        "reward_coins": 200
    },
    "senren-4": {
        "name": "千戀＊萬花 · 第四章：詛咒的蔓延",
        "story": "祟神的怨念化作黑影，開始侵蝕現實。你們必須在幻境中擊退這些黑影，為現實中的儀式爭取時間！",
        "waves": [
            [{"name": "黑影刺客", "hp": 1500, "mind": "戲", "code": "senren", "index": 2}, {"name": "黑影刺客", "hp": 1500, "mind": "戲", "code": "senren", "index": 2}, {"name": "黑影刺客", "hp": 1500, "mind": "戲", "code": "senren", "index": 2}],
            [{"name": "詛咒化身", "hp": 5000, "mind": "陽", "code": "senren", "index": 3}, {"name": "怨念·叢雨", "hp": 3000, "mind": "陽", "code": "senren", "index": 3}]
        ],
        "reward_coins": 250
    },
    "senren-5": {
        "name": "千戀＊萬花 · 終章：祟神降臨",
        "story": "最終的淨化儀式開始，祟神的完全體在結界中具象化。握緊叢雨丸，守護穗織町的未來吧！",
        "waves": [
            [{"name": "祟神護衛", "hp": 3000, "mind": "和", "code": "senren", "index": 6}, {"name": "祟神護衛", "hp": 3000, "mind": "凜", "code": "senren", "index": 1}],
            [{"name": "穢土觸手", "hp": 4000, "mind": "陽", "code": "senren", "index": 4}, {"name": "穢土觸手", "hp": 4000, "mind": "戲", "code": "senren", "index": 2}],
            [{"name": "祟神", "hp": 10000, "mind": "靜", "code": "senren", "index": 3}]
        ],
        "reward_coins": 300
    },

    # ================= 天使紛擾 =================
    "tenshi-1": {
        "name": "天使紛擾 · 第一章：天降之物",
        "story": "自稱天使的乃愛從天而降。為了確認你「魔王轉世」的身份，她設下了神聖的結界考驗你的力量……",
        "waves": [
            [{"name": "異界魔物", "hp": 1200, "mind": "靜", "code": "tenshi", "index": 5}, {"name": "異界魔物", "hp": 1200, "mind": "靜", "code": "tenshi", "index": 5}],
            [{"name": "心魔·天音", "hp": 2800, "mind": "陽", "code": "tenshi", "index": 2}]
        ],
        "reward_coins": 120
    },
    "tenshi-2": {
        "name": "天使紛擾 · 第二章：魔族來襲",
        "story": "魔族皇女星河輝耶帶著侍從強勢降臨！她認為你搶走了魔王的力量，一場異世界之間的鬧劇就此展開。",
        "waves": [
            [{"name": "心魔·歐麗葉", "hp": 1800, "mind": "凜", "code": "tenshi", "index": 5}, {"name": "心魔·來海", "hp": 1800, "mind": "戲", "code": "tenshi", "index": 3}],
            [{"name": "心魔·輝耶", "hp": 4000, "mind": "戲", "code": "tenshi", "index": 4}]
        ],
        "reward_coins": 150
    },
    "tenshi-3": {
        "name": "天使紛擾 · 第三章：皇女的惡戲",
        "story": "為了爭奪「魔王」，天使與魔族在你的精神世界中大打出手。你需要擊敗她們的幻影，讓這場騷動平息下來。",
        "waves": [
            [{"name": "魔力殘影", "hp": 2200, "mind": "羞", "code": "tenshi", "index": 4}, {"name": "魔力殘影", "hp": 2200, "mind": "羞", "code": "tenshi", "index": 4}],
            [{"name": "心魔·風實花", "hp": 3200, "mind": "和", "code": "tenshi", "index": 6}, {"name": "心魔·乃愛", "hp": 3200, "mind": "靜", "code": "tenshi", "index": 1}]
        ],
        "reward_coins": 200
    },
    "tenshi-4": {
        "name": "天使紛擾 · 第四章：教師的關愛",
        "story": "乃愛因為過度使用神力而陷入昏迷。在夢境中，你必須面對她內心的恐懼，將她從黑暗中拉回來。",
        "waves": [
            [{"name": "恐懼具象", "hp": 2800, "mind": "靜", "code": "tenshi", "index": 1}, {"name": "恐懼具象", "hp": 2800, "mind": "陽", "code": "tenshi", "index": 2}],
            [{"name": "黑暗天使", "hp": 5500, "mind": "羞", "code": "tenshi", "index": 5}]
        ],
        "reward_coins": 250
    },
    "tenshi-5": {
        "name": "天使紛擾 · 終章：魔王覺醒",
        "story": "前世的記憶如潮水般湧來。作為魔王轉世的你，必須直面這份力量。為了守護現在的日常，徹底斬斷前世的宿命吧！",
        "waves": [
            [{"name": "前世眷屬", "hp": 3500, "mind": "戲", "code": "tenshi", "index": 3}, {"name": "前世眷屬", "hp": 3500, "mind": "凜", "code": "tenshi", "index": 5}],
            [{"name": "夢魘之主", "hp": 5000, "mind": "羞", "code": "tenshi", "index": 4}, {"name": "記憶巨獸", "hp": 4000, "mind": "和", "code": "tenshi", "index": 6}],
            [{"name": "前世魔王之影", "hp": 11000, "mind": "靜", "code": "tenshi", "index": 1}]
        ],
        "reward_coins": 300
    },

    # ================= 星光咖啡館與死神之蝶 =================
    "cafe-1": {
        "name": "星光咖啡館 · 第一章：咖啡館的邀約",
        "story": "為了協助死神栞那，你開始經營咖啡館。然而，店裡的魔法器具似乎因為栞那的疏忽而暴走了……",
        "waves": [
            [{"name": "暴走咖啡機", "hp": 1500, "mind": "陽", "code": "cafe", "index": 5}],
            [{"name": "心魔·愛衣", "hp": 2500, "mind": "陽", "code": "cafe", "index": 4}, {"name": "心魔·涼音", "hp": 2500, "mind": "陽", "code": "cafe", "index": 5}]
        ],
        "reward_coins": 120
    },
    "cafe-2": {
        "name": "星光咖啡館 · 第二章：巫女的祈願",
        "story": "希察覺到了你身上的死亡氣息，決定為你進行一場驅邪祈福。在神社的結界中，你看到了時間的殘影。",
        "waves": [
            [{"name": "時間殘影", "hp": 2200, "mind": "靜", "code": "cafe", "index": 2}, {"name": "時間殘影", "hp": 2200, "mind": "陽", "code": "cafe", "index": 3}],
            [{"name": "執念的幽靈", "hp": 4500, "mind": "凜", "code": "cafe", "index": 3}]
        ],
        "reward_coins": 150
    },
    "cafe-3": {
        "name": "星光咖啡館 · 第三章：高冷女僕",
        "story": "為了探尋時間回溯的真相，栞那帶領你進入了時間的夾縫。在這裡，你們遭遇了吞噬時間的怪物。",
        "waves": [
            [{"name": "虛空爬行者", "hp": 2800, "mind": "靜", "code": "cafe", "index": 2}, {"name": "虛空爬行者", "hp": 2800, "mind": "靜", "code": "cafe", "index": 2}],
            [{"name": "心魔·栞那", "hp": 5000, "mind": "陽", "code": "cafe", "index": 1}]
        ],
        "reward_coins": 200
    },
    "cafe-4": {
        "name": "星光咖啡館 · 第四章：死神之蝶",
        "story": "死神的規則無法改變。為了尋找破局之法，你與栞那在回憶的夢境中與過去的死神使者交戰。",
        "waves": [
            [{"name": "回憶守衛", "hp": 3200, "mind": "戲", "code": "cafe", "index": 4}, {"name": "回憶守衛", "hp": 3200, "mind": "戲", "code": "cafe", "index": 4}],
            [{"name": "死神使者", "hp": 6000, "mind": "靜", "code": "cafe", "index": 1}]
        ],
        "reward_coins": 250
    },
    "cafe-5": {
        "name": "星光咖啡館 · 終章：星光的奇蹟",
        "story": "時間的因果即將閉合。在星光閃爍的夢境深處，你與栞那攜手，直面死神之蝶的最終考驗。",
        "waves": [
            [{"name": "輪迴之影", "hp": 4000, "mind": "和", "code": "cafe", "index": 3}, {"name": "輪迴之影", "hp": 4000, "mind": "和", "code": "cafe", "index": 3}],
            [{"name": "虛空死神", "hp": 6500, "mind": "靜", "code": "cafe", "index": 2}],
            [{"name": "夢魘·死神之蝶", "hp": 12000, "mind": "陽", "code": "cafe", "index": 1}]
        ],
        "reward_coins": 300
    },

    # ================= 魔女的夜宴 =================
    "sabbat-1": {
        "name": "魔女的夜宴 · 第一章：夜宴開啟",
        "story": "你撞破了同班同學綾地寧寧是魔女的秘密。恰逢寧寧的魔力突然「發作」，多餘的魔力化作了暴走的造物！",
        "waves": [
            [{"name": "失控魔力", "hp": 1500, "mind": "凜", "code": "sabbat", "index": 4}, {"name": "失控魔力", "hp": 1500, "mind": "凜", "code": "sabbat", "index": 4}],
            [{"name": "心魔·和奏", "hp": 3000, "mind": "戲", "code": "sabbat", "index": 5}]
        ],
        "reward_coins": 120
    },
    "sabbat-2": {
        "name": "魔女的夜宴 · 第二章：學生會長",
        "story": "為了幫寧寧掩飾秘密，你開始尋找其他的魔女。在學生會長憧子的引導下，你進入了一片滿是幻象的結界。",
        "waves": [
            [{"name": "心魔·巡", "hp": 2500, "mind": "戲", "code": "sabbat", "index": 2}, {"name": "心魔·憧子", "hp": 2500, "mind": "靜", "code": "sabbat", "index": 4}],
            [{"name": "魔法幻影", "hp": 4500, "mind": "羞", "code": "sabbat", "index": 3}]
        ],
        "reward_coins": 150
    },
    "sabbat-3": {
        "name": "魔女的夜宴 · 第三章：軟糯的轉校生",
        "story": "轉校生椎葉紬也是魔女，且背負著不能穿女裝的契約代價。她的痛苦回憶化作魔物，將你們困在其中。",
        "waves": [
            [{"name": "契約魔物", "hp": 3000, "mind": "和", "code": "sabbat", "index": 3}, {"name": "契約魔物", "hp": 3000, "mind": "和", "code": "sabbat", "index": 3}],
            [{"name": "心魔·紬", "hp": 5500, "mind": "和", "code": "sabbat", "index": 3}]
        ],
        "reward_coins": 200
    },
    "sabbat-4": {
        "name": "魔女的夜宴 · 第四章：魔女的契約",
        "story": "魔女的契約是絕對的。在幫助寧寧尋找解除代價的過程中，你們遭遇了過去魔女留下的殘留魔力。",
        "waves": [
            [{"name": "魔力殘留", "hp": 3800, "mind": "凜", "code": "sabbat", "index": 1}, {"name": "魔力殘留", "hp": 3800, "mind": "凜", "code": "sabbat", "index": 1}],
            [{"name": "心魔·寧寧", "hp": 6500, "mind": "凜", "code": "sabbat", "index": 1}]
        ],
        "reward_coins": 250
    },
    "sabbat-5": {
        "name": "魔女的夜宴 · 終章：誓約之吻",
        "story": "所有的因果在此交匯。為了拯救寧寧，你牽起她的手，走進了屬於她的內心世界，直面那最純粹的魔力暴走。",
        "waves": [
            [{"name": "魔力核心", "hp": 4500, "mind": "羞", "code": "sabbat", "index": 2}, {"name": "魔力核心", "hp": 4500, "mind": "羞", "code": "sabbat", "index": 2}],
            [{"name": "誓約的守護者", "hp": 7000, "mind": "靜", "code": "sabbat", "index": 4}],
            [{"name": "魔力暴走·寧寧", "hp": 13000, "mind": "羞", "code": "sabbat", "index": 1}]
        ],
        "reward_coins": 300
    }
}

# =========================================================
# 戰鬥入口與進度控制
# =========================================================
from .battle_engine import (
    create_battle, play_card, end_turn, claim_reward, get_state,
)

def _load_owned_cards(user_id):
    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        return pd["cards"] if pd else {}

    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT cards FROM player_data WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        db_pool.putconn(conn)
        if row and row[0]:
            if isinstance(row[0], str): return json.loads(row[0])
            return row[0]
        return {}
    except Exception as e:
        print("讀取玩家卡牌失敗:", e)
        return {}

def start_battle(user_id, stage_id, party_names=None):
    if not stage_id or stage_id not in BATTLE_STAGES:
        return {"ok": False, "error": "關卡不存在"}, 404

    owned = _load_owned_cards(user_id)
    if not owned:
        return {"ok": False, "error": "你沒有任何角色，無法戰鬥！"}, 400

    # 檢查前置關卡解鎖
    pd = get_player_data(user_id)
    stats = pd.get("stats", {}) if pd else {}
    cleared = stats.get("cleared_stages", [])
    
    # ★ Tester 特權：跳過前置關卡檢查
    if not is_tester(user_id):
        game_prefix = stage_id.split("-")[0]
        stage_num = int(stage_id.split("-")[1])
        if stage_num > 1:
            prev_stage = f"{game_prefix}-{stage_num - 1}"
            if prev_stage not in cleared:
                return {"ok": False, "error": "請先通關前置關卡！"}, 403

    if party_names is not None:
        valid = [n for n in party_names if n in owned and n in GAME_CHARACTERS]
        if not valid: 
            return {"ok": False, "error": "出戰隊伍無效"}, 400
        party_names = valid

    try:
        state, err = create_battle(
            user_id, stage_id, BATTLE_STAGES[stage_id], owned, party_names=party_names,
        )
        if err:
            return {"ok": False, "error": err}, 400
            
        return {"ok": True, "state": state, "story": BATTLE_STAGES[stage_id].get("story", "")}, 200
    except Exception as e:
        print("進入戰鬥發生錯誤:", e)
        return {"ok": False, "error": f"伺服器內部錯誤: {str(e)}"}, 500

def get_battle_progress(user_id):
    pd = get_player_data(user_id)
    stats = pd.get("stats", {})
    return {"ok": True, "cleared_stages": stats.get("cleared_stages", [])}, 200

def claim_battle_reward(user_id):
    result, err = claim_reward(user_id)
    if err: return {"ok": False, "error": err}, 400

    reward = result["reward"]
    stage_id = result["stage_id"]

    pd = get_player_data(user_id)
    stats = pd.get("stats", {})
    cleared = stats.get("cleared_stages", [])
    
    is_first_clear = stage_id not in cleared
    actual_reward = reward if is_first_clear else 0
    exp_gain = 100 if is_first_clear else 30  # 首通給 100 EXP，重複刷給 30 EXP

    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        if pd:
            pd["coins"] = pd.get("coins", 0) + actual_reward
            stats = pd.setdefault("stats", {})
            stats["exp"] = stats.get("exp", 0) + exp_gain
            cleared = stats.setdefault("cleared_stages", [])
            if stage_id not in cleared: cleared.append(stage_id)
    else:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT coins, stats FROM player_data WHERE user_id = %s FOR UPDATE", (user_id,))
            row = cur.fetchone()
            coins, stats = row[0], row[1]
            
            stats = stats or {}
            cleared = stats.get("cleared_stages", [])
            
            is_first_clear = stage_id not in cleared
            actual_reward = reward if is_first_clear else 0
            exp_gain = 100 if is_first_clear else 30

            stats["exp"] = stats.get("exp", 0) + exp_gain
            if stage_id not in cleared: cleared.append(stage_id)
            stats["cleared_stages"] = cleared

            cur.execute("UPDATE player_data SET coins = %s, stats = %s WHERE user_id = %s", (coins + actual_reward, Json(stats), user_id))
            conn.commit()
            cur.close()
            db_pool.putconn(conn)
        except Exception as e:
            print("發放獎勵失敗:", e)
            return {"ok": False, "error": "發放獎勵失敗"}, 500

    return {"ok": True, "reward": actual_reward, "exp_gain": exp_gain, "stage_id": stage_id, "is_first_clear": is_first_clear}, 200

# =========================================================
# 其餘（抽卡、覺醒）保持你原本的代碼不變...
# =========================================================
def get_battle_party_info(user_id):
    owned = _load_owned_cards(user_id)
    result = []
    for name, card in owned.items():
        if name not in GAME_CHARACTERS: continue
        info = GAME_CHARACTERS[name]
        result.append({
            "name": name, "rarity": info["rarity"], "role": info["role"],
            "mind": info["mind"], "awaken": card.get("awaken", 0), "shards": card.get("shards", 0),
        })
    order = {"SSR": 3, "SR": 2, "R": 1}
    result.sort(key=lambda x: (-order.get(x["rarity"], 0), -x["awaken"], x["name"]))
    return {"ok": True, "characters": result}, 200

def battle_action(user_id, card_index, target_index):
    result, err = play_card(user_id, card_index, target_index)
    if err: return {"ok": False, "error": err}, 400
    return {"ok": True, **result}, 200

def battle_end_turn(user_id):
    result, err = end_turn(user_id)
    if err: return {"ok": False, "error": err}, 400
    return {"ok": True, **result}, 200

def is_tester(user_id):
    if not db_pool:
        for u in memory_db.users.values():
            if u["id"] == user_id and u["username"].lower() == "tester": return True
        return False
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT username_lower FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        db_pool.putconn(conn)
        return row and row[0] == "tester"
    except: return False



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
    if not isinstance(new_wishlist, list) or len(new_wishlist) > 1:
        return {"ok": False, "error": "心願單最多只能放 1 個角色"}, 400
    for name in new_wishlist:
        if name not in GAME_CHARACTERS:
            return {"ok": False, "error": f"角色 {name} 不存在"}, 400
        if GAME_CHARACTERS[name]["rarity"] != "SSR":
            return {"ok": False, "error": "心願單只能放入 SSR 角色"}, 400

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
        refund_coins = 0
        
        for i in range(count):
            is_last = (i == count - 1)
            rarity = "R"
            
            # === 米哈遊式軟保底邏輯 ===
            if pity >= 79:
                # 第 80 抽硬保底
                rarity = "SSR"
            else:
                # 從第 50 抽（pity >= 49）開始，每抽增加 5% 概率
                current_ssr_rate = 2.0
                if pity >= 49:
                    current_ssr_rate += (pity - 48) * 5.0 
                
                # 判定
                roll = random.uniform(0, 100)
                if roll < current_ssr_rate: 
                    rarity = "SSR"
                elif roll < current_ssr_rate + 15.0: 
                    rarity = "SR"
                else: 
                    rarity = "R"
                    
            if count == 10 and is_last and not has_sr_or_above:
                if rarity == "R": rarity = "SR"

            if rarity in ("SR", "SSR"): has_sr_or_above = True
            if rarity == "SSR": pity = 0
            else: pity += 1
                
            pool = POOL_BY_RARITY[rarity]
            
            # 心願單（單一 SSR）
            if rarity == "SSR":
                if wishlist and wishlist[0] in pool and random.random() < 0.67:
                    char_name = wishlist[0]
                else:
                    char_name = random.choice(pool)
            else:
                char_name = random.choice(pool)
                
            is_new = False
            shards = 0
            awaken = 0
            refund = 0
            
            if char_name in cards:
                awaken = cards[char_name]["awaken"]
                if awaken >= 3:
                    refund = 160 if rarity == "SSR" else (80 if rarity == "SR" else 40)
                    refund_coins += refund
                    shards = cards[char_name]["shards"]
                else:
                    cards[char_name]["shards"] += 1
                    shards = cards[char_name]["shards"]
            else:
                is_new = True
                cards[char_name] = {"shards": 0, "awaken": 0}
                
            results.append({
                "name": char_name, "rarity": rarity, "is_new": is_new, 
                "shards": shards, "awaken": awaken, "refund": refund
            })

        if tester:
            pd["coins"] = TESTER_COINS
        else:
            pd["coins"] = pd["coins"] - cost + refund_coins
            
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
        refund_coins = 0
        
        for i in range(count):
            is_last = (i == count - 1)
            rarity = "R"
            
            # === 米哈遊式軟保底邏輯 ===
            if pity >= 79:
                rarity = "SSR"
            else:
                current_ssr_rate = 2.0
                # 從第 50 抽（pity >= 49）開始，每抽增加 2%
                if pity >= 49:
                    current_ssr_rate += (pity - 48) * 2.0 
                
                roll = random.uniform(0, 100)
                if roll < current_ssr_rate: rarity = "SSR"
                elif roll < current_ssr_rate + 15.0: rarity = "SR"
                else: rarity = "R"
                    
            if count == 10 and is_last and not has_sr_or_above:
                if rarity == "R": rarity = "SR"

            if rarity in ("SR", "SSR"): has_sr_or_above = True
            if rarity == "SSR": pity = 0
            else: pity += 1
                
            pool = POOL_BY_RARITY[rarity]
            
            if rarity == "SSR":
                if wishlist and wishlist[0] in pool and random.random() < 0.67:
                    char_name = wishlist[0]
                else:
                    char_name = random.choice(pool)
            else:
                char_name = random.choice(pool)
                
            is_new = False
            shards = 0
            awaken = 0
            refund = 0
            
            if char_name in cards:
                awaken = cards[char_name]["awaken"]
                if awaken >= 3:
                    refund = 160 if rarity == "SSR" else (80 if rarity == "SR" else 40)
                    refund_coins += refund
                    shards = cards[char_name]["shards"]
                else:
                    cards[char_name]["shards"] += 1
                    shards = cards[char_name]["shards"]
            else:
                is_new = True
                cards[char_name] = {"shards": 0, "awaken": 0}
                
            results.append({
                "name": char_name, "rarity": rarity, "is_new": is_new, 
                "shards": shards, "awaken": awaken, "refund": refund
            })

        if tester:
            new_coins = TESTER_COINS
        else:
            new_coins = db_coins - cost + refund_coins
            
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
        
        if current_lvl >= 6:
            return {"ok": False, "error": "已達最高覺醒等級"}, 400
            
        cost = 1 
        if current_shards < cost:
            return {"ok": False, "error": f"碎片不足，需要 {cost} 個"}, 400
            
        card_data["shards"] -= cost
        card_data["awaken"] += 1
        pd["cards"][char_name] = card_data
        
        return {"ok": True, "awaken": card_data["awaken"], "shards": card_data["shards"]}, 200

    # DB 模式
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT cards FROM player_data WHERE user_id = %s FOR UPDATE", (user_id,))
        row = cur.fetchone()
        if not row:
            cur.close(); db_pool.putconn(conn)
            return {"ok": False, "error": "玩家不存在"}, 404
            
        cards = row[0]
        card_data = cards.get(char_name)
        if not card_data:
            cur.close(); db_pool.putconn(conn)
            return {"ok": False, "error": "尚未擁有該角色"}, 400
            
        current_lvl = card_data["awaken"]
        current_shards = card_data["shards"]
        
        if current_lvl >= 6:
            cur.close(); db_pool.putconn(conn)
            return {"ok": False, "error": "已達最高覺醒等級"}, 400
            
        cost = 1
        if current_shards < cost:
            cur.close(); db_pool.putconn(conn)
            return {"ok": False, "error": f"碎片不足，需要 {cost} 個"}, 400
            
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

# =========================================================
# 新增：角色升級系統
# =========================================================
def upgrade_character(user_id, char_name, target_level):
    if char_name not in GAME_CHARACTERS:
        return {"ok": False, "error": "角色不存在"}, 404

    tester = is_tester(user_id)

    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        if not pd: return {"ok": False, "error": "玩家不存在"}, 404
        cards = pd["cards"]
        stats = pd.get("stats", {})
        current_exp = stats.get("exp", 0)
    else:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT stats, cards FROM player_data WHERE user_id = %s FOR UPDATE", (user_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); db_pool.putconn(conn)
                return {"ok": False, "error": "玩家不存在"}, 404
            stats, cards = row[0] or {}, row[1]
            current_exp = stats.get("exp", 0)
        except Exception as e:
            return {"ok": False, "error": "資料庫錯誤"}, 500

    card = cards.get(char_name)
    if not card:
        if db_pool: cur.close(); db_pool.putconn(conn)
        return {"ok": False, "error": "尚未擁有該角色"}, 400

    current_lvl = card.get("level", 1)
    
    # 判斷權限與範圍
    if target_level < 1 or target_level > 60:
        if db_pool: cur.close(); db_pool.putconn(conn)
        return {"ok": False, "error": "無效的等級範圍"}, 400

    if not tester:
        if current_lvl >= 60:
            if db_pool: cur.close(); db_pool.putconn(conn)
            return {"ok": False, "error": "已達最高等級"}, 400
        if target_level <= current_lvl:
            if db_pool: cur.close(); db_pool.putconn(conn)
            return {"ok": False, "error": "無效的升級目標"}, 400

    # 計算消耗 EXP
    cost_exp = 0
    if not tester and target_level > current_lvl:
        for lv in range(current_lvl, target_level):
            cost_exp += lv * 20

    if not tester and current_exp < cost_exp:
        if db_pool: cur.close(); db_pool.putconn(conn)
        return {"ok": False, "error": f"經驗不足，需要 {cost_exp} EXP"}, 400

    # 更新數據
    new_exp = current_exp - cost_exp if not tester else current_exp
    card["level"] = target_level

    if not db_pool:
        pd["cards"] = cards
        if not tester:
            pd["stats"]["exp"] = new_exp
    else:
        try:
            if not tester:
                stats["exp"] = new_exp
            cur.execute("UPDATE player_data SET stats = %s, cards = %s WHERE user_id = %s", (Json(stats), Json(cards), user_id))
            conn.commit()
            cur.close()
            db_pool.putconn(conn)
        except Exception as e:
            return {"ok": False, "error": "更新失敗"}, 500

    return {"ok": True, "level": target_level, "exp": new_exp, "cost_exp": cost_exp}, 200


# 修改 get_battle_party_info 讓前端拿到 level
def get_battle_party_info(user_id):
    owned = _load_owned_cards(user_id)
    result = []
    for name, card in owned.items():
        if name not in GAME_CHARACTERS: continue
        info = GAME_CHARACTERS[name]
        result.append({
            "name": name, "rarity": info["rarity"], "role": info["role"],
            "mind": info["mind"], "awaken": card.get("awaken", 0), "shards": card.get("shards", 0),
            "level": card.get("level", 1) # ← 新增
        })
    order = {"SSR": 3, "SR": 2, "R": 1}
    result.sort(key=lambda x: (-order.get(x["rarity"], 0), -x["level"], -x["awaken"], x["name"]))
    return {"ok": True, "characters": result}, 200

# =========================================================
# 測試員專屬 API
# =========================================================
def toggle_stage_unlock(user_id, stage_id, action):
    if not is_tester(user_id):
        return {"ok": False, "error": "權限不足"}, 403
    
    pd = get_player_data(user_id)
    stats = pd.get("stats", {})
    cleared = stats.get("cleared_stages", [])

    if action == "unlock":
        if stage_id not in cleared: cleared.append(stage_id)
    elif action == "lock":
        if stage_id in cleared: cleared.remove(stage_id)

    if not db_pool:
        memory_db.player_data[user_id]["stats"] = stats
    else:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT stats FROM player_data WHERE user_id = %s FOR UPDATE", (user_id,))
            db_stats = cur.fetchone()[0] or {}
            db_stats["cleared_stages"] = cleared
            cur.execute("UPDATE player_data SET stats = %s WHERE user_id = %s", (Json(db_stats), user_id))
            conn.commit()
            cur.close()
            db_pool.putconn(conn)
        except Exception as e:
            return {"ok": False, "error": "資料庫錯誤"}, 500
            
    return {"ok": True, "cleared_stages": cleared}, 200


def set_awaken_level(user_id, char_name, target_lvl):
    if not is_tester(user_id):
        return {"ok": False, "error": "權限不足"}, 403

    if char_name not in GAME_CHARACTERS:
        return {"ok": False, "error": "角色不存在"}, 404
        
    target_lvl = int(target_lvl)
    if target_lvl < 0 or target_lvl > 6:
        return {"ok": False, "error": "覺醒等級必須在 0-6 之間"}, 400

    if not db_pool:
        pd = memory_db.player_data.get(user_id)
        if not pd or char_name not in pd["cards"]:
            return {"ok": False, "error": "角色不存在"}, 404
        pd["cards"][char_name]["awaken"] = target_lvl
    else:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT cards FROM player_data WHERE user_id = %s FOR UPDATE", (user_id,))
            cards = cur.fetchone()[0]
            if char_name not in cards:
                cur.close(); db_pool.putconn(conn)
                return {"ok": False, "error": "尚未擁有"}, 400
            
            cards[char_name]["awaken"] = target_lvl
            cur.execute("UPDATE player_data SET cards = %s WHERE user_id = %s", (Json(cards), user_id))
            conn.commit()
            cur.close()
            db_pool.putconn(conn)
        except Exception as e:
            return {"ok": False, "error": "資料庫錯誤"}, 500
            
    return {"ok": True, "awaken": target_lvl}, 200