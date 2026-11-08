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


def _replace_first_number(text, new_val):
    if not text:
        return text
    return re.sub(r'\d+', str(new_val), text, count=1)


def _infer_target(desc):
    if not desc: return "single"
    if any(k in desc for k in ("全", "群", "全體", "全隊")): return "aoe"
    return "single"


# ============================================================
# Buff / Debuff 系統
#   buff / debuff 結構：{"key": str, "value": float, "turns": int}
#   turns = -1 表示永久（本場戰鬥內），>0 表示剩餘回合數
# ============================================================
def _add_buff(unit, key, value, turns):
    if "buffs" not in unit:
        unit["buffs"] = []
    for b in unit["buffs"]:
        if b["key"] == key:
            b["value"] = max(b["value"], value)
            if turns == -1 or b["turns"] == -1:
                b["turns"] = -1
            else:
                b["turns"] = max(b["turns"], turns)
            return
    unit["buffs"].append({"key": key, "value": value, "turns": turns})


def _add_debuff(unit, key, value, turns):
    if "debuffs" not in unit:
        unit["debuffs"] = []
    for d in unit["debuffs"]:
        if d["key"] == key:
            d["value"] = max(d["value"], value)
            if turns == -1 or d["turns"] == -1:
                d["turns"] = -1
            else:
                d["turns"] = max(d["turns"], turns)
            return
    unit["debuffs"].append({"key": key, "value": value, "turns": turns})


def _buff_sum(unit, key):
    return sum(b["value"] for b in unit.get("buffs", []) if b["key"] == key)


def _debuff_sum(unit, key):
    return sum(d["value"] for d in unit.get("debuffs", []) if d["key"] == key)


def _has_buff(unit, key):
    return any(b["key"] == key for b in unit.get("buffs", []))


def _remove_buff(unit, key):
    unit["buffs"] = [b for b in unit.get("buffs", []) if b["key"] != key]


def _tick_effects(unit):
    for key in ("buffs", "debuffs"):
        lst = unit.get(key, [])
        for e in lst:
            if e["turns"] > 0:
                e["turns"] -= 1
        unit[key] = [e for e in lst if e["turns"] != 0]


def _party_has(state, name, min_awaken=1):
    for p in state["party"]:
        if p["name"] == name and p["hp"] > 0 and p["awaken"] >= min_awaken:
            return True
    return False


def _alive_party(state):
    return [(i, p) for i, p in enumerate(state["party"]) if p["hp"] > 0]


def _alive_enemies(state):
    return [i for i, e in enumerate(state["enemies"]) if e["hp"] > 0]


# ============================================================
# 加成 / 減傷 集中計算
# ============================================================
def _get_crit_rate(state, owner, card):
    # 基礎暴擊率（克制為 100%，否則為 0，但這裡我們加入裝備/技能的暴擊率）
    base_rate = 1.0 if _is_counter(card["mind"], target_mind) else 0.0
    # 這裡簡化處理，假設只有數值加成
    return 0 

def _calc_damage_bonus(state, owner, target, card):
    """攻擊者的覺醒傷害加成（加法累計）"""
    name = owner["name"]
    awaken = owner["awaken"]
    bonus = 0.0

    if name == "白雪乃愛" and awaken >= 2:
        if target["mind"] in ("戏", "羞"):
            bonus += 0.30

    if name == "蕾娜·列支敦瑙爾" and awaken >= 6:
        if target.get("code") == "senren":
            bonus += 0.25

    # [等价映射] 「哥哥类」→ mind='阳' 敌人
    if name == "谷風天音" and awaken >= 2:
        if target["mind"] == "阳":
            bonus += 0.25

    # [等价映射] 「SSR 稀有度敌人」→ max_hp >= 4000 的精英敌人
    if name == "谷風天音" and awaken >= 6:
        if card["card_type"] == "ultimate" and target["max_hp"] >= 4000:
            bonus += 0.50

    if name == "四季夏目" and awaken >= 2:
        if target["mind"] == "阳":
            bonus += 0.25

    if name == "常陸茉子" and awaken >= 4:
        bonus += 0.15 * owner.get("last_target_stacks", 0)

    if name == "谷風天音" and awaken >= 4:
        bonus += 0.20 * owner.get("last_card_type_stacks", 0)

    # [等价映射] 巡 4 觉「连击伤害 +20%」→ 队友伤害 +10%
    if _party_has(state, "因幡巡", 4) and owner["name"] != "因幡巡":
        bonus += 0.10

    return bonus


def _get_crit_multiplier(state, owner=None):
    mult = 1.5
    if _party_has(state, "四季夏目", 4):
        mult += 0.20
    if _party_has(state, "仮屋和奏", 4):
        mult += 0.10
    # 🌟 新增：吃角色的暴擊傷害 Buff
    if owner:
        mult += _buff_sum(owner, "crit_dmg_up")
    return mult


