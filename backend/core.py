# core.py
import re
from time import time
from collections import defaultdict

from .data import GAME_DATA
from .db import DATABASE_URL, db_pool, view_counts, record_view


# 遊戲代碼映射（用於圖片命名）
GAME_CODES = {
    '千戀＊萬花': 'senren',
    '天使紛擾': 'tenshi',
    '星光咖啡館與死神之蝶': 'cafe',
    '魔女的夜宴': 'sabbat',
}


# =========================================================
# 數據類
# =========================================================
class Character:
    def __init__(self, data_dict):
        self.name = data_dict["name"]
        self.age = data_dict["age"]
        self.gender = data_dict["gender"]
        self.height = data_dict["height"]
        self.body_type = data_dict["body_type"]
        self.personality = data_dict["personality"]
        self.identity = data_dict["identity"]
        self.likes = data_dict["likes"]
        self.dislikes = data_dict["dislikes"]
        self.clothes = data_dict["clothes"]

    def __str__(self):
        return f"【{self.name}】 (年齡:{self.age} | 身高:{self.height} | 身分:{self.identity})"

    def get_info(self, info_type):
        return getattr(self, info_type, None)


class CharacterGuide:
    def __init__(self, character_name, options=None):
        self.character_name = character_name
        self.options = options if options is not None else []

    def get_all_options(self):
        return [option for option in self.options if option.strip()]

    def __str__(self):
        filtered = [o for o in self.options if o.strip()]
        return f"角色：{self.character_name}\n" + "\n".join(
            f"選項{i+1}：{o}" for i, o in enumerate(filtered)
        )


class CharacterManager:
    def __init__(self):
        self.games = {}
        self.characters = {}
        self.guides = {}
        self._load_data()
        self._load_guide_data()

    def _load_data(self):
        for game_name, game_data in GAME_DATA.items():
            self.games[game_name] = {"characters": {}, "guides": {}}
            for item in game_data.get("characters", []):
                char = Character(item)
                self.characters[char.name] = char
                self.games[game_name]["characters"][char.name] = char

    def _load_guide_data(self):
        for game_name, game_data in GAME_DATA.items():
            if game_name not in self.games:
                self.games[game_name] = {"characters": {}, "guides": {}}
            for char_name, options in game_data.get("guides", {}).items():
                guide = CharacterGuide(char_name, options)
                self.guides[char_name] = guide
                self.games[game_name]["guides"][char_name] = guide

    def get_character(self, name):
        return self.characters.get(name)

    def get_guide(self, character_name):
        return self.guides.get(character_name)

    def get_all_names(self):
        return list(self.characters.keys())

    def get_games(self):
        return list(self.games.keys())

    def get_characters_by_game(self, game_name):
        game = self.games.get(game_name)
        return list(game["characters"].keys()) if game else []

    def get_guides_by_game(self, game_name):
        game = self.games.get(game_name)
        return list(game["guides"].keys()) if game else []

    def get_game_of_character(self, name):
        for game_name, game in self.games.items():
            if name in game["characters"]:
                return game_name
        return None


# 單例
manager = CharacterManager()


