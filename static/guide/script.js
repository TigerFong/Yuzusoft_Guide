// script.js
let currentGame = null;
let META = null;

// ===== 立即開始載入 meta（不依賴 DOM）=====
const _metaPromise = fetch('/api/meta')
    .then(r => r.json())
    .then(data => {
        META = data;
        window.GAME_CODES = Object.fromEntries(
            Object.entries(META.games).map(([g, m]) => [g, m.code])
        );
        window.DEFAULT_INFO = META.default_info;
        window.DEFAULT_BG = {
            ...META.default_bg,
            image: META.default_bg.image.replace("url('", "url('/static/").replace('url("', 'url("/static/'),
        };

        // 首屏文案（以防 HTML 老文案與 meta 不一致）
        const titleEl = document.getElementById('homeTitle');
        const subEl = document.getElementById('homeSub');
        const descEl = document.getElementById('homeDesc');
        if (titleEl) titleEl.textContent = META.default_info.title;
        if (subEl) subEl.textContent = META.default_info.sub;
        if (descEl) descEl.textContent = META.default_info.desc;
        return META;
    })
    .catch(e => {
        console.error('載入 meta 失敗', e);
        return null;
    });

function whenMetaReady() {
    return _metaPromise;
}


// =========================================================
// 工具函式
// =========================================================
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function escapeAttr(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`=\/\r\n]/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
        "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
        '\r': '&#13;', '\n': '&#10;'
    }[c]));
}

function safeInt(n, fallback = 0) {
    const v = parseInt(n, 10);
    return Number.isFinite(v) ? v : fallback;
}


// =========================================================
// 選單
// =========================================================
function hideGuideTip() {
    const tip = document.getElementById('guideTip');
    if (tip && !tip.classList.contains('hide')) {
        tip.classList.add('hide');
    }
}

function openMenu() {
    hideGuideTip();
    document.getElementById('sideMenu').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

function closeMenu() {
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}


// =========================================================
// 背景
// =========================================================
function setBackground(image, size, color) {
    const root = document.documentElement;
    root.style.setProperty('--bg-image', image);
    root.style.setProperty('--bg-size', size);
    root.style.setProperty('--bg-color', color);
}


// =========================================================
// 選擇 / 取消遊戲
// =========================================================
let switchGameCount = 0;
let switchGameTimer = null;

async function selectGame(gameName) {
    await whenMetaReady();
    currentGame = gameName;

    // 彩蛋 5：連點 5 次
    switchGameCount++;
    clearTimeout(switchGameTimer);
    switchGameTimer = setTimeout(() => { switchGameCount = 0; }, 8000);
    if (switchGameCount === 5) {
        showEasterToast('🤔 你是在猶豫嗎？', '每部作品都很棒，慢慢選吧～');
        switchGameCount = 0;
    }

    document.querySelectorAll('#gameList a').forEach(a => {
        a.classList.toggle('active', a.dataset.game === gameName);
    });

    ['character', 'story', 'guide'].forEach(f => {
        const el = document.querySelector(`#featureList a[href="#${f}"]`);
        if (el) el.classList.remove('disabled');
    });

    const meta = META.games[gameName];
    if (meta?.bg) {
        setBackground(`url('/static/${meta.bg}')`, 'cover', '#1a0e05');
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('bg-fade');
            void sec.offsetWidth;
            sec.classList.add('bg-fade');
            setTimeout(() => sec.classList.remove('bg-fade'), 700);
        });
    }
    updateHomeContent(gameName, true);
    updateStoryContent(gameName);
    document.body.classList.add('has-game');

    closeMenu();

    await Promise.all([
        renderCharacters(gameName),
        renderGuides(gameName)
    ]);
}

async function clearGame() {
    currentGame = null;

    document.querySelectorAll('#gameList a').forEach(a => {
        a.classList.remove('active');
    });
    document.querySelectorAll('#featureList a.game-feature').forEach(a => {
        a.classList.add('disabled');
    });
    document.body.classList.remove('has-game');

    await whenMetaReady();
    setBackground(DEFAULT_BG.image, DEFAULT_BG.size, DEFAULT_BG.color);

    updateHomeContent(null, true);
    updateStoryContent(null);
    renderCharacters(null);

    scrollToSection('home');
    closeMenu();
}


// =========================================================
// 滾動
// =========================================================
function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const featureLink = document.querySelector(`#featureList a[href="#${sectionId}"]`);
    if (featureLink && featureLink.classList.contains('disabled')) return;

    closeMenu();

    const topbarHeight = document.querySelector('.topbar-inner').offsetHeight + 30;
    const targetY = target.getBoundingClientRect().top + window.scrollY - topbarHeight;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
}

function updateActiveSection() {
    const sections = document.querySelectorAll('.section');
    const topbarHeight = document.querySelector('.topbar-inner').offsetHeight + 40;
    let currentId = 'home';

    sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= topbarHeight + 10) {
            currentId = sec.id;
        }
    });

    document.querySelectorAll('#featureList a').forEach(a => {
        const href = a.getAttribute('href');
        a.classList.toggle('active', href === '#' + currentId);
    });
}

window.addEventListener('scroll', updateActiveSection, { passive: true });

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
});


// =========================================================
// 首頁 / 故事
// =========================================================
function updateStoryContent(gameName) {
    const imgEl = document.getElementById('storyImage');
    const placeholderEl = document.getElementById('storyPlaceholder');
    if (!imgEl || !placeholderEl) return;

    const imgSrc = gameName && META ? META.games[gameName]?.story : null;

    if (imgSrc) {
        imgEl.src = '/static/' + imgSrc;
        imgEl.classList.add('show');
        placeholderEl.classList.add('hide');
    } else {
        imgEl.removeAttribute('src');
        imgEl.classList.remove('show');
        placeholderEl.classList.remove('hide');
    }
}

function updateHomeContent(gameName, animate = false) {
    if (!META) return;
    const titleEl = document.getElementById('homeTitle');
    const subEl = document.getElementById('homeSub');
    const descEl = document.getElementById('homeDesc');

    const info = (gameName && META.games[gameName]?.info) || META.default_info;
    titleEl.textContent = info.title;
    subEl.textContent = info.sub;

    if (animate && !shouldSkipTyping()) {
        typewriterText(descEl, info.desc);
    } else {
        if (typewriterTimer) {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
        }
        descEl.classList.remove('typing');
        descEl.classList.add('done');
        descEl.textContent = info.desc;
    }
}


// =========================================================
// 打字機
// =========================================================
let typewriterTimer = null;
let typewriterEl = null;
let typewriterFullText = '';
let typewriterDone = true;

function typewriterText(el, text, speed = 30) {
    if (typewriterTimer) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }
    typewriterEl = el;
    typewriterFullText = text;
    typewriterDone = false;

    el.textContent = '';
    el.classList.add('typing');
    el.classList.remove('done');
    el.style.cursor = 'pointer';

    let i = 0;
    typewriterTimer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } else {
            finishTypewriter();
        }
    }, speed);
}

function finishTypewriter() {
    if (typewriterTimer) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }
    if (typewriterEl) {
        typewriterEl.textContent = typewriterFullText;
        typewriterEl.classList.remove('typing');
        typewriterEl.classList.add('done');
        typewriterEl.style.cursor = '';
    }
    typewriterDone = true;
}

function skipTypewriter() {
    if (!typewriterDone) finishTypewriter();
}

function shouldSkipTyping() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

setTimeout(hideGuideTip, 8000);