def _calc_total_damage_reduction(state, victim):
    """受傷減傷（上限 70%）"""
    reduction = _buff_sum(victim, "dmg_reduce")

    if _party_has(state, "椎葉紬", 4):
        reduction += 0.15  # [等价映射] 单体伤害 -15% → 全伤害 -15%
    if _party_has(state, "高楯歐麗葉", 4):
        reduction += 0.15  # [等价映射] 暴击伤害 -30% → 全伤害 -15%
    if _party_has(state, "蕾娜·列支敦瑙爾", 6):
        reduction += 0.15
    if _party_has(state, "墨染希", 4):
        reduction += 0.15  # [等价映射] 持续伤害 -50% → 全伤害 -15%

    if _party_has(state, "馬庭蘆花", 4):
        if len(_alive_enemies(state)) >= 2:
            reduction += 0.20

    if victim["name"] == "椎葉紬" and victim["awaken"] >= 2:
        reduction += 0.10  # [等价映射] 破定位 -20% → 全攻击 -10%

    if victim["name"] == "朝武芳乃" and victim.get("shenle_stacks", 0) > 0:
        reduction += 0.15 * victim["shenle_stacks"]

    return min(reduction, 0.70)


# ============================================================
# 建隊 / 建敵
# ============================================================
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

        awaken_bonus = sum(0.10 for i in (1, 3, 5) if awaken_lvl >= i)
        awaken_multiplier = 1.0 + awaken_bonus
        level_multiplier = 1.0 + ((level - 1) * 0.02)
        total_multiplier = awaken_multiplier * level_multiplier
        max_hp = 1000 + ((level - 1) * 20)

        skills_data = copy.deepcopy(info["skills"])
        for k in ("normal", "skill", "ultimate"):
            sd = skills_data[k]
            if sd["type"] == "buff":
                # 🌟 Buff 卡數值單獨處理：只加成覺醒（1/3/5覺 +10%）
                sd["value"] = int(sd["value"] * awaken_multiplier)
            else:
                sd["value"] = int(sd["value"] * total_multiplier)
            sd["desc"] = _replace_first_number(sd.get("desc", ""), sd["value"])
            if "target" not in sd:
                sd["target"] = _infer_target(sd.get("desc", ""))
            sd["sp_gain"] = _extract_sp_gain(sd.get("desc", ""))

        party.append({
            "name": name, "mind": info["mind"], "rarity": info["rarity"],
            "role": info["role"], "awaken": awaken_lvl, "level": level,
            "skills": skills_data, "hp": max_hp, "max_hp": max_hp,
            "ep": 0, "max_ep": 100, "shield": 0,
            "is_taunting": False, "has_saved": False, "has_killed": False,
            "buffs": [], "debuffs": [],
            "acted_this_turn": False,
            "last_target_index": None, "last_target_stacks": 0,
            "last_card_type": None, "last_card_type_stacks": 0,
            "shenle_stacks": 0,
        })
    return party


