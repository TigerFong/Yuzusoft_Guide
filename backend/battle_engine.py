# 文件：backend/battle_engine.py
import random
import copy
import re
from backend.game_data import GAME_CHARACTERS, MIND_COUNTER

_battle_states = {}
_SP_GAIN_RE = re.compile(r'回\s*(\d+)\s*SP', re.IGNORECASE)

def _extract_sp_gain(desc):
    if not desc: return 0
    m = _SP_GAIN_RE.search(desc)
    return int(m.group(1)) if m else 0

def get_state(user_id):
    state = _battle_states.get(user_id)
    if not state:
        return None, "戰鬥不存在"
    return _serialize(state), None

def _infer_target(desc):
    if not desc: return "single"
    if any(k in desc for k in ("全", "群", "全體", "全隊")): return "aoe"
    return "single"

def _build_party(owned_cards, party_names=None):
    if party_names:
        names = [n for n in party_names[:3] if n in owned_cards and n in GAME_CHARACTERS]
    else:
        names = [n for n in list(owned_cards.keys())[:3] if n in GAME_CHARACTERS]

    party = []
    for name in names:
        info = GAME_CHARACTERS[name]
        card_data = owned_cards[name]
        awaken_lvl = card_data.get("awaken", 0)
        level = card_data.get("level", 1)
        
        awaken_multiplier = 1.0 + (awaken_lvl * 0.10)
        level_multiplier = 1.0 + ((level - 1) * 0.02)
        total_multiplier = awaken_multiplier * level_multiplier
        max_hp = 1000 + ((level - 1) * 20)

        skills_data = copy.deepcopy(info["skills"])
        for k in ("normal", "skill", "ultimate"):
            sd = skills_data[k]
            sd["value"] = int(sd["value"] * total_multiplier)
            if "target" not in sd: sd["target"] = _infer_target(sd.get("desc", ""))
            sd["sp_gain"] = _extract_sp_gain(sd.get("desc", ""))

        party.append({
            "name": name, "mind": info["mind"], "rarity": info["rarity"],
            "role": info["role"], "awaken": awaken_lvl, "level": level,
            "skills": skills_data, "hp": max_hp, "max_hp": max_hp, 
            "ep": 0, "max_ep": 100, "shield": 0, 
            "is_taunting": False, "has_saved": False, "has_killed": False
        })
    return party

def _build_enemies(stage_wave_enemies):
    return [{
        "id": f"w{i}", "name": e["name"], "hp": e["hp"], "max_hp": e["hp"],
        "mind": e["mind"], "toughness": 3, "max_toughness": 3,
        "is_stunned": False, "shield": e.get("shield", 0),
        "code": e.get("code", "game"), "index": e.get("index", 1),
    } for i, e in enumerate(stage_wave_enemies)]

def _draw_hand(state, count=5):
    hand = []
    alive = [p for p in state["party"] if p["hp"] > 0]
    if not alive: return hand
    ult_drawn = set()

    for _ in range(count):
        char = random.choice(alive)
        skills = char["skills"]
        owner_idx = state["party"].index(char)

        if char["ep"] >= char["max_ep"] and owner_idx not in ult_drawn:
            card_type, sdata = "ultimate", skills["ultimate"]
            ult_drawn.add(owner_idx)
        else:
            card_type = "skill" if random.random() < 0.4 else "normal"
            sdata = skills[card_type]

        hand.append({
            "owner_index": owner_idx, "name": char["name"], "title": sdata["name"],
            "cost": sdata["cost"], "mind": char["mind"], "desc": sdata["desc"],
            "action_type": sdata["type"], "value": sdata["value"],
            "target": sdata["target"], "sp_gain": sdata.get("sp_gain", 0),
            "card_type": card_type,
        })
    return hand

def _is_counter(my_mind, enemy_mind):
    return MIND_COUNTER.get(my_mind) == enemy_mind

def create_battle(user_id, stage_id, stage_config, owned_cards, party_names=None):
    party = _build_party(owned_cards, party_names)
    if not party: return None, "你沒有有效的出戰角色！"

    state = {
        "user_id": user_id, "stage_id": stage_id, "stage_name": stage_config["name"],
        "turn": 1, "sp": 3, "max_sp": 10, "party": party,
        "current_wave": 0, "total_waves": len(stage_config["waves"]),
        "enemies": _build_enemies(stage_config["waves"][0]),
        "battle_over": False, "victory": False, "reward_claimed": False,
        "reward_coins": stage_config["reward_coins"], "log": [],
        "waves_data": stage_config["waves"]
    }
    state["hand"] = _draw_hand(state, 5)
    _battle_states[user_id] = state
    return state, None

