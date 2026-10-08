# app.py
import os
from flask import Flask, jsonify, send_from_directory
from data import CharacterManager
import json
from collections import OrderedDict


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 游戏代码映射
GAME_CODES = {
    '千戀＊萬花': 'senren',
    '天使紛擾': 'tenshi',
    '星光咖啡館與死神之蝶': 'cafe',
    '魔女的夜宴': 'sabbat'
}

VIEW_COUNT_FILE = os.path.join(BASE_DIR, 'view_counts.json')

def load_view_counts():
    if os.path.exists(VIEW_COUNT_FILE):
        try:
            with open(VIEW_COUNT_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print('載入瀏覽量失敗:', e)
    return {}

def save_view_counts():
    try:
        with open(VIEW_COUNT_FILE, 'w', encoding='utf-8') as f:
            json.dump(view_counts, f, ensure_ascii=False)
    except Exception as e:
        print('保存瀏覽量失敗:', e)

view_counts = load_view_counts()

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
manager = CharacterManager()


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


# ---------- 頁面 ----------
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


# ---------- API：角色 ----------
@app.route('/api/characters')
def api_all_characters():
    return jsonify(manager.get_all_names())


@app.route('/api/characters/<path:name>')
def api_character(name):
    char = manager.get_character(name)
    if not char:
        return jsonify({'error': '角色不存在'}), 404
    return jsonify(_character_to_dict(char))


# ---------- API：攻略 ----------
@app.route('/api/guides')
def api_all_guides():
    return jsonify(list(manager.guides.keys()))


@app.route('/api/guides/<path:name>')
def api_guide(name):
    guide = manager.get_guide(name)
    if not guide:
        return jsonify({'error': '攻略不存在'}), 404
    return jsonify({
        'character_name': guide.character_name,
        'options': guide.get_all_options()
    })

# ---------- API：瀏覽量 ----------
@app.route('/api/view/<path:name>', methods=['POST'])
def api_view(name):
    """記錄一次瀏覽"""
    if manager.get_character(name):
        view_counts[name] = view_counts.get(name, 0) + 1
        save_view_counts()
    return jsonify({'ok': True})


@app.route('/api/ranking')
def api_ranking():
    """返回全部角色的瀏覽量排行"""
    result = []

    # 遍历所有角色（包括 0 次的）
    all_names = manager.get_all_names()
    items = [(name, view_counts.get(name, 0)) for name in all_names]

    # 按浏览量降序
    items.sort(key=lambda x: -x[1])

    # 只取前 5 名
    items = items[:5]

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

    return jsonify(result)

# ---------- API：遊戲分組 ----------
@app.route('/api/games')
def api_games():
    return jsonify(manager.get_games())


@app.route('/api/games/<path:game>/characters')
def api_game_characters(game):
    return jsonify(manager.get_characters_by_game(game))


@app.route('/api/games/<path:game>/guides')
def api_game_guides(game):
    return jsonify(manager.get_guides_by_game(game))


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)