def _build_enemies(stage_wave_enemies):
    return [{
        "id": f"w{i}", "name": e["name"], "hp": e["hp"], "max_hp": e["hp"],
        "mind": e["mind"], "toughness": 3, "max_toughness": 3,
        "is_stunned": False, "stun_extra": False,
        "shield": e.get("shield", 0),
        "code": e.get("code", "game"), "index": e.get("index", 1),
        "buffs": [], "debuffs": [],
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

def get_state(user_id):
    state = _battle_states.get(user_id)
    if not state:
        return None, "戰鬥不存在"
    return _serialize(state), None

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
        "waves_data": stage_config["waves"],
        "acted_characters_this_turn": [],
        "xiaoyunque_2_triggered": False,
        "cat_regen_turns": 0,
    }
    state["hand"] = _draw_hand(state, 5)
    _battle_states[user_id] = state
    return state, None


# ============================================================
# 單次攻擊傷害結算（含覺醒與 buff）
# ============================================================
def _process_single_hit(state, owner, target, target_idx, base_dmg, card, events):
    dmg = base_dmg

    bonus = _calc_damage_bonus(state, owner, target, card)
    if bonus != 0:
        dmg = int(dmg * (1 + bonus))

    atk_up = _buff_sum(owner, "atk_up")
    if atk_up != 0:
        dmg = int(dmg * max(0.1, 1 + atk_up))

    crit = _is_counter(card["mind"], target["mind"])
    if crit:
        dmg = int(dmg * _get_crit_multiplier(state, owner))
        events.append({"type": "log", "daily_crit": True})

    if (owner["name"] == "白雪乃愛" and owner["awaken"] >= 6
        and card["card_type"] == "ultimate" and card["target"] == "single"):
        dmg *= 2

    if (owner["name"] == "四季夏目" and owner["awaken"] >= 6
        and card["card_type"] == "ultimate"
        and target["hp"] < target["max_hp"] * 0.3):
        dmg *= 2

    if target["shield"] > 0:
        absorbed = min(target["shield"], dmg)
        target["shield"] -= absorbed
        dmg -= absorbed

    target["hp"] = max(0, target["hp"] - dmg)
    events.append({"type": "damage", "target": target_idx, "value": dmg, "is_crit": crit})

    if target["hp"] > 0 and target["toughness"] > 0:
        loss = 2 if crit else 1
        target["toughness"] = max(0, target["toughness"] - loss)
        if target["toughness"] == 0:
            target["is_stunned"] = True
            if _party_has(state, "戶隱憧子", 4):
                target["stun_extra"] = True
            events.append({"type": "stun", "target": target_idx})

    if (owner["name"] == "白雪乃愛" and owner["awaken"] >= 4
        and target["hp"] <= 0 and not owner.get("has_killed")):
        heal = int(owner["max_hp"] * 0.3)
        owner["hp"] = min(owner["max_hp"], owner["hp"] + heal)
        owner["has_killed"] = True
        _add_buff(owner, "dmg_reduce", 0.5, 1)
        events.append({"type": "heal", "target": state["party"].index(owner), "value": heal})

    if (owner["name"] == "常陸茉子" and owner["awaken"] >= 6
        and crit and target["hp"] > 0):
        extra = int(dmg * 0.5)
        if target["shield"] > 0:
            absorbed = min(target["shield"], extra)
            target["shield"] -= absorbed
            extra -= absorbed
        target["hp"] = max(0, target["hp"] - extra)
        events.append({"type": "damage", "target": target_idx, "value": extra, "is_crit": True})

    if (owner["name"] == "火打谷愛衣" and owner["awaken"] >= 2
        and card["card_type"] == "normal" and target["hp"] > 0
        and random.random() < 0.20):
        extra = int(dmg * 1.0)
        if target["shield"] > 0:
            absorbed = min(target["shield"], extra)
            target["shield"] -= absorbed
            extra -= absorbed
        target["hp"] = max(0, target["hp"] - extra)
        events.append({"type": "damage", "target": target_idx, "value": extra, "is_crit": False})

    return dmg


# ============================================================
# 治療 / 護盾 結算
# ============================================================
def _process_buff(state, owner, card, target_index, events):
    owner_name = owner["name"]
    owner_awaken = owner["awaken"]
    
    # 判斷是全體還是單體
    if card["target"] == "aoe" or card["card_type"] == "ultimate":
        target_list = [i for i, p in enumerate(state["party"]) if p["hp"] > 0]
    else:
        i = target_index if (target_index is not None and 0 <= target_index < len(state["party"])) else state["party"].index(owner)
        target_list = [i] if state["party"][i]["hp"] > 0 else []

    for i in target_list:
        p = state["party"][i]
        
        # 解析卡片描述，決定加什麼 Buff
        desc = card["desc"]
        
        if "攻擊力" in desc:
            val = card["value"] / 100.0  # 🌟 轉回浮點數
            if owner_name == "叢雨" and owner_awaken >= 3: val += 0.05
            if owner_name == "蕾娜·列支敦瑙爾" and owner_awaken >= 3: val += 0.05
            _add_buff(p, "atk_up", val, 2)
            
        if "暴擊傷害" in desc:
            val = card["value"] / 100.0
            if owner_name == "明月栞那" and owner_awaken >= 3: val += 0.05
            _add_buff(p, "crit_dmg_up", val, 2)
            
        if "暴擊率" in desc:
            val = card["value"] / 100.0
            if owner_name == "戶隱憧子" and owner_awaken >= 3: val += 0.05
            _add_buff(p, "crit_rate_up", val, 2)

        if "減傷" in desc:
            _add_buff(p, "dmg_reduce", 0.10, 2)

    # 處理回血 (描述中有恢復)
    if "恢復" in card["desc"] and card["card_type"] == "ultimate":
        heal_val = 200 if "200" in card["desc"] else 150
        for i in target_list:
            p = state["party"][i]
            actual = min(heal_val, p["max_hp"] - p["hp"])
            if actual > 0:
                p["hp"] += actual
                events.append({"type": "heal", "target": i, "value": actual})

    # 處理回 SP (從描述中解析)
    if "回 1 SP" in card["desc"]:
        state["sp"] = min(state["max_sp"], state["sp"] + 1)
        events.append({"type": "sp_gain", "value": 1})
    elif "回 2 SP" in card["desc"]:
        state["sp"] = min(state["max_sp"], state["sp"] + 2)
        events.append({"type": "sp_gain", "value": 2})

    # 特殊處理：憧子的必殺技會眩暈敵人
    if owner_name == "戶隱憧子" and card["card_type"] == "ultimate":
        for idx, t in enumerate(state["enemies"]):
            if t["hp"] > 0:
                t["is_stunned"] = True
                events.append({"type": "stun", "target": idx, "msg": "混亂"})

    # 處理覺醒被動：栞那的必殺技全隊充能
    if owner_name == "明月栞那" and card["card_type"] == "ultimate":
        for i in target_list:
            p = state["party"][i]
            p["ep"] = min(p["max_ep"], p["ep"] + 100)
            
    # 處理覺醒被動：憧子的減益
    if owner_name == "戶隱憧子" and owner_awaken >= 2 and random.random() < 0.20:
        for t in state["enemies"]:
            if t["hp"] > 0:
                _add_debuff(t, "atk_down", 0.15, 2)
        events.append({"type": "log", "msg": "憧子額外干擾了敵人！"})

    events.append({"type": "log", "msg": f"{owner_name} 施放了輔助技能！"})

def _process_heal(state, owner, card, target_index, events):
    owner_name = owner["name"]
    owner_awaken = owner["awaken"]
    owner_idx = state["party"].index(owner)

    if card["target"] == "aoe" or card["card_type"] == "ultimate":
        target_list = [i for i, p in enumerate(state["party"]) if p["hp"] > 0]
    else:
        i = target_index if (target_index is not None and 0 <= target_index < len(state["party"])) else owner_idx
        target_list = [i] if state["party"][i]["hp"] > 0 else []

    heal_base = card["value"]

    for i in target_list:
        p = state["party"][i]
        heal = heal_base

        if owner_name == "鞍馬小春" and owner_awaken >= 2 and p["hp"] < p["max_hp"] * 0.5:
            heal = int(heal * 1.30)

        if owner_name == "百里風實花" and owner_awaken >= 2 and p.get("role") == "破":
            heal = int(heal * 1.30)

        actual = min(heal, p["max_hp"] - p["hp"])
        p["hp"] += actual
        events.append({"type": "heal", "target": i, "value": actual})

        if _party_has(state, "叢雨", 2) and p["name"] != "叢雨":
            for j, cy in enumerate(state["party"]):
                if cy["name"] == "叢雨" and cy["hp"] > 0:
                    cy_heal = int(actual * 0.5)
                    cy_actual = min(cy_heal, cy["max_hp"] - cy["hp"])
                    if cy_actual > 0:
                        cy["hp"] += cy_actual
                        events.append({"type": "heal", "target": j, "value": cy_actual})

        if (owner_name == "鞍馬小春" and owner_awaken >= 4
            and card["target"] == "single" and card["card_type"] != "ultimate"):
            others = [j for j, q in enumerate(state["party"]) if j != i and q["hp"] > 0]
            if others:
                j = others[0]
                q = state["party"][j]
                sub_heal = int(actual * 0.5)
                sub_actual = min(sub_heal, q["max_hp"] - q["hp"])
                if sub_actual > 0:
                    q["hp"] += sub_actual
                    events.append({"type": "heal", "target": j, "value": sub_actual})

        if (owner_name == "墨染希" and owner_awaken >= 2
            and card["target"] == "single" and random.random() < 0.30):
            others = [j for j, q in enumerate(state["party"]) if j != i and q["hp"] > 0]
            if others:
                j = others[0]
                q = state["party"][j]
                sub_actual = min(heal_base, q["max_hp"] - q["hp"])
                if sub_actual > 0:
                    q["hp"] += sub_actual
                    events.append({"type": "heal", "target": j, "value": sub_actual})

        if owner_name == "明月栞那" and owner_awaken >= 4:
            _add_buff(p, "death_immune", 1.0, 2)

        if owner_name == "綾地寧寧" and owner_awaken >= 2 and random.random() < 0.25:
            _add_buff(p, "dmg_reduce", 0.15, 2)

        if owner_name == "汐山涼音" and owner_awaken >= 2 and random.random() < 0.20:
            _add_buff(p, "atk_up", 0.10, 1)

        if owner_name == "小雲雀來海" and owner_awaken >= 4 and card["target"] == "single":
            others = [j for j, q in enumerate(state["party"]) if j != i and q["hp"] > 0]
            if others:
                j = others[0]
                q = state["party"][j]
                sub_heal = int(heal * 0.5)
                sub_actual = min(sub_heal, q["max_hp"] - q["hp"])
                if sub_actual > 0:
                    q["hp"] += sub_actual
                    events.append({"type": "heal", "target": j, "value": sub_actual})

    if card["card_type"] == "ultimate":
        _on_ultimate_heal(state, owner, events)


def _process_shield(state, owner, card, target_index, events):
    owner_name = owner["name"]
    owner_awaken = owner["awaken"]

    if card["target"] == "aoe" or card["card_type"] == "ultimate":
        target_list = [i for i, p in enumerate(state["party"]) if p["hp"] > 0]
    else:
        i = target_index if target_index is not None else state["party"].index(owner)
        target_list = [i] if state["party"][i]["hp"] > 0 else []

    for i in target_list:
        p = state["party"][i]
        p["shield"] += card["value"]
        events.append({"type": "shield", "target": i, "value": card["value"]})

    if owner_name == "朝武芳乃" and owner_awaken >= 6:
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "dmg_reduce", 0.20, 1)
        events.append({"type": "log", "msg": "穗織加护发动！全队减伤 20%"})

    if owner_name == "椎葉紬" and owner_awaken >= 6 and card["card_type"] == "ultimate":
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "dmg_reduce", 0.20, 2)
        events.append({"type": "log", "msg": "紬媽的怀抱庇护全队"})