def play_card(user_id, card_index, target_index=None):
    state = _battle_states.get(user_id)
    if not state: return None, "戰鬥不存在"
    if state["battle_over"]: return None, "戰鬥已結束"

    try:
        card_index = int(card_index)
        if target_index is not None: target_index = int(target_index)
    except: return None, "無效參數"

    hand = state["hand"]
    if card_index < 0 or card_index >= len(hand): return None, "無效卡牌"

    card = hand[card_index]
    if card["cost"] > state["sp"]: return None, "SP 不足"

    owner = state["party"][card["owner_index"]]
    if owner["hp"] <= 0: return None, "該角色已倒下"

    # ===== 先驗證傷害卡目標（避免白白消耗資源）=====
    if card["action_type"] == "damage":
        if card["target"] == "single":
            if target_index is None or target_index < 0 or target_index >= len(state["enemies"]):
                return None, "請選擇目標"
            if state["enemies"][target_index]["hp"] <= 0:
                return None, "目標已倒下"
        else:
            if not any(e["hp"] > 0 for e in state["enemies"]):
                return None, "沒有存活敵人"

    # ===== 驗證通過，扣除資源 =====
    events = []
    state["sp"] -= card["cost"]

    if card["cost"] > 0: 
        events.append({"type": "log", "msg": f"消耗 {card['cost']} SP", "daily_sp": card["cost"]})

    if card["card_type"] == "ultimate":
        owner["ep"] = 0
        events.append({"type": "log", "msg": f"{owner['name']} 施放必殺技！", "daily_ult": True})
    else:
        owner["ep"] = min(owner["max_ep"], owner["ep"] + 30)

    if card["action_type"] == "damage":
        if card["target"] == "single":
            targets = [target_index]
        else:
            targets = [i for i, e in enumerate(state["enemies"]) if e["hp"] > 0]

        for idx in targets:
            t = state["enemies"][idx]
            if t["hp"] <= 0: continue
            dmg = card["value"]

            if owner["name"] == "白雪乃愛" and card["card_type"] == "ultimate":
                if len(targets) == 1 and owner["awaken"] >= 6:
                    dmg *= 2

            crit = _is_counter(card["mind"], t["mind"])
            if crit:
                dmg = int(dmg * 1.5)
                events.append({"type": "log", "daily_crit": True})

            if owner["name"] == "白雪乃愛" and owner["awaken"] >= 2:
                if t["mind"] in ("戏", "羞"): dmg = int(dmg * 1.3)

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

            if owner["name"] == "白雪乃愛" and t["hp"] <= 0 and owner["awaken"] >= 4 and not owner.get("has_killed"):
                owner["hp"] = min(owner["max_hp"], owner["hp"] + int(owner["max_hp"] * 0.3))
                owner["has_killed"] = True
                events.append({"type": "heal", "target": card["owner_index"], "value": int(owner["max_hp"] * 0.3)})

    elif card["action_type"] == "heal":
        if card["target"] == "aoe" or card["card_type"] == "ultimate":
            for i, p in enumerate(state["party"]):
                if p["hp"] <= 0: continue
                healed = min(card["value"], p["max_hp"] - p["hp"])
                p["hp"] += healed
                events.append({"type": "heal", "target": i, "value": healed})
        else:
            i = target_index if target_index is not None and 0 <= target_index < len(state["party"]) else next((j for j,p in enumerate(state["party"]) if p["hp"]>0), 0)
            p = state["party"][i]
            if p["hp"] > 0:
                healed = min(card["value"], p["max_hp"] - p["hp"])
                p["hp"] += healed
                events.append({"type": "heal", "target": i, "value": healed})

    elif card["action_type"] == "shield":
        if card["target"] == "aoe" or card["card_type"] == "ultimate":
            for i, p in enumerate(state["party"]):
                if p["hp"] <= 0: continue
                p["shield"] += card["value"]
                events.append({"type": "shield", "target": i, "value": card["value"]})
        else:
            i = target_index if target_index is not None else card["owner_index"]
            p = state["party"][i]
            if p["hp"] > 0:
                p["shield"] += card["value"]
                events.append({"type": "shield", "target": i, "value": card["value"]})

    if owner["name"] == "朝武芳乃" and card["card_type"] == "skill" and owner["awaken"] >= 2:
        owner["is_taunting"] = True

    if card.get("sp_gain"):
        before = state["sp"]
        state["sp"] = min(state["max_sp"], state["sp"] + card["sp_gain"])
        if state["sp"] > before: events.append({"type": "sp_gain", "value": state["sp"] - before})

    state["hand"].pop(card_index)
    _check_wave_or_over(state, events)
    return {"state": _serialize(state), "events": events}, None

