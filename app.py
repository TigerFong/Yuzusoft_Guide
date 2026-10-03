# app.py
import os
from flask import Flask, jsonify, send_from_directory
from data import CharacterManager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

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