# ============================================================
# 必殺技額外效果
# ============================================================
def _on_ultimate_heal(state, owner, events):
    name = owner["name"]
    awaken = owner["awaken"]
    if awaken < 6: return

    if name == "鞍馬小春":
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "dmg_reduce", 0.20, 2)
        events.append({"type": "log", "msg": "家的温暖笼罩全队"})

    if name == "百里風實花":
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "atk_up", 0.20, 2)
        events.append({"type": "log", "msg": "成绩提升！全队攻击 +20%"})

    if name == "綾地寧寧":
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "dmg_reduce", 0.20, 2)
        events.append({"type": "log", "msg": "魔女的誓约庇护全队"})

    if name == "墨染希":
        state["cat_regen_turns"] = 3
        events.append({"type": "log", "msg": "神社的猫出现了（3 回合回血）"})

    if name == "明月栞那":
        for p in state["party"]:
            if p["hp"] > 0:
                p["ep"] = min(p["max_ep"], p["ep"] + 100)
                _add_buff(p, "atk_up", 0.30, 1)
        events.append({"type": "log", "msg": "星光的邀约！全队 EP 充满"})

    if name == "汐山涼音":
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "dmg_reduce", 0.25, 2)
                _add_buff(p, "atk_up", -0.10, 2)
        events.append({"type": "log", "msg": "特制甜点拼盘！减伤增但微醉"})

    if name == "叢雨":
        for p in state["party"]:
            if p["hp"] > 0:
                p["ep"] = min(p["max_ep"], p["ep"] + 50)
                _add_buff(p, "dmg_reduce", 0.20, 1)
        events.append({"type": "log", "msg": "叢雨丸的加护！"})