// =========================================================
// 角色介紹
// =========================================================
const charIndexCache = {};

async function getCharIndexMap(gameName) {
    if (charIndexCache[gameName]) return charIndexCache[gameName];
    try {
        const res = await fetch(`/api/games/${encodeURIComponent(gameName)}/characters`);
        if (res.ok) {
            const names = await res.json();
            const map = {};
            names.forEach((n, i) => map[n] = i + 1);
            charIndexCache[gameName] = map;
            return map;
        }
    } catch (e) {
        console.error('讀取角色索引失敗:', e);
    }
    return {};
}

async function renderCharacters(gameName) {
    const navEl = document.getElementById('charNav');
    const portraitEl = document.getElementById('charPortrait');
    const nameEl = document.getElementById('charName');
    const cvEl = document.getElementById('charCv');
    const descEl = document.getElementById('charDesc');

    navEl.innerHTML = '';

    if (!gameName) {
        portraitEl.style.backgroundImage = '';
        nameEl.textContent = '';
        cvEl.textContent = '';
        descEl.innerHTML = '';
        return;
    }

    let names = [];
    try {
        const res = await fetch(`/api/games/${encodeURIComponent(gameName)}/characters`);
        if (res.ok) names = await res.json();
    } catch (e) {
        console.error('讀取角色列表失敗:', e);
    }

    if (names.length === 0) {
        descEl.innerHTML = '<p class="placeholder-text">無法載入角色資料。</p>';
        return;
    }

    const chars = await Promise.all(names.map(async (name) => {
        try {
            const res = await fetch(`/api/characters/${encodeURIComponent(name)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.error('讀取角色失敗:', name, e);
        }
        return { name };
    }));

    const code = (META?.games[gameName]?.code) || 'game';

    chars.forEach((char, index) => {
        const item = document.createElement('div');
        item.className = 'char-nav-item' + (index === 0 ? ' active' : '');

        const thumb = document.createElement('div');
        thumb.className = 'char-nav-thumb';
        thumb.style.backgroundImage = `url('/static/picture/thumb-${code}-${index + 1}.png')`;

        const label = document.createElement('div');
        label.className = 'char-nav-label';
        label.textContent = char.name;

        item.appendChild(thumb);
        item.appendChild(label);
        item.addEventListener('click', () => selectCharacter(chars, index, code));
        navEl.appendChild(item);
    });

    selectCharacter(chars, 0, code, false);
}

function selectCharacter(chars, index, code, trackView = true) {
    const char = chars[index];
    const portraitEl = document.getElementById('charPortrait');
    const nameEl = document.getElementById('charName');
    const cvEl = document.getElementById('charCv');
    const descEl = document.getElementById('charDesc');

    document.querySelectorAll('#charNav .char-nav-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    portraitEl.style.backgroundImage = `url('/static/picture/char-${code}-${index + 1}.png')`;

    nameEl.textContent = char.name;

    if (trackView && char.name && !hasViewedRecently(char.name)) {
        markViewed(char.name);
        fetch(`/api/view/${encodeURIComponent(char.name)}`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.counted) refreshRanking();
            })
            .catch(() => {});
    }
    cvEl.textContent = char.cv ? 'CV：' + char.cv : '';

    const rows = [
        ['年齡', char.age],
        ['身高', char.height],
        ['體型', char.body_type],
        ['身份', char.identity],
        ['性格', char.personality],
        ['喜好', Array.isArray(char.likes) ? char.likes.join('、') : char.likes],
        ['討厭', Array.isArray(char.dislikes) ? char.dislikes.join('、') : char.dislikes],
        ['服裝', Array.isArray(char.clothes) ? char.clothes.join('、') : char.clothes]
    ];

    let html = '';
    rows.forEach(([key, val]) => {
        if (val && val !== '暫無明確設定' && val !== '暂无明确设定') {
            html += `<div class="row"><div class="key">${escapeHtml(key)}</div><div class="val">${escapeHtml(String(val))}</div></div>`;
        }
    });
    descEl.innerHTML = html || '<p class="placeholder-text">暫無資料。</p>';

    injectFavButton(char, code, index);
    triggerPortraitSwitch(portraitEl);
}


// =========================================================
// 攻略
// =========================================================
async function renderGuides(gameName) {
    const navEl = document.getElementById('guideNav');
    const portraitEl = document.getElementById('guidePortrait');
    const nameEl = document.getElementById('guideName');
    const routeEl = document.getElementById('guideRoute');
    const optionsEl = document.getElementById('guideOptions');

    navEl.innerHTML = '';

    if (!gameName) {
        portraitEl.style.backgroundImage = '';
        nameEl.textContent = '';
        routeEl.textContent = '';
        optionsEl.innerHTML = '';
        return;
    }

    let guideNames = [];
    try {
        const res = await fetch(`/api/games/${encodeURIComponent(gameName)}/guides`);
        if (res.ok) guideNames = await res.json();
    } catch (e) {
        console.error('讀取攻略列表失敗:', e);
    }

    if (guideNames.length === 0) {
        optionsEl.innerHTML = '<p class="placeholder-text">暫無攻略資料。</p>';
        return;
    }

    const map = await getCharIndexMap(gameName);

    const guides = await Promise.all(guideNames.map(async (name) => {
        try {
            const res = await fetch(`/api/guides/${encodeURIComponent(name)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.error('讀取攻略失敗:', name, e);
        }
        return { character_name: name, options: [] };
    }));

    const code = (META?.games[gameName]?.code) || 'game';

    guides.forEach((guide, index) => {
        const item = document.createElement('div');
        item.className = 'char-nav-item' + (index === 0 ? ' active' : '');

        const thumb = document.createElement('div');
        thumb.className = 'char-nav-thumb';
        const n = map[guide.character_name];
        if (n) thumb.style.backgroundImage = `url('/static/picture/thumb-${code}-${n}.png')`;

        const label = document.createElement('div');
        label.className = 'char-nav-label';
        label.textContent = guide.character_name;

        item.appendChild(thumb);
        item.appendChild(label);
        item.addEventListener('click', () => selectGuide(guides, index, code, map));
        navEl.appendChild(item);
    });

    selectGuide(guides, 0, code, map);
}

function selectGuide(guides, index, code, map) {
    const guide = guides[index];
    const portraitEl = document.getElementById('guidePortrait');
    const nameEl = document.getElementById('guideName');
    const routeEl = document.getElementById('guideRoute');
    const optionsEl = document.getElementById('guideOptions');

    document.querySelectorAll('#guideNav .char-nav-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    const n = map[guide.character_name];
    if (n) {
        portraitEl.style.backgroundImage = `url('/static/picture/char-${code}-${n}.png')`;
    } else {
        portraitEl.style.backgroundImage = '';
    }

    nameEl.textContent = guide.character_name;
    routeEl.textContent = '路線攻略';

    const options = guide.options || [];
    if (options.length === 0) {
        optionsEl.innerHTML = '<p class="placeholder-text">暫無攻略選項。</p>';
    } else {
        let html = '<ol class="guide-option-list">';
        options.forEach(opt => {
            if (opt && opt.trim()) {
                html += `<li class="guide-option-item">${escapeHtml(opt)}</li>`;
            }
        });
        html += '</ol>';
        optionsEl.innerHTML = html;
    }

    enhanceGuideWithProgress(guide);
    triggerPortraitSwitch(portraitEl);
}


// =========================================================
// 搜索
// =========================================================
const HISTORY_KEY = 'yuzu-search-history';
const HISTORY_MAX = 8;

let searchState = {
    selectedIndex: -1,
    activeTab: 'all',
    flatHits: [],   // [{type, game, name}, ...]
    lastQuery: '',
};

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
}

function pushHistory(q) {
    if (!q || !q.trim()) return;
    const list = loadHistory().filter(x => x !== q);
    list.unshift(q);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
}

function removeHistoryItem(q) {
    const list = loadHistory().filter(x => x !== q);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function renderSearchHistory(resultsEl) {
    const history = loadHistory();
    if (history.length === 0) {
        resultsEl.classList.remove('show');
        return;
    }

    let html = '<div class="search-history">';
    html += '<div class="search-history-head"><span>🕐 最近搜尋</span><button class="clear-history">全部清除</button></div>';
    history.forEach(q => {
        html += `
            <div class="search-history-item" data-q="${escapeAttr(q)}">
                <span class="history-text">${escapeHtml(q)}</span>
                <button class="history-remove" data-q="${escapeAttr(q)}" title="刪除">✕</button>
            </div>`;
    });
    html += '</div>';

    resultsEl.innerHTML = html;
    resultsEl.classList.add('show');

    resultsEl.querySelector('.clear-history')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('確定要清除全部搜尋記錄嗎？')) {
            clearHistory();
            resultsEl.classList.remove('show');
        }
    });

    resultsEl.querySelectorAll('.history-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHistoryItem(btn.dataset.q);
            renderSearchHistory(resultsEl);
        });
    });

    resultsEl.querySelectorAll('.search-history-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('history-remove')) return;
            e.preventDefault();
            const input = document.getElementById('searchInput');
            input.value = el.dataset.q;
            input.focus();
            performSearch(el.dataset.q);
        });
    });
}