# =========================================================
# 遊戲元數據（原本寫死在前端的三張表）
# =========================================================
GAME_META = {
    '千戀＊萬花': {
        'code': 'senren',
        'bg': 'picture/bg-senren.jpg',
        'story': 'picture/story-senren.jpg',
        'info': {
            'title': '千戀＊萬花',
            'sub': 'senren banka',
            'desc': '《千戀＊萬花》是柚子社於2016年推出、以和風溫泉小鎮為背景的超人氣美少女遊戲作品，憑藉精緻細膩的畫面、頂級的音樂演出以及極具魅力的角色塑造，在海內外Galgame玩家群體中享有極高的口碑與熱度。',
        },
    },
    '天使紛擾': {
        'code': 'tenshi',
        'bg': 'picture/bg-tenshi.jpg',
        'story': 'picture/story-tenshi.jpg',
        'info': {
            'title': '天使紛擾',
            'sub': 'tenshi souzou',
            'desc': '《天使☆囂嚣 RE-BOOT!》（又譯《天使☆紛擾》）是日本知名美少女遊戲品牌柚子社（YUZUSOFT）於2023年推出的人氣視覺小說作品，延續了該品牌一貫精緻流暢的高畫質作畫、強大的製作陣容與歡樂輕鬆的萌系風格，在推出後同樣於海內外玩家間獲得了極高的熱度與優秀口碑。',
        },
    },
    '星光咖啡館與死神之蝶': {
        'code': 'cafe',
        'bg': 'picture/bg-cafe.jpg',
        'story': 'picture/story-cafe.jpg',
        'info': {
            'title': '星光咖啡館與死神之蝶',
            'sub': 'cafe stella',
            'desc': '《星光咖啡館與死神之蝶》（喫茶ステラと死神の蝶）是日本知名美少女遊戲品牌柚子社（YUZUSOFT）於2019年推出的超人氣視覺小說作品，故事以一間名為「星光咖啡館」的店鋪為舞台，講述了因意外而獲得重啟時間機會的男主角，與自稱死神的少女以及性格各異的女主角們一同經營咖啡館、交織出浪漫且溫馨日常的戀愛故事。',
        },
    },
    '魔女的夜宴': {
        'code': 'sabbat',
        'bg': 'picture/bg-sabbat.jpg',
        'story': 'picture/story-sabbat.jpg',
        'info': {
            'title': '魔女的夜宴',
            'sub': 'sabbat of the witch',
            'desc': '《魔女的夜宴》（サノバウィッチ）是日本知名美少女遊戲品牌柚子社（YUZUSOFT）於2015年推出的超人氣美少女遊戲作品，憑藉著精緻甜美的畫風、歡樂逗趣的日常互動以及極具特色的角色塑造，在海內外Galgame玩家群體中獲得了極高的評價與喜愛。',
        },
    },
}

DEFAULT_INFO = {
    'title': '柚子社攻略站',
    'sub': 'yuzusoft guide',
    'desc': '這個網站--柚子社攻略站(Yuzusoft Guide)是一個非官方粉絲站，專門收錄柚子社（YUZUSOFT）歷代作品的角色資料、劇情簡介與全路線攻略，涵蓋《千戀＊萬花》、《天使紛擾》、《星光咖啡館與死神之蝶》、《魔女的夜宴》等作品。網站提供角色查詢、故事介紹、路線攻略、全站搜索與角色篩選等功能，讓玩家能快速查找所需資訊。所有遊戲名稱、角色人設與相關版權均歸 YUZUSOFT 所有，本站僅供學習與交流使用。',
}

DEFAULT_BG = {
    'image': "url('picture/yuzusoft-logo.jpg')",
    'size': 'cover',
    'color': '#fdfaf3',
}

# =========================================================
# 防刷：IP 限流 + 角色冷卻
# =========================================================
VIEW_COOLDOWN = 600
GLOBAL_LIMIT_PER_MIN = 30
CLEANUP_THRESHOLD = 5000

_view_guard = {}
_ip_rate = defaultdict(list)


def _resolve_ip(xff, remote_addr):
    if xff:
        return xff.split(',')[-1].strip()
    return remote_addr or 'unknown'


def _cleanup_guard(now):
    cutoff = now - VIEW_COOLDOWN
    for k in list(_view_guard.keys()):
        _view_guard[k] = {n: t for n, t in _view_guard[k].items() if t > cutoff}
        if not _view_guard[k]:
            del _view_guard[k]
    for k in list(_ip_rate.keys()):
        _ip_rate[k] = [t for t in _ip_rate[k] if now - t < 60]
        if not _ip_rate[k]:
            del _ip_rate[k]


def check_view_allowed(ip, name):
    now = time()
    hits = _ip_rate[ip]
    hits[:] = [t for t in hits if now - t < 60]
    if len(hits) >= GLOBAL_LIMIT_PER_MIN:
        return False, 'rate_limit'

    per_char = _view_guard.setdefault(ip, {})
    if now - per_char.get(name, 0) < VIEW_COOLDOWN:
        return False, 'cooldown'

    hits.append(now)
    per_char[name] = now

    if len(_view_guard) > CLEANUP_THRESHOLD:
        _cleanup_guard(now)

    return True, 'ok'


# =========================================================
# 安全標頭
# =========================================================
SECURITY_HEADERS = {
    'Content-Security-Policy': (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    ),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '0',
}