def _on_ultimate_damage(state, owner, events):
    name = owner["name"]
    awaken = owner["awaken"]
    if awaken < 6: return

    if name == "星河輝耶":
        # [等价映射] 偷取增益 → 敌方 -15% 攻击 2 回合
        for t in state["enemies"]:
            if t["hp"] > 0:
                _add_debuff(t, "atk_down", 0.15, 2)
        events.append({"type": "log", "msg": "皇女的恶戏：削弱所有敌人"})

    if name == "因幡巡":
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "atk_up", 0.20, 2)
                p["ep"] = min(p["max_ep"], p["ep"] + 10)
        events.append({"type": "log", "msg": "Ciallo～全队士气高涨"})

    if name == "戶隱憧子":
        for idx, t in enumerate(state["enemies"]):
            if t["hp"] > 0:
                t["is_stunned"] = True
                events.append({"type": "stun", "target": idx, "msg": "混乱"})
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "atk_up", 0.15, 2)
        events.append({"type": "log", "msg": "会长的指导！"})

    if name == "仮屋和奏":
        for p in state["party"]:
            if p["hp"] > 0:
                _add_buff(p, "atk_up", 0.25, 1)
        events.append({"type": "log", "msg": "乐队的羁绊！"})


# ============================================================
# 出牌時，owner 自身的覺醒觸發
# ============================================================
def _on_owner_played(state, events, owner, card, target_index):
    name = owner["name"]
    awaken = owner["awaken"]

    if name == "常陸茉子" and awaken >= 2 and card["card_type"] == "normal":
        if card["target"] == "single" and target_index is not None:
            t = state["enemies"][target_index]
            if t["hp"] > 0 and random.random() < 0.30:
                _add_debuff(t, "atk_down", 0.20, 2)
                events.append({"type": "log", "msg": f"茉子戏弄了 {t['name']}"})

    if name == "蕾娜·列支敦瑙爾" and awaken >= 4:
        if card["action_type"] == "damage" and target_index is not None:
            t = state["enemies"][target_index]
            if t["hp"] > 0 and random.random() < 0.25:
                t["is_stunned"] = True
                events.append({"type": "stun", "target": target_index, "msg": "困惑"})

    if name == "因幡巡" and awaken >= 2:
        if card["action_type"] == "damage" and target_index is not None:
            t = state["enemies"][target_index]
            if t["hp"] > 0 and random.random() < 0.30:
                t["is_stunned"] = True
                events.append({"type": "stun", "target": target_index, "msg": "Ciallo～"})

    if name == "仮屋和奏" and awaken >= 2:
        if card["action_type"] == "damage" and target_index is not None:
            t = state["enemies"][target_index]
            if t["hp"] > 0 and random.random() < 0.25:
                _add_debuff(t, "atk_down", 0.15, 2)

    if name == "戶隱憧子" and awaken >= 2:
        if card["action_type"] in ("heal", "shield"):
            alive = _alive_enemies(state)
            if alive and random.random() < 0.20:
                idx = random.choice(alive)
                _add_debuff(state["enemies"][idx], "atk_down", 0.15, 2)
                events.append({"type": "log", "msg": "憧子暗中干扰了敌人"})

    if card["card_type"] == "ultimate" and card["action_type"] == "damage":
        _on_ultimate_damage(state, owner, events)