def end_turn(user_id):
    state = _battle_states.get(user_id)
    if not state or state["battle_over"]: return None, "無法結束回合"

    events = []
    for p in state["party"]:
        if p.get("is_taunting"): p["is_taunting"] = False

    for i, enemy in enumerate(state["enemies"]):
        if enemy["hp"] <= 0: continue
        if enemy["is_stunned"]:
            enemy["is_stunned"] = False
            enemy["toughness"] = enemy["max_toughness"]
            events.append({"type": "enemy_recover", "target": i})
            continue

        alive_party = [(j, p) for j, p in enumerate(state["party"]) if p["hp"] > 0]
        if not alive_party: break

        taunters = [(j, p) for j, p in alive_party if p.get("is_taunting")]
        j, target = taunters[0] if taunters else random.choice(alive_party)

        dmg = 150
        if target["name"] == "朝武芳乃" and target["awaken"] >= 2: dmg = int(dmg * 0.85)

        if target["shield"] > 0:
            absorbed = min(target["shield"], dmg)
            target["shield"] -= absorbed
            dmg -= absorbed

        if dmg > 0:
            target["hp"] = max(0, target["hp"] - dmg)
            events.append({"type": "enemy_attack", "enemy": i, "target": j, "value": dmg})

            # 芳乃 4 覺：隊友受致命傷害時，芳乃插入替擋
            if target["hp"] <= 0 and target["name"] != "朝武芳乃":
                fangnai = next(
                    (p for p in state["party"]
                     if p["name"] == "朝武芳乃" and p["hp"] > 0 and p["awaken"] >= 4),
                    None,
                )
                if fangnai:
                    fangnai["hp"] = max(1, fangnai["hp"] - dmg)
                    target["hp"] = 1

        target["ep"] = min(target["max_ep"], target["ep"] + 20)

    _check_wave_or_over(state, events)

    if not state["battle_over"]:
        state["turn"] += 1
        state["sp"] = min(state["max_sp"], state["sp"] + 3)
        state["hand"] = _draw_hand(state, 5)

    return {"state": _serialize(state), "events": events}, None

def _check_wave_or_over(state, events):
    if all(p["hp"] <= 0 for p in state["party"]):
        state["battle_over"] = True
        state["victory"] = False
        return

    if all(e["hp"] <= 0 for e in state["enemies"]):
        if state["current_wave"] < state["total_waves"] - 1:
            state["current_wave"] += 1
            state["enemies"] = _build_enemies(state["waves_data"][state["current_wave"]])
            state["sp"] = min(state["max_sp"], state["sp"] + 2)
            events.append({"type": "log", "msg": f"第 {state['current_wave']} 波敵人出現！"})
            
            # 🌟 修復：進入新波次時，自動重新抽滿 5 張手牌！
            # 否則玩家會拿著打光/打殘的舊手牌面對新敵人
            state["hand"] = _draw_hand(state, 5)
        else:
            state["battle_over"] = True
            state["victory"] = True

def claim_reward(user_id):
    state = _battle_states.get(user_id)
    if not state or not state["battle_over"] or state["reward_claimed"] or not state["victory"]:
        return None, "無法領取獎勵"
    state["reward_claimed"] = True
    result = {
        "reward": state["reward_coins"],
        "stage_id": state["stage_id"],
        "turns": state["turn"],
    }
    del _battle_states[user_id]
    return result, None

def _serialize(state):
    return {
        "stage_name": state["stage_name"], "stage_id": state["stage_id"],
        "turn": state["turn"], "sp": state["sp"], "max_sp": state["max_sp"],
        "wave": state["current_wave"] + 1, "total_waves": state["total_waves"],
        "party": [{k: v for k, v in p.items() if k != "skills"} for p in state["party"]],
        "enemies": state["enemies"], "hand": state["hand"],
        "battle_over": state["battle_over"], "victory": state["victory"],
        "reward_coins": state["reward_coins"],
    }