def apply_security_headers(response):
    """把 SECURITY_HEADERS 套用到 response（不含 Flask 邏輯）"""
    for k, v in SECURITY_HEADERS.items():
        response.headers[k] = v
    return response


# =========================================================
# 工具函式
# =========================================================
def _character_to_dict(char):
    return {
        'name': char.name,
        'age': char.age,
        'gender': char.gender,
        'height': char.height,
        'body_type': char.body_type,
        'personality': char.personality,
        'identity': char.identity,
        'likes': char.likes,
        'dislikes': char.dislikes,
        'clothes': char.clothes,
    }


def _escape_html(s):
    if s is None:
        return ''
    return (str(s).replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#39;'))


def _highlight(text, keywords):
    if not text:
        return ''
    out = _escape_html(text)
    if not keywords:
        return out
    seen = sorted(set(k for k in keywords if k), key=len, reverse=True)
    for kw in seen:
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        out = pattern.sub(lambda m: f'<mark>{m.group(0)}</mark>', out)
    return out


def get_ranking(limit=5):
    all_names = manager.get_all_names()
    items = [(name, view_counts.get(name, 0)) for name in all_names]
    items.sort(key=lambda x: -x[1])
    items = items[:limit]

    result = []
    for rank, (name, count) in enumerate(items, start=1):
        char = manager.get_character(name)
        if not char:
            continue
        game = manager.get_game_of_character(name) or ''
        chars_in_game = manager.get_characters_by_game(game) if game else []
        idx = chars_in_game.index(name) + 1 if name in chars_in_game else 0
        result.append({
            'rank': rank,
            'name': name,
            'game': game,
            'count': count,
            'code': GAME_CODES.get(game, 'game'),
            'index': idx,
        })
    return result


def get_health_info():
    info = {
        'database_url_set': bool(DATABASE_URL),
        'db_pool_available': db_pool is not None,
        'using_db': False,
        'tracked_ips': len(_view_guard),
        'db_check': None,
    }
    if db_pool:
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*), COALESCE(SUM(count), 0) FROM view_counts")
            distinct_count, total = cur.fetchone()
            cur.close()
            db_pool.putconn(conn)
            info['using_db'] = True
            info['db_check'] = {
                'distinct_characters': distinct_count,
                'total_views': total,
            }
        except Exception as e:
            info['db_check'] = f'ERROR: {e}'
    return info


# =========================================================
# 搜索：簡轉繁 / 拼音 / 同義詞 / 索引 / 評分
# =========================================================
SIMP_TO_TRAD = {
    '丛':'叢','陆':'陸','马':'馬','芦':'蘆','爱':'愛','风':'風','云':'雲',
    '辉':'輝','欧':'歐','丽':'麗','叶':'葉','实':'實','绫':'綾','宁':'寧',
    '䌷':'紬','户':'戶','隐':'隱','凉':'涼','伪':'偽','萝':'蘿','娇':'嬌',
    '丰':'豐','满':'滿','纤':'纖','细':'細','标':'標','准':'準','匀':'勻',
    '称':'稱','岁':'歲','认':'認','温':'溫','开':'開','调':'調','泼':'潑',
    '随':'隨','节':'節','执':'執','变':'變','显':'顯','软':'軟','恋':'戀',
    '后':'後','怀':'懷','关':'關','顾':'顧','体':'體','贴':'貼','强':'強',
    '纯':'純','稳':'穩','织':'織','护':'護','卫':'衛','灵':'靈','转':'轉',
    '学':'學','兰':'蘭','来':'來','镇':'鎮','员':'員','馆':'館','会':'會',
    '长':'長','从':'從','师':'師','职':'職','业':'業','阅':'閱','读':'讀',
    '画':'畫','动':'動','游':'遊','戏':'戲','猫':'貓','绒':'絨','厨':'廚',
    '习':'習','围':'圍','闹':'鬧','扰':'擾','滥':'濫','费':'費','骄':'驕',
    '独':'獨','处':'處','挤':'擠','继':'繼','承':'承','增':'增','加':'加',
    '幽':'幽','鬼':'鬼','怪':'怪','孤':'孤','寞':'寞','恐':'恐','怖':'怖',
    '戳':'戳','破':'破','装':'裝','经':'經','典':'典','忍':'忍','者':'者',
    '神':'神','刀':'刀','点':'點','店':'店','作':'作','使':'使','侍':'侍',
    '死':'死','咖':'咖','啡':'啡','仆':'僕','常':'常','泳':'泳','浴':'浴',
    '衣':'衣','魔':'魔','星':'星','币':'幣','斗':'斗','篷':'篷','粉':'粉',
    '色':'色','荷':'荷','边':'邊','套':'套','袖':'袖','樱':'櫻','恋':'戀',
    '绪':'緒','双':'雙','拧':'擰','纯':'純','叹':'嘆','吓':'嚇','虑':'慮',
    '态':'態','战':'戰','术':'術','构':'構','设':'設','计':'計','质':'質',
    '关':'關','怀':'懷','态':'態','脑':'腦','静':'靜','气':'氣','云':'雲',
    '雾':'霧','声':'聲','调':'調','读':'讀','录':'錄','载':'載','么':'麼',
}