# ============================================================
# 出牌主流程
# ============================================================
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
    owner_idx = card["owner_index"]
    if owner["hp"] <= 0: return None, "該角色已倒下"

    if card["action_type"] == "damage":
        if card["target"] == "single":
            if target_index is None or target_index < 0 or target_index >= len(state["enemies"]):
                return None, "請選擇目標"
            if state["enemies"][target_index]["hp"] <= 0:
                return None, "目標已倒下"
        else:
            if not _alive_enemies(state):
                return None, "沒有存活敵人"

    events = []
    state["sp"] -= card["cost"]
    if card["cost"] > 0:
        events.append({"type": "log", "msg": f"消耗 {card['cost']} SP", "daily_sp": card["cost"]})

    if card["card_type"] == "ultimate":
        owner["ep"] = 0
        events.append({"type": "log", "msg": f"{owner['name']} 施放必殺技！", "daily_ult": True})
    else:
        ep_gain = 30
        if _party_has(state, "明月栞那", 2):
            ep_gain = int(ep_gain * 1.15)
        owner["ep"] = min(owner["max_ep"], owner["ep"] + ep_gain)

    # 連續攻擊追蹤
    if owner["name"] == "常陸茉子" and owner["awaken"] >= 4:
        if card["action_type"] == "damage" and card["target"] == "single" and target_index is not None:
            if owner.get("last_target_index") == target_index:
                owner["last_target_stacks"] = min(3, owner.get("last_target_stacks", 0) + 1)
            else:
                owner["last_target_stacks"] = 0
            owner["last_target_index"] = target_index
        else:
            owner["last_target_stacks"] = 0

    if owner["name"] == "谷風天音" and owner["awaken"] >= 4:
        if owner.get("last_card_type") == card["card_type"]:
            owner["last_card_type_stacks"] = min(2, owner.get("last_card_type_stacks", 0) + 1)
        else:
            owner["last_card_type_stacks"] = 0
        owner["last_card_type"] = card["card_type"]

    # 傷害 / 治療 / 護盾
    if card["action_type"] == "damage":
        target_indices = [target_index] if card["target"] == "single" else _alive_enemies(state)

        for idx in target_indices:
            t = state["enemies"][idx]
            if t["hp"] <= 0: continue

            if (owner["name"] == "火打谷愛衣" and owner["awaken"] >= 6
                and card["card_type"] == "ultimate" and card["target"] == "single"):
                for i in range(3):
                    hit_dmg = int(card["value"] * (1 + 0.20 * i))
                    _process_single_hit(state, owner, t, idx, hit_dmg, card, events)
            else:
                _process_single_hit(state, owner, t, idx, card["value"], card, events)

    elif card["action_type"] == "heal":
        _process_heal(state, owner, card, target_index, events)
    elif card["action_type"] == "shield":
        _process_shield(state, owner, card, target_index, events)
    elif card["action_type"] == "buff":
        _process_buff(state, owner, card, target_index, events)

    _on_owner_played(state, events, owner, card, target_index)

    if card.get("sp_gain"):
        before = state["sp"]
        state["sp"] = min(state["max_sp"], state["sp"] + card["sp_gain"])
        if state["sp"] > before:
            events.append({"type": "sp_gain", "value": state["sp"] - before})

    owner["acted_this_turn"] = True
    if owner_idx not in state["acted_characters_this_turn"]:
        state["acted_characters_this_turn"].append(owner_idx)

    # 小雲雀 2 觉：本回合 2 名不同角色出牌时全队 EP +10（一次性）
    if (len(state["acted_characters_this_turn"]) >= 2
        and not state.get("xiaoyunque_2_triggered")
        and _party_has(state, "小雲雀來海", 2)):
        for p in state["party"]:
            if p["hp"] > 0:
                p["ep"] = min(p["max_ep"], p["ep"] + 10)
        state["xiaoyunque_2_triggered"] = True
        events.append({"type": "log", "msg": "多人行动！全队 EP +10"})

    state["hand"].pop(card_index)
    _check_wave_or_over(state, events)
    return {"state": _serialize(state), "events": events}, None


