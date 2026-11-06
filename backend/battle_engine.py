# 文件：backend/battle_engine.py
# 戰鬥引擎：純邏輯，不碰資料庫。所有戰鬥狀態存於記憶體，以 user_id 為鍵。
import random
import copy

from .game_data import GAME_CHARACTERS, MIND_COUNTER

# user_id -> state dict
_battle_states = {}


# =========================================================
# 建隊 / 建敵
# =========================================================
def _build_party(owned_cards):
    """owned_cards: {name: {"shards": int, "awaken": int}}"""
    party = []
    for name in list(owned_cards.keys())[:3]:
        if name not in GAME_CHARACTERS:
            continue
        info = GAME_CHARACTERS[name]
        awaken_lvl = owned_cards[name].get("awaken", 0)
        multiplier = 1.0 + (awaken_lvl * 0.10)
        skills_data = copy.deepcopy(info["skills"])
        for k in ("normal", "skill", "ultimate"):
            skills_data[k]["value"] = int(skills_data[k]["value"] * multiplier)
            # 補上 target 欄位（若 game_data 沒寫，用 desc 推斷）
            if "target" not in skills_data[k]:
                skills_data[k]["target"] = _infer_target(skills_data[k].get("desc", ""))

        party.append({
            "name": name,
            "mind": info["mind"],
            "rarity": info["rarity"],
            "role": info["role"],
            "awaken": awaken_lvl,
            "skills": skills_data,
            "hp": 1000, "max_hp": 1000,
            "ep": 0, "max_ep": 100,
            "shield": 0,
        })
    return party


def _build_enemies(stage_enemies):
    result = []
    for i, e in enumerate(stage_enemies):
        result.append({
            "id": i,
            "name": e["name"],
            "hp": e["hp"],
            "max_hp": e["max_hp"],
            "mind": e["mind"],
            "toughness": 3,
            "max_toughness": 3,
            "is_stunned": False,
            "shield": e.get("shield", 0),
            "code": e.get("code", "game"),
            "index": e.get("index", 1),
        })
    return result


def _infer_target(desc):
    if not desc:
        return "single"
    if any(k in desc for k in ("全", "群", "全體", "全隊")):
        return "aoe"
    return "single"


# =========================================================
# 抽牌
# =========================================================
def _draw_hand(state, count=5):
    hand = []
    alive = [p for p in state["party"] if p["hp"] > 0]
    if not alive:
        return hand

    for _ in range(count):
        char = random.choice(alive)
        skills = char["skills"]

        if char["ep"] >= char["max_ep"]:
            card_type = "ultimate"
            sdata = skills["ultimate"]
        else:
            card_type = "skill" if random.random() < 0.4 else "normal"
            sdata = skills[card_type]

        hand.append({
            "owner_index": state["party"].index(char),
            "name": char["name"],
            "title": sdata["name"],
            "cost": sdata["cost"],
            "mind": char["mind"],
            "desc": sdata["desc"],
            "action_type": sdata["type"],
            "value": sdata["value"],
            "target": sdata["target"],
            "card_type": card_type,
        })

        if card_type == "ultimate":
            char["ep"] = 0

    return hand


# =========================================================
# 心相克制
# =========================================================
def _is_counter(my_mind, enemy_mind):
    return MIND_COUNTER.get(my_mind) == enemy_mind


# =========================================================
# 建立戰鬥
# =========================================================
def create_battle(user_id, stage_id, owned_cards, stage_config):
    party = _build_party(owned_cards)
    if not party:
        return None, "你沒有任何角色，無法戰鬥！"

    enemies = _build_enemies(stage_config["enemies"])

    state = {
        "user_id": user_id,
        "stage_id": stage_id,
        "stage_name": stage_config["name"],
        "turn": 1,
        "sp": 3,
        "max_sp": 10,
        "party": party,
        "enemies": enemies,
        "battle_over": False,
        "victory": False,
        "reward_claimed": False,
        "reward_coins": stage_config["reward_coins"],
        "log": [],
    }
    state["hand"] = _draw_hand(state, 5)
    _battle_states[user_id] = state
    return state, None