PINYIN_MAP = {
    '朝武芳乃': ['cwfn', 'chaowufangnai'],
    '常陸茉子': ['clmz', 'changlumuozi'],
    '叢雨':     ['cy',   'congyu'],
    '蕾娜·列支敦瑙爾': ['ln', 'leina'],
    '鞍馬小春': ['amxc', 'anmaxiaochun'],
    '馬庭蘆花': ['mtlh', 'matingluhua'],
    '白雪乃愛': ['bxna', 'baixuenai'],
    '谷風天音': ['gfty', 'gufengtianyin'],
    '小雲雀來海': ['xyqlh', 'xiaoyunquelaihai'],
    '星河輝耶': ['xhy', 'xinghehuiye'],
    '高楯歐麗葉': ['gsole', 'gaoshunouliye'],
    '百里風實花': ['blfsh', 'bailifengshihua'],
    '明月栞那': ['mykn', 'mingyuekanna'],
    '四季夏目': ['sjxm', 'sijixiamu'],
    '墨染希':   ['mrx',  'muranxi'],
    '火打谷愛衣': ['hdgay', 'huodaguaiyi'],
    '汐山涼音': ['xsly', 'xishanliangyin'],
    '綾地寧寧': ['ldnn', 'lingdiningning'],
    '因幡巡':   ['yfx',  'yinfanxun'],
    '椎葉紬':   ['zyc',  'zhuiyechou'],
    '戶隱憧子': ['hytz', 'huyintongzi'],
    '仮屋和奏': ['jwhz', 'jiawuhezou'],
}

SYNONYMS = {
    '蘿莉': ['蘿莉', '萝莉', 'loli'],
    '少女': ['少女', 'girl'],
    '御姐': ['御姐', '御姊'],
    '巫女': ['巫女', 'miko'],
    '魔女': ['魔女', 'witch'],
    '死神': ['死神', 'reaper'],
    '學生': ['學生', '学生'],
    '甜食': ['甜食', '甜點', '甜点'],
}

WEIGHT_HIGH, WEIGHT_MID, WEIGHT_LOW = 3, 2, 1
_EXACT, _PREFIX, _SUBSTR, _MAX_SCORE = 60, 40, 20, 100


def simp_to_trad(s):
    if not s:
        return ''
    return ''.join(SIMP_TO_TRAD.get(c, c) for c in str(s))


def _get_pinyin(name):
    return ' '.join(PINYIN_MAP.get(name, []))


def _expand_keyword(kw):
    lower = kw.lower()
    for group in SYNONYMS.values():
        if lower in [g.lower() for g in group]:
            return [g.lower() for g in group]
    return [lower]


def _parse_query(raw):
    if not raw:
        return [], []
    tokens = raw.replace('\u3000', ' ').split()
    include, exclude = [], []
    for t in tokens:
        if t.startswith('-') and len(t) > 1:
            exclude.append(t[1:])
        else:
            include.append(t)
    return include, exclude