# ============================================================
# 回合開始觸發（每回合被動）
# ============================================================
def _on_new_turn_start(state, events):
    for i, p in enumerate(state["party"]):
        if p["hp"] <= 0: continue
        regen = _buff_sum(p, "regen")
        if regen > 0:
            heal = int(p["max_hp"] * regen)
            actual = min(heal, p["max_hp"] - p["hp"])
            if actual > 0:
                p["hp"] += actual
                events.append({"type": "heal", "target": i, "value": actual})

    if state.get("cat_regen_turns", 0) > 0:
        alive = _alive_party(state)
        if alive:
            j, q = random.choice(alive)
            actual = min(150, q["max_hp"] - q["hp"])
            if actual > 0:
                q["hp"] += actual
                events.append({"type": "heal", "target": j, "value": actual})
        state["cat_regen_turns"] -= 1

    if _party_has(state, "汐山涼音", 4):
        for i, p in enumerate(state["party"]):
            if p["hp"] > 0:
                actual = min(int(p["max_hp"] * 0.03), p["max_hp"] - p["hp"])
                if actual > 0:
                    p["hp"] += actual
                    events.append({"type": "heal", "target": i, "value": actual})

    if _party_has(state, "百里風實花", 4):
        for i, p in enumerate(state["party"]):
            if p["hp"] > 0:
                actual = min(int(p["max_hp"] * 0.03), p["max_hp"] - p["hp"])
                if actual > 0:
                    p["hp"] += actual
                    events.append({"type": "heal", "target": i, "value": actual})

    if _party_has(state, "叢雨", 4):
        for p in state["party"]:
            if p["hp"] > 0:
                p["ep"] = min(p["max_ep"], p["ep"] + 5)

    for p in state["party"]:
        if p["name"] == "小雲雀來海" and p["awaken"] >= 6 and p["hp"] > 0:
            if p["hp"] / p["max_hp"] > 0.80:
                for q in state["party"]:
                    if q["hp"] > 0:
                        q["ep"] = min(q["max_ep"], q["ep"] + 5)
            break

    for p in state["party"]:
        if p["name"] == "蕾娜·列支敦瑙爾" and p["awaken"] >= 2 and p["hp"] > 0:
            alive = _alive_party(state)
            if alive:
                _, q = random.choice(alive)
                if random.random() < 0.5:
                    _add_buff(q, "atk_up", 0.10, 1)
                else:
                    _add_buff(q, "dmg_reduce", 0.10, 1)
            break

    for p in state["party"]:
        if (p["name"] == "馬庭蘆花" and p["awaken"] >= 6 and p["hp"] > 0
            and not p.get("has_coffee_triggered")
            and p["hp"] / p["max_hp"] < 0.50):
            p["has_coffee_triggered"] = True
            for q in state["party"]:
                if q["hp"] > 0:
                    _add_buff(q, "regen", 0.05, -1)
            events.append({"type": "log", "msg": "蘆花特调咖啡！全队每回合恢复 5% HP"})

    for p in state["party"]:
        if (p["name"] == "朝武芳乃" and p["awaken"] >= 6 and p["hp"] > 0
            and not p.get("has_auto_6")
            and p["hp"] / p["max_hp"] < 0.30):
            p["has_auto_6"] = True
            for q in state["party"]:
                if q["hp"] > 0:
                    _add_buff(q, "dmg_reduce", 0.20, 1)
            events.append({"type": "log", "msg": "穗織加护自动触发！"})