# =========================================================
# 出牌
# =========================================================
def play_card(user_id, card_index, target_index=None):
    state = _battle_states.get(user_id)
    if not state:
        return None, "戰鬥不存在"
    if state["battle_over"]:
        return None, "戰鬥已結束"

    hand = state["hand"]
    if card_index < 0 or card_index >= len(hand):
        return None, "無效的卡牌"

    card = hand[card_index]
    if card["cost"] > state["sp"]:
        return None, "SP 不足"

    owner = state["party"][card["owner_index"]]
    if owner["hp"] <= 0:
        return None, "該角色已倒下"

    events = []
    state["sp"] -= card["cost"]

    if card["card_type"] != "ultimate":
        owner["ep"] = min(owner["max_ep"], owner["ep"] + 30)

    # ---------- 傷害 ----------
    if card["action_type"] == "damage":
        if target_index is None or target_index < 0 or target_index >= len(state["enemies"]):
            return None, "請選擇目標"
        primary = state["enemies"][target_index]
        if primary["hp"] <= 0:
            return None, "目標已倒下"

        # 單體或群體（group 的第一個是主目標）
        targets = [target_index] if card["target"] == "single" else [
            i for i, e in enumerate(state["enemies"]) if e["hp"] > 0
        ]

        for idx in targets:
            t = state["enemies"][idx]
            if t["hp"] <= 0:
                continue
            dmg = card["value"]
            crit = _is_counter(card["mind"], t["mind"])
            if crit:
                dmg = int(dmg * 1.5)

            if t["shield"] > 0:
                absorbed = min(t["shield"], dmg)
                t["shield"] -= absorbed
                dmg -= absorbed

            t["hp"] = max(0, t["hp"] - dmg)
            events.append({"type": "damage", "target": idx, "value": dmg, "is_crit": crit})

            if t["hp"] > 0 and t["toughness"] > 0:
                loss = 2 if crit else 1
                t["toughness"] = max(0, t["toughness"] - loss)
                if t["toughness"] == 0:
                    t["is_stunned"] = True
                    events.append({"type": "stun", "target": idx})

    # ---------- 治療 ----------
    elif card["action_type"] == "heal":
        if card["target"] == "aoe" or card["card_type"] == "ultimate":
            for i, p in enumerate(state["party"]):
                if p["hp"] <= 0:
                    continue
                healed = min(card["value"], p["max_hp"] - p["hp"])
                p["hp"] += healed
                events.append({"type": "heal", "target": i, "value": healed})
        else:
            candidates = [(i, p) for i, p in enumerate(state["party"]) if p["hp"] > 0]
            if not candidates:
                return None, "無存活角色"
            i, p = min(candidates, key=lambda x: x[1]["hp"])
            healed = min(card["value"], p["max_hp"] - p["hp"])
            p["hp"] += healed
            events.append({"type": "heal", "target": i, "value": healed})

    # ---------- 護盾 ----------
    elif card["action_type"] == "shield":
        if card["target"] == "aoe" or card["card_type"] == "ultimate":
            for i, p in enumerate(state["party"]):
                if p["hp"] <= 0:
                    continue
                p["shield"] += card["value"]
                events.append({"type": "shield", "target": i, "value": card["value"]})
        else:
            candidates = [(i, p) for i, p in enumerate(state["party"]) if p["hp"] > 0]
            if not candidates:
                return None, "無存活角色"
            i, p = candidates[0]
            p["shield"] += card["value"]
            events.append({"type": "shield", "target": i, "value": card["value"]})

    state["hand"].pop(card_index)
    _check_over(state)
    return {"state": _serialize(state), "events": events}, None


# =========================================================
# 結束回合（敵方行動）
# =========================================================
def end_turn(user_id):
    state = _battle_states.get(user_id)
    if not state:
        return None, "戰鬥不存在"
    if state["battle_over"]:
        return None, "戰鬥已結束"

    events = []

    for i, enemy in enumerate(state["enemies"]):
        if enemy["hp"] <= 0:
            continue

        if enemy["is_stunned"]:
            enemy["is_stunned"] = False
            enemy["toughness"] = enemy["max_toughness"]
            events.append({"type": "enemy_recover", "target": i})
            continue

        alive = [(j, p) for j, p in enumerate(state["party"]) if p["hp"] > 0]
        if not alive:
            break
        j, target = random.choice(alive)

        dmg = 150
        if target["shield"] > 0:
            absorbed = min(target["shield"], dmg)
            target["shield"] -= absorbed
            dmg -= absorbed
        if dmg > 0:
            target["hp"] = max(0, target["hp"] - dmg)

        target["ep"] = min(target["max_ep"], target["ep"] + 20)
        events.append({"type": "enemy_attack", "enemy": i, "target": j, "value": dmg})

    _check_over(state)

    if not state["battle_over"]:
        state["turn"] += 1
        state["sp"] = min(state["max_sp"], state["sp"] + 3)
        state["hand"] = _draw_hand(state, 5)

    return {"state": _serialize(state), "events": events}, None


# =========================================================
# 勝負判定 / 獎勵
# =========================================================
def _check_over(state):
    if all(e["hp"] <= 0 for e in state["enemies"]):
        state["battle_over"] = True
        state["victory"] = True
    elif all(p["hp"] <= 0 for p in state["party"]):
        state["battle_over"] = True
        state["victory"] = False


def claim_reward(user_id):
    state = _battle_states.get(user_id)
    if not state:
        return None, "戰鬥不存在"
    if not state["battle_over"]:
        return None, "戰鬥尚未結束"
    if state["reward_claimed"]:
        return None, "獎勵已領取"
    if not state["victory"]:
        return None, "戰鬥失敗，沒有獎勵"

    state["reward_claimed"] = True
    reward = state["reward_coins"]
    del _battle_states[user_id]
    return {"reward": reward}, None


def get_state(user_id):
    state = _battle_states.get(user_id)
    return _serialize(state) if state else None


# =========================================================
# 序列化（前端用）
# =========================================================
def _serialize(state):
    return {
        "stage_name": state["stage_name"],
        "stage_id": state["stage_id"],
        "turn": state["turn"],
        "sp": state["sp"],
        "max_sp": state["max_sp"],
        "party": [{k: v for k, v in p.items() if k != "skills"} for p in state["party"]],
        "enemies": state["enemies"],
        "hand": state["hand"],
        "battle_over": state["battle_over"],
        "victory": state["victory"],
        "reward_coins": state["reward_coins"],
    }