def _build_char_fields(char):
    return [
        {'label': '名稱', 'value': char.name, 'weight': WEIGHT_HIGH},
        {'label': '身份', 'value': char.identity, 'weight': WEIGHT_HIGH},
        {'label': '體型', 'value': char.body_type, 'weight': WEIGHT_MID},
        {'label': '性格', 'value': char.personality, 'weight': WEIGHT_MID},
        {'label': '喜好', 'value': ' '.join(char.likes), 'weight': WEIGHT_MID},
        {'label': '討厭', 'value': ' '.join(char.dislikes), 'weight': WEIGHT_MID},
        {'label': '服裝', 'value': ' '.join(char.clothes), 'weight': WEIGHT_MID},
        {'label': '年齡', 'value': char.age, 'weight': WEIGHT_LOW},
        {'label': '身高', 'value': char.height, 'weight': WEIGHT_LOW},
    ]


_search_index = None


def _build_search_index():
    global _search_index
    if _search_index is not None:
        return _search_index

    index = []
    for game in GAME_META.keys():
        code = GAME_CODES[game]
        char_names = manager.get_characters_by_game(game)

        for i, name in enumerate(char_names):
            char = manager.get_character(name)
            if not char:
                continue
            index.append({
                'type': 'character',
                'name': char.name,
                'game': game,
                'code': code,
                'index': i + 1,
                'fields': _build_char_fields(char),
                'pinyin': _get_pinyin(char.name),
            })

        for gname in manager.get_guides_by_game(game):
            guide = manager.get_guide(gname)
            if not guide:
                continue
            char_idx = char_names.index(gname) + 1 if gname in char_names else 0
            for oi, opt in enumerate(guide.options, start=1):
                if not opt or not opt.strip():
                    continue
                index.append({
                    'type': 'guide',
                    'name': gname,
                    'option': opt,
                    'option_index': oi,
                    'game': game,
                    'code': code,
                    'index': char_idx,
                    'fields': [
                        {'label': '攻略選項', 'value': opt, 'weight': WEIGHT_HIGH},
                        {'label': '角色', 'value': gname, 'weight': WEIGHT_MID},
                    ],
                    'pinyin': '',
                })

    _search_index = index
    return index


def _score_item(item, include_groups, exclude_groups):
    fields = list(item['fields'])
    if item.get('pinyin'):
        fields.append({'label': '拼音', 'value': item['pinyin'], 'weight': WEIGHT_MID})

    for group in exclude_groups:
        for f in fields:
            text = (f['value'] or '').lower()
            for kw in group:
                if kw and kw in text:
                    return None

    total = 0
    matched_fields, matched_keywords = [], []

    for group in include_groups:
        primary = group[0]
        hit = False
        for f in fields:
            text = (f['value'] or '').lower()
            if not text:
                continue
            for kw in group:
                if not kw:
                    continue
                if text == kw:
                    total += _EXACT * f['weight']; hit = True
                elif text.startswith(kw):
                    total += _PREFIX * f['weight']; hit = True
                elif kw in text:
                    total += _SUBSTR * f['weight']; hit = True
                else:
                    continue
                if f['label'] not in matched_fields:
                    matched_fields.append(f['label'])
                break
        if not hit:
            return None
        matched_keywords.append(primary)

    return {
        'item': item,
        'score': min(total, _MAX_SCORE),
        'matched_fields': matched_fields,
        'matched_keywords': matched_keywords,
    }


def _suggest(query, index=None, limit=4):
    if not query:
        return []
    if index is None:
        index = _build_search_index()
    q = query.lower()
    words = set()
    for it in index:
        for f in it['fields']:
            v = (f['value'] or '').strip()
            if v and q in v.lower() and len(v) <= 12:
                words.add(v)
    return sorted(words, key=len)[:limit]