# ============================================================
# 敵方行動 / 回合結束
# ============================================================
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
            if enemy.get("stun_extra"):
                enemy["stun_extra"] = False
            else:
                enemy["toughness"] = enemy["max_toughness"]
            events.append({"type": "enemy_recover", "target": i})
            continue

        alive_party = _alive_party(state)
        if not alive_party: break

        taunters = [(j, p) for j, p in alive_party if p.get("is_taunting")]
        j, target = taunters[0] if taunters else random.choice(alive_party)

        dmg = 150
        atk_down = _debuff_sum(enemy, "atk_down")
        if atk_down > 0:
            dmg = int(dmg * max(0.1, 1 - atk_down))

        total_reduction = _calc_total_damage_reduction(state, target)
        dmg = int(dmg * (1 - total_reduction))

        if target["shield"] > 0:
            absorbed = min(target["shield"], dmg)
            target["shield"] -= absorbed
            dmg -= absorbed

        if dmg > 0:
            target["hp"] = max(0, target["hp"] - dmg)
            events.append({"type": "enemy_attack", "enemy": i, "target": j, "value": dmg})

            # 栞那 4 觉：死神眷顾，免疫一次致死
            if target["hp"] <= 0 and _has_buff(target, "death_immune"):
                target["hp"] = 1
                _remove_buff(target, "death_immune")
                events.append({"type": "log", "msg": f"{target['name']} 触发死神眷顾"})

            # 芳乃 4 觉：替队友挡致命一击
            if target["hp"] <= 0 and target["name"] != "朝武芳乃":
                fangnai = next((p for p in state["party"]
                                if p["name"] == "朝武芳乃" and p["hp"] > 0
                                and p["awaken"] >= 4 and not p.get("has_saved")), None)
                if fangnai:
                    fangnai["hp"] = max(1, fangnai["hp"] - dmg)
                    target["hp"] = 1
                    fangnai["has_saved"] = True
                    events.append({"type": "log", "msg": "芳乃挺身替挡！"})

            # 歐麗葉 2 觉：被「戏」心相攻击时反弹 20%
            if target["name"] == "高楯歐麗葉" and target["awaken"] >= 2 and target["hp"] > 0:
                if enemy["mind"] == "戏":
                    reflect = int(dmg * 0.20)
                    enemy["hp"] = max(0, enemy["hp"] - reflect)
                    events.append({"type": "log", "msg": f"歐麗葉反弹 {reflect} 伤害"})

            # 輝耶 4 觉：被攻击时反弹 50%
            if target["name"] == "星河輝耶" and target["awaken"] >= 4 and target["hp"] > 0:
                reflect = int(dmg * 0.50)
                enemy["hp"] = max(0, enemy["hp"] - reflect)
                events.append({"type": "log", "msg": f"輝耶反弹 {reflect} 伤害"})

            # 歐麗葉 6 觉：复活一次
            if (target["hp"] <= 0 and target["name"] == "高楯歐麗葉"
                and target["awaken"] >= 6 and not target.get("has_revived")):
                target["hp"] = int(target["max_hp"] * 0.5)
                target["has_revived"] = True
                for p in state["party"]:
                    if p["hp"] > 0:
                        _add_buff(p, "dmg_reduce", 0.30, 1)
                events.append({"type": "log", "msg": "歐麗葉从死亡边缘归来！"})

            # 芳乃 2 觉：本回合未行动时受击后叠盾
            if target["name"] == "朝武芳乃" and target["awaken"] >= 2 and target["hp"] > 0:
                if not target.get("acted_this_turn"):
                    target["shenle_stacks"] = min(2, target.get("shenle_stacks", 0) + 1)
                    events.append({"type": "log", "msg": f"芳乃获得神乐之盾（{target['shenle_stacks']}层）"})

            # 蘆花 2 觉：攻击者被安抚 -15% 攻击力
            if target["name"] == "馬庭蘆花" and target["awaken"] >= 2:
                _add_debuff(enemy, "atk_down", 0.15, 2)

        target["ep"] = min(target["max_ep"], target["ep"] + 20)

    _check_wave_or_over(state, events)

    if not state["battle_over"]:
        state["turn"] += 1

        # 先 tick 舊 buff
        for p in state["party"]:
            _tick_effects(p)
        for e in state["enemies"]:
            _tick_effects(e)

        state["sp"] = min(state["max_sp"], state["sp"] + 3)
        _on_new_turn_start(state, events)
        state["hand"] = _draw_hand(state, 5)

        for p in state["party"]:
            p["acted_this_turn"] = False
            p["shenle_stacks"] = 0
        state["acted_characters_this_turn"] = []
        state["xiaoyunque_2_triggered"] = False

    return {"state": _serialize(state), "events": events}, None


def _check_wave_or_over(state, events):
    if all(p["hp"] <= 0 for p in state["party"]):
        state["battle_over"] = True
        state["victory"] = False
        return

    if all(e["hp"] <= 0 for e in state["enemies"]):
        if state["current_wave"] < state["total_waves"] - 1:
            # 🌟 加入波次清除事件
            events.append({"type": "wave_clear", "wave": state["current_wave"] + 1})
            
            state["current_wave"] += 1
            state["enemies"] = _build_enemies(state["waves_data"][state["current_wave"]])
            state["sp"] = min(state["max_sp"], state["sp"] + 2)
            events.append({"type": "log", "msg": f"第 {state['current_wave']} 波敵人出現！"})
            
            # 🌟 保留玩家狀態，重置出牌標記，重新抽牌
            for p in state["party"]:
                p["acted_this_turn"] = False 
            state["hand"] = _draw_hand(state, 5)
        else:
            state["battle_over"] = True
            state["victory"] = True


def claim_reward(user_id):
    state = _battle_states.get(user_id)
    if not state or not state["battle_over"] or state["reward_claimed"] or not state["victory"]:
        return None, "無法領取獎勵"
    state["reward_claimed"] = True

    # 綾地寧寧 4 觉：經驗 +20%
    exp_bonus = 0.0
    for p in state["party"]:
        if p["name"] == "綾地寧寧" and p["awaken"] >= 4:
            exp_bonus = 0.20
            break

    result = {
        "reward": state["reward_coins"],
        "stage_id": state["stage_id"],
        "turns": state["turn"],
        "exp_bonus": exp_bonus,
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