function checkSearchEasterEgg(q) {
    const lower = q.toLowerCase();
    if (lower === 'ciallo' || lower === 'ciallo～' || lower === 'ciallo~' || lower === '(∠·ω<)') {
        const resultsEl = document.getElementById('searchResults');
        resultsEl.innerHTML = `
            <div class="search-result-item search-result-special"
                 data-game="魔女的夜宴" data-name="因幡巡">
                <div class="search-result-thumb"
                     style="background-image: url('/static/picture/thumb-sabbat-2.png')"></div>
                <div class="search-result-info">
                    <div class="search-result-name">因幡巡</div>
                    <div class="search-result-game">魔女的夜宴</div>
                </div>
            </div>`;
        resultsEl.classList.add('show');

        resultsEl.querySelector('.search-result-item').addEventListener('click', () => {
            goToCharacter('魔女的夜宴', '因幡巡');
        });

        showEasterToast('⭐ Ciallo～(∠·ω< )⌒★', '因幡巡向你打招呼！');
        return true;
    }
    if (lower === '柚子' || lower === 'yuzu' || lower === 'yuzusoft') {
        showEasterToast('🍊 柚子社 YUZUSOFT', '感謝你喜歡柚子社的作品！');
    }
    return false;
}

async function performSearch(query) {
    const resultsEl = document.getElementById('searchResults');
    const raw = (query || '').trim();

    if (!raw) {
        searchState.flatHits = [];
        searchState.selectedIndex = -1;
        renderSearchHistory(resultsEl);
        return;
    }

    if (checkSearchEasterEgg(raw)) return;

    searchState.lastQuery = raw;
    const tab = searchState.activeTab || 'all';

    let data;
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(raw)}&tab=${tab}`);
        data = await res.json();
    } catch (e) {
        console.error('搜索失敗', e);
        return;
    }

    renderSearchResults(resultsEl, data);
}

function renderSearchResults(resultsEl, data) {
    let html = '';

    if (data.suggestions && data.suggestions.length > 0) {
        html += '<div class="search-suggest-head">建議</div>';
        data.suggestions.slice(0, 4).forEach((s, i) => {
            html += `<div class="search-suggest-item" data-q="${escapeAttr(s)}" style="animation-delay: ${i * 40}ms">
                        <span class="suggest-icon">🔍</span>
                        <span class="suggest-text">${escapeHtml(s)}</span>
                     </div>`;
        });
    }

    if (data.total === 0) {
        html += '<div class="search-result-empty">沒有找到符合的角色</div>';
        resultsEl.innerHTML = html;
        resultsEl.classList.add('show');
        bindSuggestionClicks(resultsEl);
        return;
    }

    html += '<div class="search-tabs">';
    ['all', 'character', 'guide'].forEach(t => {
        const labels = { all: '全部', character: '角色', guide: '攻略' };
        html += `<button class="search-tab ${t === data.tab ? 'active' : ''}" data-tab="${t}">${labels[t]} ${data.counts[t]}</button>`;
    });
    html += '</div>';

    searchState.flatHits = [];
    let idx = 0;
    for (const g of data.groups) {
        html += `<div class="search-group-title">${escapeHtml(g.game)}</div>`;
        for (const it of g.items) {
            const delay = Math.min(idx * 30, 400);
            const selected = idx === searchState.selectedIndex;

            html += `
                <div class="search-result-item ${selected ? 'selected' : ''}"
                     style="animation-delay: ${delay}ms"
                     data-idx="${idx}">
                    <div class="search-result-thumb"
                         style="background-image: url('/static/picture/thumb-${escapeAttr(it.code)}-${safeInt(it.index)}.png')"></div>
                    <div class="search-result-info">
                        <div class="search-result-name">${it.name_html}</div>
                        <div class="search-result-game">${escapeHtml(it.game)} ${it.sub_html}</div>
                    </div>
                </div>`;

            searchState.flatHits.push({ type: it.type, game: it.game, name: it.name });
            idx++;
        }
    }

    resultsEl.innerHTML = html;
    resultsEl.classList.add('show');

    resultsEl.querySelectorAll('.search-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            searchState.activeTab = tab.dataset.tab;
            searchState.selectedIndex = -1;
            performSearch(searchState.lastQuery);
        });
    });

    resultsEl.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
            const i = parseInt(el.dataset.idx, 10);
            const hit = searchState.flatHits[i];
            if (hit) goToHit(hit);
        });
    });

    bindSuggestionClicks(resultsEl);
}

function bindSuggestionClicks(resultsEl) {
    resultsEl.querySelectorAll('.search-suggest-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const input = document.getElementById('searchInput');
            input.value = el.dataset.q;
            input.focus();
            performSearch(el.dataset.q);
        });
    });
}

function goToHit(hit) {
    if (hit.type === 'guide') {
        goToGuide(hit.game, hit.name);
    } else {
        goToCharacter(hit.game, hit.name);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchInput');
    const resultsEl = document.getElementById('searchResults');
    if (!input || !resultsEl) return;

    let debounceTimer = null;

    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value;
        debounceTimer = setTimeout(() => {
            if (val.trim()) {
                performSearch(val);
            } else {
                renderSearchHistory(resultsEl);
            }
        }, 250);
    });

    input.addEventListener('focus', () => {
        if (!input.value.trim()) {
            renderSearchHistory(resultsEl);
        } else {
            performSearch(input.value);
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            input.value = '';
            resultsEl.classList.remove('show');
            input.blur();
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const total = searchState.flatHits.length;
            if (total === 0) return;

            if (e.key === 'ArrowDown') {
                searchState.selectedIndex = (searchState.selectedIndex + 1) % total;
            } else {
                searchState.selectedIndex = (searchState.selectedIndex - 1 + total) % total;
            }

            const items = resultsEl.querySelectorAll('.search-result-item');
            items.forEach((el, i) => {
                el.classList.toggle('selected', i === searchState.selectedIndex);
            });
            items[searchState.selectedIndex]?.scrollIntoView({ block: 'nearest' });
        }

        if (e.key === 'Enter') {
            if (searchState.selectedIndex >= 0 && searchState.flatHits[searchState.selectedIndex]) {
                goToHit(searchState.flatHits[searchState.selectedIndex]);
            } else if (input.value.trim()) {
                pushHistory(input.value.trim());
            }
        }
    });

    input.addEventListener('change', () => {
        if (input.value.trim()) pushHistory(input.value.trim());
    });
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
        document.getElementById('searchResults')?.classList.remove('show');
    }
});


// =========================================================
// 跳轉到角色 / 攻略
// =========================================================
async function goToCharacter(gameName, charName) {
    const input = document.getElementById('searchInput');
    const resultsEl = document.getElementById('searchResults');
    if (input) { input.value = ''; input.blur(); }
    if (resultsEl) {
        resultsEl.classList.remove('show');
        resultsEl.innerHTML = '';
    }

    if (currentGame !== gameName) {
        await selectGame(gameName);
    }

    await new Promise(r => setTimeout(r, 120));

    const navItems = document.querySelectorAll('#charNav .char-nav-item');
    let found = false;
    for (const item of navItems) {
        const label = item.querySelector('.char-nav-label');
        if (label && label.textContent === charName) {
            item.click();
            found = true;
            break;
        }
    }

    const target = document.getElementById('character');
    if (target) {
        const topbar = document.querySelector('.topbar-inner');
        const topbarHeight = topbar ? topbar.offsetHeight + 30 : 100;
        const targetY = target.getBoundingClientRect().top + window.scrollY - topbarHeight;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
    return found;
}

async function goToGuide(gameName, charName) {
    const input = document.getElementById('searchInput');
    const resultsEl = document.getElementById('searchResults');
    if (input) { input.value = ''; input.blur(); }
    if (resultsEl) {
        resultsEl.classList.remove('show');
        resultsEl.innerHTML = '';
    }

    if (currentGame !== gameName) {
        await selectGame(gameName);
    }

    await new Promise(r => setTimeout(r, 120));

    const navItems = document.querySelectorAll('#guideNav .char-nav-item');
    let found = false;
    for (const item of navItems) {
        const label = item.querySelector('.char-nav-label');
        if (label && label.textContent === charName) {
            item.click();
            found = true;
            break;
        }
    }

    const target = document.getElementById('guide');
    if (target) {
        const topbar = document.querySelector('.topbar-inner');
        const topbarHeight = topbar ? topbar.offsetHeight + 30 : 100;
        const targetY = target.getBoundingClientRect().top + window.scrollY - topbarHeight;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
    return found;
}


// =========================================================
// 命運邂逅
// =========================================================
let mmFilters = { height: [], body: [], age: [], personality: [] };
let mmThreshold = 0;

function matchLevel(p) {
    if (p >= 90) return 'perfect';
    if (p >= 70) return 'great';
    if (p >= 50) return 'good';
    return 'ok';
}

async function searchMatchmaker() {
    const btn = document.getElementById('mmSearch');
    const resultEl = document.getElementById('mmResult');

    const anyFilter = Object.values(mmFilters).some(arr => arr.length > 0);
    if (!anyFilter) {
        resultEl.innerHTML = `
            <div class="mm-empty">
                <div class="mm-empty-title">請至少選擇一個條件</div>
                <div class="mm-empty-desc">身高 / 體型 / 年齡 / 性格 任選一個即可</div>
            </div>`;
        return;
    }

    // 彩蛋 6：蘿莉 + 30+
    if (mmFilters.body.includes('蘿莉') && mmFilters.age.includes('old')) {
        setTimeout(() => {
            showEasterToast('🧙 找到了長生不老的蘿莉！', '500 歲的叢雨報到～');
        }, 400);
    }

    btn.classList.add('rolling');
    btn.disabled = true;
    resultEl.innerHTML = `
        <div class="mm-loading">
            <div class="mm-loading-magic"><div class="mm-loading-core"></div></div>
            <div class="mm-loading-text">占卜中…</div>
        </div>`;

    const params = new URLSearchParams();
    if (mmFilters.height.length) params.set('height', mmFilters.height.join(','));
    if (mmFilters.body.length) params.set('body', mmFilters.body.join(','));
    if (mmFilters.age.length) params.set('age', mmFilters.age.join(','));
    if (mmFilters.personality.length) params.set('personality', mmFilters.personality.join(','));
    params.set('threshold', String(mmThreshold));

    let data;
    try {
        const res = await fetch(`/api/matchmaker?${params.toString()}`);
        data = await res.json();
    } catch (e) {
        console.error('命運邂逅失敗', e);
        data = { total: 0, results: [] };
    }

    await new Promise(r => setTimeout(r, 500));

    btn.classList.remove('rolling');
    btn.disabled = false;

    if (data.total === 0) {
        const hint = mmThreshold > 0
            ? `沒有 ${mmThreshold}% 以上匹配的角色，試著降低門檻或放寬條件吧`
            : '試著放寬一些條件吧';
        resultEl.innerHTML = `
            <div class="mm-empty">
                <div class="mm-empty-title">沒有符合條件的角色</div>
                <div class="mm-empty-desc">${hint}</div>
            </div>`;
        return;
    }

    renderMMList(data.results);

    if (data.results.some(c => c.match_percent >= 90)) {
        mmSparkleBurst();
    }
}

function renderMMList(pool) {
    const resultEl = document.getElementById('mmResult');
    const perfect = pool.filter(c => c.match_percent >= 90).length;

    let html = '<div class="mm-result-grid">';
    html += `<div class="mm-result-count">共 ${pool.length} 位符合條件${perfect > 0 ? ` · ${perfect} 位完美契合 ✨` : ''}</div>`;

    pool.forEach((char, index) => {
        const stats = [];
        if (char.height) stats.push(char.height);

        const badge = `<div class="mm-match-badge mm-match-${matchLevel(char.match_percent)}">${safeInt(char.match_percent, 0)}%</div>`;

        let reasonsHtml = '';
        if (char.matched.length > 0 || char.missed.length > 0) {
            const hits = char.matched.map(r => `<span class="mm-reason-hit">✓ ${escapeHtml(r)}</span>`).join('');
            const miss = char.missed.map(r => `<span class="mm-reason-miss">✗ ${escapeHtml(r)}</span>`).join('');
            reasonsHtml = `<div class="mm-match-reasons">${hits}${miss}</div>`;
        }

        const delay = Math.min(index * 60, 600);
        const safeCode = escapeAttr(char.code || 'game');
        const safeIndex = safeInt(char.index, 0);

        html += `
            <div class="mm-result-item ${char.match_percent >= 90 ? 'perfect-match' : ''}"
                 style="animation-delay: ${safeInt(delay, 0)}ms"
                 data-game="${escapeAttr(char.game)}" data-name="${escapeAttr(char.name)}">
                ${badge}
                <div class="mm-result-thumb"
                     style="background-image: url('/static/picture/thumb-${safeCode}-${safeIndex}.png')"></div>
                <div class="mm-result-name">${escapeHtml(char.name)}</div>
                <div class="mm-result-game">${escapeHtml(char.game)}</div>
                <div class="mm-result-stats">
                    ${stats.map(s => `<span class="mm-result-stat">${escapeHtml(s)}</span>`).join('')}
                </div>
                ${reasonsHtml}
            </div>`;
    });

    html += `
        <div class="mm-random-row">
            <button class="mm-btn-random" id="mmRandomBtn">
                <svg class="orb-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <radialGradient id="orbGlow" cx="0.35" cy="0.3" r="0.85">
                            <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
                            <stop offset="0.3" stop-color="#e9d5ff" stop-opacity="0.85"/>
                            <stop offset="0.65" stop-color="#a78bfa" stop-opacity="0.8"/>
                            <stop offset="1" stop-color="#6d28d9" stop-opacity="0.95"/>
                        </radialGradient>
                        <linearGradient id="orbBaseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stop-color="#ffe8a3"/>
                            <stop offset="0.5" stop-color="#d4af37"/>
                            <stop offset="1" stop-color="#8b6914"/>
                        </linearGradient>
                        <linearGradient id="orbRimGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stop-color="#fffbe6"/>
                            <stop offset="0.5" stop-color="#e8b43a"/>
                            <stop offset="1" stop-color="#8b6914"/>
                        </linearGradient>
                        <radialGradient id="orbAura" cx="0.5" cy="0.5" r="0.5">
                            <stop offset="0" stop-color="#c4b5fd" stop-opacity="0.7"/>
                            <stop offset="1" stop-color="#c4b5fd" stop-opacity="0"/>
                        </radialGradient>
                    </defs>
                    <circle cx="12" cy="10" r="9" fill="url(#orbAura)" class="orb-aura"/>
                    <circle cx="12" cy="10" r="7" fill="url(#orbGlow)" stroke="url(#orbRimGrad)" stroke-width="0.7"/>
                    <circle cx="9"    cy="7"    r="0.8"  fill="#fff" class="orb-star" style="animation-delay:0s"/>
                    <circle cx="14.5" cy="8"    r="0.55" fill="#fff" class="orb-star" style="animation-delay:0.3s"/>
                    <circle cx="11"   cy="12"   r="0.5"  fill="#fff" class="orb-star" style="animation-delay:0.6s"/>
                    <circle cx="15"   cy="11.5" r="0.45" fill="#fff" class="orb-star" style="animation-delay:0.9s"/>
                    <circle cx="8.5"  cy="11"   r="0.4"  fill="#fff" class="orb-star" style="animation-delay:1.2s"/>
                    <circle cx="12.5" cy="9.5"  r="0.35" fill="#fff" class="orb-star" style="animation-delay:0.45s"/>
                    <ellipse cx="9"   cy="6.5" rx="2.5" ry="1.3" fill="#fff" opacity="0.55" transform="rotate(-30 9 6.5)"/>
                    <ellipse cx="8.5" cy="7.5" rx="0.8" ry="0.4" fill="#fff" opacity="0.75" transform="rotate(-30 8.5 7.5)"/>
                    <path d="M 7.5 17.5 Q 12 16.5 16.5 17.5 L 15.5 20 Q 12 20.8 8.5 20 Z"
                        fill="url(#orbBaseGrad)" stroke="#8b6914" stroke-width="0.6"/>
                </svg>
                <span>從這 ${pool.length} 位隨機選一個</span>
            </button>
            <button class="mm-btn-random-fast" id="mmRandomFastBtn" title="不播動畫，立刻跳轉">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M13 2 L 4 14 L 11 14 L 10 22 L 20 10 L 13 10 Z"
                          fill="currentColor" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/>
                </svg>
                <span>快速隨機</span>
            </button>
        </div>`;

    html += '</div>';
    resultEl.innerHTML = html;

    resultEl.querySelectorAll('.mm-result-item').forEach(item => {
        item.addEventListener('click', () => {
            goToCharacter(item.dataset.game, item.dataset.name);
        });
    });

    document.getElementById('mmRandomBtn')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        btn.classList.add('spinning');
        setTimeout(() => {
            btn.classList.remove('spinning');
            const pick = pool[Math.floor(Math.random() * pool.length)];
            showMMTransition(pick, () => {
                goToCharacter(pick.game, pick.name);
            });
        }, 700);
    });

    document.getElementById('mmRandomFastBtn')?.addEventListener('click', () => {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        goToCharacter(pick.game, pick.name);
    });
}

function mmSparkleBurst() {
    const icons = ['✨', '⭐', '💫', '🌟', '💛'];
    const count = 30;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.5;

    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'mm-sparkle';
        el.textContent = icons[Math.floor(Math.random() * icons.length)];
        el.style.left = cx + 'px';
        el.style.top = cy + 'px';

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
        const dist = 120 + Math.random() * 260;
        el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(0) + 'px');
        el.style.setProperty('--dy', (Math.sin(angle) * dist - 30).toFixed(0) + 'px');

        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1800);
    }
}

function showMMTransition(char, onComplete) {
    document.querySelectorAll('.mm-transition').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'mm-transition';

    const safeCode = escapeAttr(char.code || 'game');
    const safeIndex = safeInt(char.index, 0);
    const thumb = `/static/picture/thumb-${safeCode}-${safeIndex}.png`;

    overlay.innerHTML = `
        <div class="mm-transition-bg"></div>
        <div class="mm-transition-magic">
            <div class="mm-transition-label">命 運 指 引</div>
            <div class="mm-transition-avatar" style="background-image: url('${thumb}')"></div>
            <div class="mm-transition-name">${escapeHtml(char.name)}</div>
        </div>`;

    document.body.appendChild(overlay);

    const magic = overlay.querySelector('.mm-transition-magic');
    for (let i = 0; i < 12; i++) {
        const spark = document.createElement('div');
        spark.className = 'mm-transition-spark';
        const angle = (Math.PI * 2 * i) / 12;
        const radius = 48;
        spark.style.left = (50 + Math.cos(angle) * radius) + '%';
        spark.style.top = (50 + Math.sin(angle) * radius) + '%';
        spark.style.animationDelay = (i * 0.15) + 's';
        magic.appendChild(spark);
    }

    requestAnimationFrame(() => overlay.classList.add('show'));

    setTimeout(() => {
        overlay.classList.add('leaving');
        if (typeof onComplete === 'function') onComplete();
        setTimeout(() => overlay.remove(), 500);
    }, 2200);
}


// 命運邂逅：多選條件綁定
document.addEventListener('DOMContentLoaded', () => {
    const bindGroup = (groupId, filterKey) => {
        const group = document.getElementById(groupId);
        if (!group) return;

        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.val;

                if (val === 'all') {
                    group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    mmFilters[filterKey] = [];
                    return;
                }

                group.querySelector('button[data-val="all"]')?.classList.remove('active');
                btn.classList.toggle('active');

                const selected = [];
                group.querySelectorAll('button.active').forEach(b => {
                    if (b.dataset.val !== 'all') selected.push(b.dataset.val);
                });
                mmFilters[filterKey] = selected;

                if (selected.length === 0) {
                    group.querySelector('button[data-val="all"]')?.classList.add('active');
                }
            });
        });
    };

    bindGroup('mmHeight', 'height');
    bindGroup('mmBody', 'body');
    bindGroup('mmAge', 'age');
    bindGroup('mmPersonality', 'personality');

    document.getElementById('mmSearch')?.addEventListener('click', searchMatchmaker);

    const thresholdGroup = document.getElementById('mmThreshold');
    if (thresholdGroup) {
        thresholdGroup.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                thresholdGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                mmThreshold = parseInt(btn.dataset.val, 10) || 0;
            });
        });
    }

    document.getElementById('mmReset')?.addEventListener('click', () => {
        ['mmHeight', 'mmBody', 'mmAge', 'mmPersonality'].forEach(id => {
            const group = document.getElementById(id);
            if (!group) return;
            group.querySelectorAll('button').forEach(b => {
                b.classList.toggle('active', b.dataset.val === 'all');
            });
        });
        mmFilters = { height: [], body: [], age: [], personality: [] };
        mmThreshold = 0;

        const thresholdGroup = document.getElementById('mmThreshold');
        if (thresholdGroup) {
            thresholdGroup.querySelectorAll('button').forEach(b => {
                b.classList.toggle('active', b.dataset.val === '0');
            });
        }

        document.getElementById('mmResult').innerHTML =
            '<p class="mm-hint">設定條件後，點擊「尋找適合你的角色」</p>';
    });
});


// =========================================================
// 回到頂部
// =========================================================
let returnTopCount = 0;
let returnTopTimer = null;

function scrollToTop() {
    // 彩蛋 7：連點 5 次
    returnTopCount++;
    clearTimeout(returnTopTimer);
    returnTopTimer = setTimeout(() => { returnTopCount = 0; }, 3000);
    if (returnTopCount === 5) {
        showEasterToast('🚀 已經很上面了～', '你是想飛到宇宙嗎？');
        returnTopCount = 0;
    }

    const btn = document.getElementById('returnTop');
    if (btn) {
        btn.classList.remove('launching');
        void btn.offsetWidth;
        btn.classList.add('launching');
        setTimeout(() => btn.classList.remove('launching'), 800);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateReturnTopBtn() {
    const btn = document.getElementById('returnTop');
    if (!btn) return;
    btn.classList.toggle('show', window.scrollY > 300);
}

window.addEventListener('scroll', updateReturnTopBtn, { passive: true });
document.addEventListener('DOMContentLoaded', updateReturnTopBtn);


// =========================================================
// 彩蛋
// =========================================================
const KONAMI_CODE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key.toLowerCase() === KONAMI_CODE[konamiIndex].toLowerCase() ||
        e.key === KONAMI_CODE[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === KONAMI_CODE.length) {
            triggerCharacterRain();
            showEasterToast('🎮 你發現了 Konami 密碼！', '柚子社全體角色向你致敬！');
            konamiIndex = 0;
        }
    } else {
        konamiIndex = 0;
    }
});

const EASTER_THUMBS = [
    'senren-1', 'senren-2', 'senren-3', 'senren-4', 'senren-5', 'senren-6',
    'tenshi-1', 'tenshi-2', 'tenshi-3', 'tenshi-4', 'tenshi-5', 'tenshi-6',
    'cafe-1', 'cafe-2', 'cafe-3', 'cafe-4', 'cafe-5',
    'sabbat-1', 'sabbat-2', 'sabbat-3', 'sabbat-4', 'sabbat-5'
];

function triggerCharacterRain() {
    const layer = document.createElement('div');
    layer.className = 'easter-rain';
    document.body.appendChild(layer);

    for (let i = 0; i < 40; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        const thumb = EASTER_THUMBS[Math.floor(Math.random() * EASTER_THUMBS.length)];
        drop.style.backgroundImage = `url('/static/picture/thumb-${thumb}.png')`;
        drop.style.left = Math.random() * 100 + '%';
        const size = 40 + Math.random() * 40;
        drop.style.width = size + 'px';
        drop.style.height = size + 'px';
        drop.style.animationDuration = (2.5 + Math.random() * 2) + 's';
        drop.style.animationDelay = (Math.random() * 1.5) + 's';
        layer.appendChild(drop);
    }
    setTimeout(() => layer.remove(), 6000);
}

let toastTimer = null;

function showEasterToast(title, desc = '') {
    const old = document.querySelector('.easter-toast');
    if (old) old.remove();
    clearTimeout(toastTimer);

    const toast = document.createElement('div');
    toast.className = 'easter-toast';
    toast.innerHTML = `
        <span class="toast-title">${escapeHtml(title)}</span>
        ${desc ? `<span class="toast-desc">${escapeHtml(desc)}</span>` : ''}
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// 彩蛋 3：點擊標題 10 次
let titleClickCount = 0;
let titleClickTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    const brand = document.querySelector('.brand');
    if (!brand) return;

    brand.addEventListener('click', () => {
        titleClickCount++;
        brand.classList.add('pressed');
        setTimeout(() => brand.classList.remove('pressed'), 300);

        clearTimeout(titleClickTimer);
        titleClickTimer = setTimeout(() => { titleClickCount = 0; }, 2000);

        if (titleClickCount === 10) {
            triggerCharacterRain();
            showEasterToast('🍊 柚子社攻略站', '感謝你的支持！繼續探索吧～');
            titleClickCount = 0;
        }
    });
});