def search_all(query, tab='all'):
    """完全在後端跑完搜索，回傳可直接渲染的結構"""
    raw = simp_to_trad((query or '').strip())
    if not raw:
        return {'q': '', 'tab': tab, 'total': 0,
                'counts': {'all': 0, 'character': 0, 'guide': 0},
                'groups': [], 'suggestions': []}

    parsed_include, parsed_exclude = _parse_query(raw.lower())
    if not parsed_include:
        return {'q': raw, 'tab': tab, 'total': 0,
                'counts': {'all': 0, 'character': 0, 'guide': 0},
                'groups': [], 'suggestions': [],
                'error': '請輸入正向關鍵詞'}

    include_groups = [_expand_keyword(k) for k in parsed_include]
    exclude_groups = [_expand_keyword(k) for k in parsed_exclude]

    index = _build_search_index()
    hits = []
    for item in index:
        hit = _score_item(item, include_groups, exclude_groups)
        if hit:
            hits.append(hit)
    hits.sort(key=lambda h: -h['score'])

    counts = {
        'all': len(hits),
        'character': sum(1 for h in hits if h['item']['type'] == 'character'),
        'guide': sum(1 for h in hits if h['item']['type'] == 'guide'),
    }

    filtered = hits
    if tab == 'character':
        filtered = [h for h in hits if h['item']['type'] == 'character']
    elif tab == 'guide':
        filtered = [h for h in hits if h['item']['type'] == 'guide']

    groups = {}
    order = []
    for h in filtered:
        it = h['item']
        g = it['game']
        if g not in groups:
            groups[g] = []
            order.append(g)

        name_html = _highlight(it['name'], parsed_include)
        if it['type'] == 'guide':
            name_html += f' <span class="guide-tag">攻略 {it["option_index"]}</span>'
            sub_html = '· ' + _highlight(it['option'], parsed_include)
        else:
            other = [x for x in h['matched_fields'] if x not in ('名稱', '拼音')]
            sub_html = ('· ' + '、'.join(other)) if other else ''

        groups[g].append({
            'type': it['type'],
            'name': it['name'],
            'game': g,
            'code': it['code'],
            'index': it['index'],
            'name_html': name_html,
            'sub_html': sub_html,
            'score': h['score'],
        })

    return {
        'q': raw,
        'tab': tab,
        'total': len(filtered),
        'counts': counts,
        'groups': [{'game': g, 'items': groups[g]} for g in order],
        'suggestions': _suggest(raw, index),
    }


# =========================================================
# 命運邂逅：分類 + 評分
# =========================================================
_mm_index = None


def _extract_number(s):
    if not s:
        return None
    m = re.search(r'\d+', str(s))
    return int(m.group(0)) if m else None


def _classify_body(s):
    if not s:
        return '其他'
    if re.search(r'蘿莉|萝莉|娇小|嬌小', s):
        return '蘿莉'
    if re.search(r'少女|标准纤细|標準纖細|标准|標準', s):
        return '少女'
    if re.search(r'御姐|丰满|豐滿|高挑|勻稱|匀称', s):
        return '御姐'
    return '其他'


def _classify_age(s):
    if not s:
        return 'unknown'
    if re.search(r'暂无|暫無|外表|成年', s):
        return 'unknown'
    n = _extract_number(s)
    if n is None:
        return 'unknown'
    if n < 20:
        return 'teen'
    if n < 30:
        return 'young'
    return 'old'


def _classify_personality(s):
    if not s:
        return []
    tags = []
    if re.search(r'認真|认真|努力|優等生|责任|負責', s):
        tags.append('認真')
    if re.search(r'溫柔|温柔|体贴|體貼|照顾|照顧|关怀|關懷|母性', s):
        tags.append('溫柔')
    if re.search(r'開朗|开朗|活泼|活力|热情|熱情|元氣', s):
        tags.append('開朗')
    if re.search(r'調皮|调皮|恶作剧|惡作劇|捉弄|玩笑|幽默', s):
        tags.append('調皮')
    if re.search(r'害羞|怕生|靦腆|内向|內向|纯情|純情', s):
        tags.append('害羞')
    if re.search(r'冷靜|冷静|寡言|沉稳|沉穩|理性|成熟', s):
        tags.append('冷靜')
    return tags


def _build_mm_index():
    global _mm_index
    if _mm_index is not None:
        return _mm_index
    index = []
    for game in GAME_META.keys():
        code = GAME_CODES[game]
        for i, name in enumerate(manager.get_characters_by_game(game)):
            char = manager.get_character(name)
            if not char:
                continue
            index.append({
                'name': char.name,
                'game': game,
                'code': code,
                'index': i + 1,
                'height_raw': char.height,
                'height_num': _extract_number(char.height) or 0,
                'body_type': char.body_type,
                'body_cat': _classify_body(char.body_type),
                'age_raw': char.age,
                'age_cat': _classify_age(char.age),
                'personality_raw': char.personality,
                'personality_tags': _classify_personality(char.personality),
            })
    _mm_index = index
    return index


