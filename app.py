# app.py
import os
from flask import Flask, jsonify, send_from_directory, request

from core import (
    BASE_DIR,
    apply_security_headers,
    list_all_characters,
    list_all_guides,
    list_games,
    list_game_characters,
    list_game_guides,
    get_meta,
    get_ranking,
    get_health_info,
    handle_character,
    handle_guide,
    handle_view,
    handle_search,
    handle_matchmaker,
)


app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')


# =========================================================
# 安全標頭（實際套用邏輯在 core.apply_security_headers）
# =========================================================
@app.after_request
def _security_headers(response):
    return apply_security_headers(response)


# =========================================================
# 頁面
# =========================================================
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


# =========================================================
# API：角色
# =========================================================
@app.route('/api/characters')
def api_all_characters():
    return jsonify(list_all_characters())


@app.route('/api/characters/<path:name>')
def api_character(name):
    data, status = handle_character(name)
    return jsonify(data), status


# =========================================================
# API：攻略
# =========================================================
@app.route('/api/guides')
def api_all_guides():
    return jsonify(list_all_guides())


@app.route('/api/guides/<path:name>')
def api_guide(name):
    data, status = handle_guide(name)
    return jsonify(data), status


# =========================================================
# API：瀏覽量
# =========================================================
@app.route('/api/view/<path:name>', methods=['POST'])
def api_view(name):
    data, status = handle_view(
        name,
        xff=request.headers.get('X-Forwarded-For'),
        remote_addr=request.remote_addr,
    )
    return jsonify(data), status


@app.route('/api/ranking')
def api_ranking():
    return jsonify(get_ranking(5))


# =========================================================
# API：遊戲分組
# =========================================================
@app.route('/api/games')
def api_games():
    return jsonify(list_games())


@app.route('/api/games/<path:game>/characters')
def api_game_characters(game):
    return jsonify(list_game_characters(game))


@app.route('/api/games/<path:game>/guides')
def api_game_guides(game):
    return jsonify(list_game_guides(game))


# =========================================================
# API：元數據 / 搜索 / 命運邂逅
# =========================================================
@app.route('/api/meta')
def api_meta():
    return jsonify(get_meta())


@app.route('/api/search')
def api_search():
    return jsonify(handle_search(request.args.to_dict()))


@app.route('/api/matchmaker')
def api_matchmaker():
    return jsonify(handle_matchmaker(request.args.to_dict()))


# =========================================================
# 健康檢查
# =========================================================
@app.route('/health')
def health():
    return jsonify(get_health_info())


# =========================================================
# 啟動
# =========================================================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)