// 彩蛋 4：雙擊頭像
document.addEventListener('dblclick', (e) => {
    const navItem = e.target.closest('.char-nav-item');
    if (navItem) {
        triggerHeartBurst(e.clientX, e.clientY);
        return;
    }
    if (e.target.closest('#charPortrait') || e.target.closest('#guidePortrait')) {
        triggerHeartBurst(e.clientX, e.clientY);
    }
});

function triggerHeartBurst(x, y) {
    const hearts = ['💖', '💕', '💗', '❤️', '💝', '🌸', '✨'];
    const count = 15;

    for (let i = 0; i < count; i++) {
        const heart = document.createElement('div');
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        heart.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: ${20 + Math.random() * 16}px;
            pointer-events: none;
            z-index: 9999;
            user-select: none;
            will-change: transform, opacity;
            animation: heartFly 1s ease-out forwards;
        `;
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const dist = 80 + Math.random() * 60;
        heart.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        heart.style.setProperty('--dy', (Math.sin(angle) * dist - 30) + 'px');
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1100);
    }
}


// =========================================================
// 排行榜
// =========================================================
let rankingLoaded = false;

async function loadRanking() {
    const listEl = document.getElementById('rankingList');
    if (!listEl) return;

    try {
        const res = await fetch('/api/ranking');
        if (!res.ok) throw new Error('API 失敗');
        const data = await res.json();

        if (data.length === 0) {
            listEl.innerHTML = '<p class="ranking-empty">還沒有人瀏覽過，快來成為第一個吧！</p>';
            return;
        }

        let html = '';
        data.forEach(item => {
            const rank = safeInt(item.rank, 0);
            const count = safeInt(item.count, 0);
            const code = escapeAttr(item.code || 'game');
            const idx = safeInt(item.index, 0);

            html += `
                <div class="ranking-item rank-${rank}"
                    data-game="${escapeAttr(item.game)}"
                    data-name="${escapeAttr(item.name)}">
                    <div class="ranking-rank">${rank}</div>
                    <div class="ranking-thumb"
                        style="background-image: url('/static/picture/thumb-${code}-${idx}.png')"></div>
                    <div class="ranking-info">
                        <div class="ranking-name">${escapeHtml(item.name)}</div>
                        <div class="ranking-game">${escapeHtml(item.game)}</div>
                    </div>
                    <div class="ranking-count" data-target="${count}">0 次</div>
                </div>`;
        });

        listEl.innerHTML = html;
        rankingLoaded = true;

        listEl.querySelectorAll('.ranking-count[data-target]').forEach(el => {
            const target = parseInt(el.dataset.target, 10) || 0;
            if (target === 0) { el.textContent = '0 次'; return; }

            const duration = 900;
            const startTime = performance.now();

            function tick(now) {
                const t = Math.min((now - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                const current = Math.round(eased * target);
                el.textContent = current + ' 次';
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = target + ' 次';
            }
            requestAnimationFrame(tick);
        });

        listEl.querySelectorAll('.ranking-item').forEach(el => {
            el.addEventListener('click', () => {
                goToCharacter(el.dataset.game, el.dataset.name);
            });
        });
    } catch (e) {
        listEl.innerHTML = '<p class="ranking-empty">排行榜載入失敗，請稍後再試</p>';
    }
}

const rankingObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !rankingLoaded) {
        loadRanking();
    }
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
    const section = document.getElementById('ranking');
    if (section) rankingObserver.observe(section);
});

let refreshTimer = null;
function refreshRanking() {
    if (!rankingLoaded) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
        rankingLoaded = false;
        await loadRanking();
    }, 300);
}


// =========================================================
// 前端防刷
// =========================================================
const VIEW_LOCAL_KEY = 'yuzu-view-recent';
const VIEW_INTERVAL_MS = 10 * 60 * 1000;

function getViewRecords() {
    try {
        const raw = localStorage.getItem(VIEW_LOCAL_KEY);
        if (!raw) return {};
        const data = JSON.parse(raw);
        const now = Date.now();
        const cleaned = {};
        for (const [name, ts] of Object.entries(data)) {
            if (now - ts < 24 * 60 * 60 * 1000) cleaned[name] = ts;
        }
        return cleaned;
    } catch { return {}; }
}

function markViewed(name) {
    const data = getViewRecords();
    data[name] = Date.now();
    localStorage.setItem(VIEW_LOCAL_KEY, JSON.stringify(data));
}

function hasViewedRecently(name) {
    const ts = getViewRecords()[name];
    if (!ts) return false;
    return Date.now() - ts < VIEW_INTERVAL_MS;
}


// =========================================================
// 收藏
// =========================================================
const FAV_KEY = 'yuzu-favorites';
const FAV_SEEN_KEY = 'yuzu-fav-seen';
let favCharsCache = {};
let favSeen = parseInt(localStorage.getItem(FAV_SEEN_KEY) || '0', 10);

function loadFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    } catch { return []; }
}

function saveFavorites(list) {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
    updateFavCount();
}

function isFavorite(name) {
    return loadFavorites().includes(name);
}

function toggleFavorite(name) {
    const list = loadFavorites();
    const idx = list.indexOf(name);
    if (idx === -1) list.push(name);
    else list.splice(idx, 1);
    saveFavorites(list);

    if (list.length < favSeen) {
        favSeen = list.length;
        localStorage.setItem(FAV_SEEN_KEY, String(favSeen));
    }
    updateFavCount();
    renderFavorites();
    return idx === -1;
}

function updateFavCount() {
    const btn = document.getElementById('favButton');
    const countEl = document.getElementById('favCount');
    if (!btn || !countEl) return;

    const total = loadFavorites().length;
    const unseen = total - favSeen;

    if (unseen > 0) {
        countEl.textContent = unseen > 99 ? '99+' : unseen;
        btn.classList.add('has-favs');
    } else {
        btn.classList.remove('has-favs');
    }
}

function markFavsSeen() {
    const total = loadFavorites().length;
    if (total === favSeen) return;
    favSeen = total;
    localStorage.setItem(FAV_SEEN_KEY, String(favSeen));
    updateFavCount();
}

function injectFavButton(char, code, index) {
    const portrait = document.getElementById('charPortrait');
    if (!portrait) return;

    portrait.querySelectorAll('.char-fav-btn').forEach(b => b.remove());

    const active = isFavorite(char.name);
    const btn = document.createElement('button');
    btn.className = 'char-fav-btn' + (active ? ' active' : '');
    btn.title = active ? '取消收藏' : '加入最愛';
    btn.setAttribute('aria-label', btn.title);

    btn.innerHTML = `
        <svg class="fav-heart" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21s-7.5-4.35-9.5-9.5C1 8 3 4 7 4c2.5 0 4 1.5 5 3 1-1.5 2.5-3 5-3 4 0 6 4 4.5 7.5C19.5 16.65 12 21 12 21z"/>
        </svg>`;

    const oneBasedIndex = index + 1;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const added = toggleFavorite(char.name);
        btn.classList.toggle('active', added);
        btn.title = added ? '取消收藏' : '加入最愛';
        btn.setAttribute('aria-label', btn.title);

        favCharsCache[char.name] = { game: currentGame, code, index: oneBasedIndex };

        if (added) {
            const rect = btn.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const hearts = ['💖', '💕', '💗', '❤️', '💝', '🌸', '✨'];
            const count = 10;
            for (let i = 0; i < count; i++) {
                const h = document.createElement('div');
                h.className = 'fav-burst-heart';
                h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
                h.style.left = cx + 'px';
                h.style.top = cy + 'px';
                const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
                const dist = 40 + Math.random() * 50;
                h.style.setProperty('--fdx', (Math.cos(angle) * dist).toFixed(0) + 'px');
                h.style.setProperty('--fdy', (Math.sin(angle) * dist - 20).toFixed(0) + 'px');
                h.style.setProperty('--frot', Math.floor(Math.random() * 720 - 360) + 'deg');
                document.body.appendChild(h);
                setTimeout(() => h.remove(), 1200);
            }
        }
    });

    portrait.appendChild(btn);
    favCharsCache[char.name] = { game: currentGame, code, index: oneBasedIndex };
}

async function renderFavorites() {
    const listEl = document.getElementById('favoritesList');
    if (!listEl) return;

    const favs = loadFavorites();

    if (favs.length === 0) {
        listEl.innerHTML = '<p class="favorites-empty">還沒有收藏任何角色，去角色介紹區點 ☆ 收藏吧！</p>';
        return;
    }

    for (const name of favs) {
        if (!favCharsCache[name]) {
            try {
                const res = await fetch(`/api/characters/${encodeURIComponent(name)}`);
                if (res.ok) {
                    for (const game of Object.keys(GAME_CODES)) {
                        const gr = await fetch(`/api/games/${encodeURIComponent(game)}/characters`);
                        if (!gr.ok) continue;
                        const names = await gr.json();
                        const i = names.indexOf(name);
                        if (i !== -1) {
                            favCharsCache[name] = {
                                game,
                                code: GAME_CODES[game],
                                index: i + 1
                            };
                            break;
                        }
                    }
                }
            } catch (e) {}
        }
    }

    let html = '';
    for (const name of favs) {
        const info = favCharsCache[name];
        if (!info) continue;
        const safeCode = escapeAttr(info.code || 'game');
        const safeIndex = safeInt(info.index, 0);

        html += `
            <div class="favorite-item" data-game="${escapeAttr(info.game)}" data-name="${escapeAttr(name)}">
                <button class="favorite-remove" title="取消收藏" data-name="${escapeAttr(name)}">✕</button>
                <div class="favorite-thumb"
                     style="background-image: url('/static/picture/thumb-${safeCode}-${safeIndex}.png')"></div>
                <div class="favorite-name">${escapeHtml(name)}</div>
                <div class="favorite-game">${escapeHtml(info.game)}</div>
            </div>`;
    }
    listEl.innerHTML = html;

    listEl.querySelectorAll('.favorite-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('favorite-remove')) return;
            goToCharacter(el.dataset.game, el.dataset.name);
        });
    });

    listEl.querySelectorAll('.favorite-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(btn.dataset.name);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateFavCount();
    renderFavorites();

    document.getElementById('favButton')?.addEventListener('click', () => {
        setTimeout(markFavsSeen, 300);
    });
});

const favSeenObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) markFavsSeen();
}, { threshold: 0.3 });

document.addEventListener('DOMContentLoaded', () => {
    const sec = document.getElementById('favorites');
    if (sec) favSeenObserver.observe(sec);
});


// =========================================================
// 攻略進度
// =========================================================
const GUIDE_PROGRESS_KEY = 'yuzu-guide-progress';

function loadGuideProgress() {
    try {
        return JSON.parse(localStorage.getItem(GUIDE_PROGRESS_KEY) || '{}');
    } catch { return {}; }
}

function saveGuideProgress(data) {
    localStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(data));
}

function getCharProgress(charName) {
    return loadGuideProgress()[charName] || [];
}

function setCharProgress(charName, arr) {
    const data = loadGuideProgress();
    if (arr.length === 0) delete data[charName];
    else data[charName] = arr;
    saveGuideProgress(data);
}

function toggleGuideOption(charName, optionIndex) {
    const current = getCharProgress(charName);
    const idx = current.indexOf(optionIndex);
    if (idx === -1) current.push(optionIndex);
    else current.splice(idx, 1);
    setCharProgress(charName, current);
    return current.length;
}

function enhanceGuideWithProgress(guide) {
    const optionsEl = document.getElementById('guideOptions');
    const progressEl = document.getElementById('guideProgress');
    const fillEl = document.getElementById('guideProgressFill');
    const textEl = document.getElementById('guideProgressText');
    const resetBtn = document.getElementById('guideResetBtn');

    if (!optionsEl || !guide) return;

    const charName = guide.character_name;
    const items = optionsEl.querySelectorAll('.guide-option-item');

    if (items.length === 0) {
        if (progressEl) progressEl.style.display = 'none';
        return;
    }
    if (progressEl) progressEl.style.display = 'flex';

    const progress = getCharProgress(charName);
    const total = items.length;

    items.forEach((item, i) => {
        const oneBasedIndex = i + 1;

        if (!item.querySelector('.guide-option-check')) {
            const check = document.createElement('span');
            check.className = 'guide-option-check';
            check.textContent = '✓';
            item.appendChild(check);
        }

        item.classList.toggle('done', progress.includes(oneBasedIndex));
        item.onclick = null;
        item.addEventListener('click', () => {
            const count = toggleGuideOption(charName, oneBasedIndex);
            item.classList.toggle('done');
            updateProgressUI(count, total, fillEl, textEl);
        });
    });

    updateProgressUI(progress.length, total, fillEl, textEl);

    if (resetBtn) {
        const newResetBtn = resetBtn.cloneNode(true);
        resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);

        newResetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!confirm(`確定要重置「${charName}」的攻略進度嗎？`)) return;
            setCharProgress(charName, []);
            items.forEach(it => it.classList.remove('done'));
            updateProgressUI(0, total, fillEl, textEl);
        });
    }
}

function updateProgressUI(done, total, fillEl, textEl) {
    if (!fillEl || !textEl) return;
    const pct = total > 0 ? (done / total) * 100 : 0;
    fillEl.style.width = pct + '%';

    const isComplete = (done === total && total > 0);
    const wasComplete = fillEl.classList.contains('done');

    if (isComplete) {
        fillEl.classList.add('done');
        textEl.classList.add('done');
        textEl.textContent = `🎉 ${done} / ${total}`;
        if (!wasComplete) triggerGuideCompleteCelebration();
    } else {
        fillEl.classList.remove('done');
        textEl.classList.remove('done');
        textEl.textContent = `${done} / ${total}`;
    }
}

function triggerGuideCompleteCelebration() {
    const optionsEl = document.getElementById('guideOptions');
    if (!optionsEl) return;

    if (!optionsEl.querySelector('.guide-complete-toast')) {
        const toast = document.createElement('div');
        toast.className = 'guide-complete-toast';
        toast.innerHTML = `
            <div class="complete-icon">🎉</div>
            <div class="complete-text">全 路 線 通 關</div>
            <div class="complete-sub">ALL CLEAR</div>`;
        optionsEl.style.position = 'relative';
        optionsEl.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    const icons = ['✨', '⭐', '💫', '🌟', '💛', '🎉'];
    const count = 40;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.5;

    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'gold-sparkle-burst';
        el.textContent = icons[Math.floor(Math.random() * icons.length)];
        el.style.left = cx + 'px';
        el.style.top = cy + 'px';

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
        const dist = 150 + Math.random() * 350;
        el.style.setProperty('--gdx', (Math.cos(angle) * dist).toFixed(0) + 'px');
        el.style.setProperty('--gdy', (Math.sin(angle) * dist - 30).toFixed(0) + 'px');
        el.style.setProperty('--grot', Math.floor(Math.random() * 1080 - 540) + 'deg');
        el.style.animationDelay = (Math.random() * 0.2) + 's';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1800);
    }
}


// =========================================================
// 視覺特效
// =========================================================
function triggerPortraitSwitch(el) {
    if (!el) return;
    el.classList.remove('switching');
    void el.offsetWidth;
    el.classList.add('switching');
    setTimeout(() => el.classList.remove('switching'), 700);
}

function initSectionFadeIn() {
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.section-inner').forEach(el => el.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    document.querySelectorAll('.section').forEach(sec => {
        const inner = sec.querySelector('.section-inner');
        if (inner) observer.observe(inner);
    });

    const homeInner = document.querySelector('#home .section-inner');
    if (homeInner) homeInner.classList.add('visible');
}

document.addEventListener('DOMContentLoaded', () => {
    initSectionFadeIn();
});


// =========================================================
// 事件綁定
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('menuButton')?.addEventListener('click', openMenu);
    document.getElementById('closeButton')?.addEventListener('click', closeMenu);
    document.getElementById('overlay')?.addEventListener('click', closeMenu);
    document.getElementById('favButton')?.addEventListener('click', () => {
        scrollToSection('favorites');
    });
    document.getElementById('returnTop')?.addEventListener('click', scrollToTop);

    document.querySelectorAll('#gameList a[data-game]').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            selectGame(a.dataset.game);
        });
    });

    document.getElementById('clearGameBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        clearGame();
    });

    document.querySelectorAll('#featureList a').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                scrollToSection(href.slice(1));
            }
        });
    });
});


// =========================================================
// 首頁打字機（首次進站）
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const descEl = document.getElementById('homeDesc');
        if (!descEl) return;
        const text = descEl.textContent;
        if (text && text.trim()) {
            typewriterText(descEl, text, 35);
        }
    }, 800);

    document.getElementById('homeDesc')?.addEventListener('click', skipTypewriter);
});


// =========================================================
// 頁面載入動畫
// =========================================================
(function initPageLoader() {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;

    const MIN_DURATION = 700;
    const start = Date.now();

    window.addEventListener('load', () => {
        const elapsed = Date.now() - start;
        const delay = Math.max(0, MIN_DURATION - elapsed);
        setTimeout(() => {
            loader.classList.add('hide');
            setTimeout(() => loader.remove(), 700);
        }, delay);
    });

    setTimeout(() => {
        if (document.body.contains(loader)) {
            loader.classList.add('hide');
            setTimeout(() => loader.remove(), 700);
        }
    }, 5000);
})();