def _score_mm(char, filters):
    score = 0
    max_score = 0
    matched, missed = [], []

    if filters.get('height'):
        W = 20; max_score += W
        h = char['height_num']; hit = False
        for f in filters['height']:
            if f == 'short' and 0 < h < 150: hit = True; break
            if f == 'medium' and 150 <= h < 160: hit = True; break
            if f == 'tall' and h >= 160: hit = True; break
        if hit: score += W; matched.append('身高')
        else: missed.append('身高')

    if filters.get('body'):
        W = 30; max_score += W
        if char['body_cat'] in filters['body']:
            score += W; matched.append(f"體型 {char['body_cat']}")
        else:
            missed.append(f"體型 {char['body_cat']}")

    if filters.get('age'):
        W = 25; max_score += W
        if char['age_cat'] in filters['age']:
            score += W; matched.append('年齡')
        else:
            missed.append('年齡')

    if filters.get('personality'):
        W = 15; max_score += W
        hit = [p for p in filters['personality'] if p in char['personality_tags']]
        if hit:
            score += W * (len(hit) / len(filters['personality']))
            matched.append('性格 ' + '、'.join(hit))
        if len(hit) < len(filters['personality']):
            missed.append('性格')

    pct = round((score / max_score) * 100) if max_score > 0 else 0
    return pct, matched, missed


def matchmaker(filters, threshold=0):
    if not any(filters.get(k) for k in ('height', 'body', 'age', 'personality')):
        return []
    index = _build_mm_index()
    results = []
    for char in index:
        pct, matched, missed = _score_mm(char, filters)
        if pct > 0 and pct >= threshold:
            results.append({
                'name': char['name'],
                'game': char['game'],
                'code': char['code'],
                'index': char['index'],
                'height': char['height_raw'],
                'match_percent': pct,
                'matched': matched,
                'missed': missed,
            })
    results.sort(key=lambda x: -x['match_percent'])
    return results


# =========================================================
# 業務入口（app.py 的薄路由呼叫這些）
# =========================================================
def list_all_characters():
    return manager.get_all_names()


def list_all_guides():
    return list(manager.guides.keys())


def list_games():
    return manager.get_games()


def list_game_characters(game):
    return manager.get_characters_by_game(game)


def list_game_guides(game):
    return manager.get_guides_by_game(game)


def get_meta():
    return {
        'games': GAME_META,
        'default_info': DEFAULT_INFO,
        'default_bg': DEFAULT_BG,
    }


def handle_character(name):
    char = manager.get_character(name)
    if not char:
        return {'error': '角色不存在'}, 404
    return _character_to_dict(char), 200


def handle_guide(name):
    guide = manager.get_guide(name)
    if not guide:
        return {'error': '攻略不存在'}, 404
    return {
        'character_name': guide.character_name,
        'options': guide.get_all_options(),
    }, 200


def handle_view(name, xff=None, remote_addr=None):
    if not manager.get_character(name):
        return {'ok': False, 'error': '角色不存在'}, 404
    ip = _resolve_ip(xff, remote_addr)
    allowed, reason = check_view_allowed(ip, name)
    if not allowed:
        return {'ok': True, 'counted': False, 'reason': reason}, 200
    record_view(name)
    return {'ok': True, 'counted': True}, 200


def handle_search(args):
    q = args.get('q', '')
    tab = args.get('tab', 'all')
    if tab not in ('all', 'character', 'guide'):
        tab = 'all'
    return search_all(q, tab)


def handle_matchmaker(args):
    def _split(key):
        raw = args.get(key, '')
        if not raw:
            return []
        return [x.strip() for x in raw.split(',') if x.strip()]

    filters = {
        'height': _split('height'),
        'body': _split('body'),
        'age': _split('age'),
        'personality': _split('personality'),
    }
    try:
        threshold = int(args.get('threshold', '0'))
    except (ValueError, TypeError):
        threshold = 0

    results = matchmaker(filters, threshold)
    return {
        'filters': filters,
        'threshold': threshold,
        'total': len(results),
        'results': results,
    }


# =========================================================
# 啟動時預建索引
# =========================================================
_build_search_index()
_build_mm_index()