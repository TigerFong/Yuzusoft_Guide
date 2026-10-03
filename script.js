let currentGame = null;

// 各遊戲的背景圖
const GAME_BACKGROUNDS = {
    '千戀＊萬花': 'picture/bg-senren.jpg',
    '天使紛擾': 'picture/bg-tenshi.jpg',
    '星光咖啡館與死神之蝶': 'picture/bg-cafe.jpg',
    '魔女的夜宴': 'picture/bg-sabbat.jpg'
};

// 各遊戲的首頁介紹
const GAME_INFO = {
    '千戀＊萬花': {
        title: '千戀＊萬花',
        sub: 'senren banka',
        desc: '《千戀＊萬花》是柚子社於2016年推出、以和風溫泉小鎮為背景的超人氣美少女遊戲作品，憑藉精緻細膩的畫面、頂級的音樂演出以及極具魅力的角色塑造，在海內外Galgame玩家群體中享有極高的口碑與熱度。'
    },
    '天使紛擾': {
        title: '天使紛擾',
        sub: 'tenshi souzou',
        desc: '《天使☆囂嚣 RE-BOOT!》（又譯《天使☆紛擾》）是日本知名美少女遊戲品牌柚子社（YUZUSOFT）於2023年推出的人氣視覺小說作品，延續了該品牌一貫精緻流暢的高畫質作畫、強大的製作陣容與歡樂輕鬆的萌系風格，在推出後同樣於海內外玩家間獲得了極高的熱度與優秀口碑。'
    },
    '星光咖啡館與死神之蝶': {
        title: '星光咖啡館與死神之蝶',
        sub: 'cafe stella',
        desc: '《星光咖啡館與死神之蝶》（喫茶ステラと死神の蝶）是日本知名美少女遊戲品牌柚子社（YUZUSOFT）於2019年推出的超人氣視覺小說作品，故事以一間名為「星光咖啡館」的店鋪為舞台，講述了因意外而獲得重啟時間機會的男主角，與自稱死神的少女以及性格各異的女主角們一同經營咖啡館、交織出浪漫且溫馨日常的戀愛故事。'
    },
    '魔女的夜宴': {
        title: '魔女的夜宴',
        sub: 'sabbat of the witch',
        desc: '《魔女的夜宴》（サノバウィッチ）是日本知名美少女遊戲品牌柚子社（YUZUSOFT）於2015年推出的超人氣美少女遊戲作品，憑藉著精緻甜美的畫風、歡樂逗趣的日常互動以及極具特色的角色塑造，在海內外Galgame玩家群體中獲得了極高的評價與喜愛。'
    }
};

// 預設首頁介紹（未選遊戲時）
const DEFAULT_INFO = {
    title: '柚子社攻略站',
    sub: 'yuzusoft guide',
    desc: '柚子社（YUZUSOFT）是一家成立於 2006 年的日本知名美少女遊戲（Galgame）品牌，長期以來以製作風格輕鬆溫馨、戀愛日常甜蜜、角色塑造討喜且視覺與介面製作精緻高水準的萌系視覺小說聞名，並在《千戀＊萬花》、《RIDDLE JOKER》以及《天使☆騷動 RE-BOOT!》等多部熱門作品的推動下，成為亞洲 Galgame 界最具代表性與影響力的頂尖品牌之一。'
};

// 柚子社 logo 背景（預設）
const DEFAULT_BG = {
    image: "url('picture/yuzusoft-logo.jpg')",
    size: 'cover',
    color: '#fdfaf3'
};

// 各遊戲的故事介紹圖片
const GAME_STORIES = {
    '千戀＊萬花': 'picture/story-senren.jpg',
    '天使紛擾': 'picture/story-tenshi.jpg',
    '星光咖啡館與死神之蝶': 'picture/story-cafe.jpg',
    '魔女的夜宴': 'picture/story-sabbat.jpg'
};

// 角色索引快取（角色名 → 圖片編號）
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
// 遊戲代碼（用於圖片命名）
const GAME_CODES = {
    '千戀＊萬花': 'senren',
    '天使紛擾': 'tenshi',
    '星光咖啡館與死神之蝶': 'cafe',
    '魔女的夜宴': 'sabbat'
};

// ===== 選單開關 =====
function openMenu() {
    document.getElementById('sideMenu').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

function closeMenu() {
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

// ===== 設定背景 =====
function setBackground(image, size, color) {
    const root = document.documentElement;
    root.style.setProperty('--bg-image', image);
    root.style.setProperty('--bg-size', size);
    root.style.setProperty('--bg-color', color);
}

// ===== 選擇遊戲 =====
async function selectGame(gameName) {
    currentGame = gameName;

    document.querySelectorAll('#gameList a').forEach(a => {
        a.classList.toggle('active', a.dataset.game === gameName);
    });

    ['character', 'story', 'guide'].forEach(f => {
        const el = document.querySelector(`#featureList a[onclick*="${f}"]`);
        if (el) el.classList.remove('disabled');
    });

    const bgUrl = GAME_BACKGROUNDS[gameName];
    if (bgUrl) {
        setBackground(`url('${bgUrl}')`, 'cover', '#1a0e05');
    }

    updateHomeContent(gameName);
    updateStoryContent(gameName);
    document.body.classList.add('has-game');

    closeMenu();

    await Promise.all([
        renderCharacters(gameName),
        renderGuides(gameName)
    ]);
}

// ===== 取消選擇遊戲 =====
function clearGame() {
    currentGame = null;

    document.querySelectorAll('#gameList a').forEach(a => {
        a.classList.remove('active');
    });

    document.querySelectorAll('#featureList a.game-feature').forEach(a => {
        a.classList.add('disabled');
    });

    document.body.classList.remove('has-game');

    setBackground(DEFAULT_BG.image, DEFAULT_BG.size, DEFAULT_BG.color);

    updateHomeContent(null);
    updateStoryContent(null);
    renderCharacters(null);

    scrollToSection('home');

    closeMenu();
}

// ===== 滾動到指定區塊 =====
function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const featureLink = document.querySelector(`#featureList a[onclick*="${sectionId}"]`);
    if (featureLink && featureLink.classList.contains('disabled')) return;

    closeMenu();

    const topbarHeight = document.querySelector('.topbar-inner').offsetHeight + 30;
    const targetY = target.getBoundingClientRect().top + window.scrollY - topbarHeight;

    window.scrollTo({ top: targetY, behavior: 'smooth' });
}

// ===== 滾動時更新側邊選單高亮 =====
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

// ===== ESC 關閉選單 =====
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
});

// ===== 更新故事內容 =====
function updateStoryContent(gameName) {
    const imgEl = document.getElementById('storyImage');
    const placeholderEl = document.getElementById('storyPlaceholder');
    if (!imgEl || !placeholderEl) return;

    const imgSrc = GAME_STORIES[gameName];

    if (imgSrc) {
        imgEl.src = imgSrc;
        imgEl.classList.add('show');
        placeholderEl.classList.add('hide');
    } else {
        imgEl.removeAttribute('src');
        imgEl.classList.remove('show');
        placeholderEl.classList.remove('hide');
    }
}

// ===== 更新首頁內容 =====
function updateHomeContent(gameName) {
    const titleEl = document.getElementById('homeTitle');
    const subEl   = document.getElementById('homeSub');
    const descEl  = document.getElementById('homeDesc');

    const info = GAME_INFO[gameName] || DEFAULT_INFO;
    titleEl.textContent = info.title;
    subEl.textContent   = info.sub;
    descEl.textContent  = info.desc;
}

// ===== 引導提示 =====
function hideGuideTip() {
    const tip = document.getElementById('guideTip');
    if (tip && !tip.classList.contains('hide')) {
        tip.classList.add('hide');
    }
}

// 首次開啟選單時隱藏引導
const _originalOpenMenu = openMenu;
openMenu = function () {
    hideGuideTip();
    _originalOpenMenu();
};

// 8 秒後自動隱藏
setTimeout(hideGuideTip, 8000);

// ===== 渲染角色介紹（從 API 讀取） =====
async function renderCharacters(gameName) {
    const navEl = document.getElementById('charNav');
    const portraitEl = document.getElementById('charPortrait');
    const nameEl = document.getElementById('charName');
    const cvEl = document.getElementById('charCv');
    const descEl = document.getElementById('charDesc');

    navEl.innerHTML = '';

    // 未選遊戲 → 清空
    if (!gameName) {
        portraitEl.style.backgroundImage = '';
        nameEl.textContent = '';
        cvEl.textContent = '';
        descEl.innerHTML = '';
        return;
    }

    // 1. 從 API 取得角色名稱列表
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

    // 2. 並行取得每個角色的詳細資料
    const chars = await Promise.all(names.map(async (name) => {
        try {
            const res = await fetch(`/api/characters/${encodeURIComponent(name)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.error('讀取角色失敗:', name, e);
        }
        return { name };
    }));

    const code = GAME_CODES[gameName] || 'game';

    // 3. 產生頂部頭像按鈕
    chars.forEach((char, index) => {
        const item = document.createElement('div');
        item.className = 'char-nav-item' + (index === 0 ? ' active' : '');

        const thumb = document.createElement('div');
        thumb.className = 'char-nav-thumb';
        thumb.style.backgroundImage = `url('picture/thumb-${code}-${index + 1}.png')`;

        const label = document.createElement('div');
        label.className = 'char-nav-label';
        label.textContent = char.name;

        item.appendChild(thumb);
        item.appendChild(label);
        item.addEventListener('click', () => selectCharacter(chars, index, code));
        navEl.appendChild(item);
    });

    // 4. 預設顯示第一位
    selectCharacter(chars, 0, code);
}

// ===== 切換角色 =====
function selectCharacter(chars, index, code) {
    const char = chars[index];
    const portraitEl = document.getElementById('charPortrait');
    const nameEl = document.getElementById('charName');
    const cvEl = document.getElementById('charCv');
    const descEl = document.getElementById('charDesc');

    document.querySelectorAll('#charNav .char-nav-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    portraitEl.style.backgroundImage = `url('picture/char-${code}-${index + 1}.png')`;

    nameEl.textContent = char.name;
    cvEl.textContent = char.cv ? 'CV：' + char.cv : '';

    // 資料列（依 data.py 欄位）
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
            html += `<div class="row"><div class="key">${key}</div><div class="val">${val}</div></div>`;
        }
    });

    descEl.innerHTML = html || '<p class="placeholder-text">暫無資料。</p>';
}

// ===== 渲染攻略（從 API 讀取） =====
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

    // 攻略名單
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

    // 角色索引（和角色介紹區同一套圖）
    const map = await getCharIndexMap(gameName);

    // 攻略詳情
    const guides = await Promise.all(guideNames.map(async (name) => {
        try {
            const res = await fetch(`/api/guides/${encodeURIComponent(name)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.error('讀取攻略失敗:', name, e);
        }
        return { character_name: name, options: [] };
    }));

    const code = GAME_CODES[gameName] || 'game';

    // 頂部頭像
    guides.forEach((guide, index) => {
        const item = document.createElement('div');
        item.className = 'char-nav-item' + (index === 0 ? ' active' : '');

        const thumb = document.createElement('div');
        thumb.className = 'char-nav-thumb';

        const n = map[guide.character_name];
        if (n) {
            thumb.style.backgroundImage = `url('picture/thumb-${code}-${n}.png')`;
        }

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

// ===== 切換攻略 =====
function selectGuide(guides, index, code, map) {
    const guide = guides[index];
    const portraitEl = document.getElementById('guidePortrait');
    const nameEl = document.getElementById('guideName');
    const routeEl = document.getElementById('guideRoute');
    const optionsEl = document.getElementById('guideOptions');

    document.querySelectorAll('#guideNav .char-nav-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    // 立繪（和角色介紹區同一套圖）
    const n = map[guide.character_name];
    if (n) {
        portraitEl.style.backgroundImage = `url('picture/char-${code}-${n}.png')`;
    } else {
        portraitEl.style.backgroundImage = '';
    }

    nameEl.textContent = guide.character_name;
    routeEl.textContent = '路線攻略';

    const options = guide.options || [];
    if (options.length === 0) {
        optionsEl.innerHTML = '<p class="placeholder-text">暫無攻略選項。</p>';
        return;
    }

    let html = '<ol class="guide-option-list">';
    options.forEach((opt) => {
        if (opt && opt.trim()) {
            html += `<li class="guide-option-item">${opt}</li>`;
        }
    });
    html += '</ol>';
    optionsEl.innerHTML = html;
}

// ===== 搜索 =====
let searchIndex = null;
let searchBuilt = false;

// 建立搜索索引（首次聚焦時才建）
async function buildSearchIndex() {
    if (searchBuilt) return searchIndex;

    searchIndex = [];
    const games = Object.keys(GAME_CODES);

    for (const game of games) {
        try {
            const res = await fetch(`/api/games/${encodeURIComponent(game)}/characters`);
            if (res.ok) {
                const names = await res.json();
                const code = GAME_CODES[game];
                names.forEach((name, i) => {
                    searchIndex.push({
                        name,
                        game,
                        code,
                        index: i + 1
                    });
                });
            }
        } catch (e) {
            console.error('建立索引失敗:', game, e);
        }
    }

    searchBuilt = true;
    return searchIndex;
}

// 執行搜索
async function performSearch(query) {
    const resultsEl = document.getElementById('searchResults');
    const q = query.trim().toLowerCase();

    if (!q) {
        resultsEl.classList.remove('show');
        resultsEl.innerHTML = '';
        return;
    }

    const index = await buildSearchIndex();
    const matches = index.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.game.toLowerCase().includes(q)
    ).slice(0, 10);

    if (matches.length === 0) {
        resultsEl.innerHTML = '<div class="search-result-empty">沒有找到符合的角色</div>';
        resultsEl.classList.add('show');
        return;
    }

    resultsEl.innerHTML = '';
    matches.forEach(item => {
        const el = document.createElement('div');
        el.className = 'search-result-item';

        const thumb = document.createElement('div');
        thumb.className = 'search-result-thumb';
        thumb.style.backgroundImage = `url('picture/thumb-${item.code}-${item.index}.png')`;

        const info = document.createElement('div');
        info.className = 'search-result-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'search-result-name';
        nameEl.textContent = item.name;

        const gameEl = document.createElement('div');
        gameEl.className = 'search-result-game';
        gameEl.textContent = item.game;

        info.appendChild(nameEl);
        info.appendChild(gameEl);
        el.appendChild(thumb);
        el.appendChild(info);

        el.addEventListener('click', () => {
            goToCharacter(item.game, item.name);
        });

        resultsEl.appendChild(el);
    });

    resultsEl.classList.add('show');
}

// 跳轉到指定角色
async function goToCharacter(gameName, charName) {
    // 清空搜索
    const input = document.getElementById('searchInput');
    const resultsEl = document.getElementById('searchResults');
    input.value = '';
    resultsEl.classList.remove('show');
    resultsEl.innerHTML = '';
    input.blur();

    // 切換遊戲（如果不同）
    if (currentGame !== gameName) {
        await selectGame(gameName);
    }

    // 等 DOM 更新
    await new Promise(r => setTimeout(r, 50));

    // 找到角色按鈕並點擊
    const navItems = document.querySelectorAll('#charNav .char-nav-item');
    for (const item of navItems) {
        const label = item.querySelector('.char-nav-label');
        if (label && label.textContent === charName) {
            item.click();
            break;
        }
    }

    // 滾動到角色介紹
    scrollToSection('character');
}

// 綁定搜索事件
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchInput');
    if (!input) return;

    let debounceTimer = null;

    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performSearch(e.target.value);
        }, 150);
    });

    input.addEventListener('focus', async () => {
        await buildSearchIndex();
        if (input.value.trim()) performSearch(input.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            input.value = '';
            document.getElementById('searchResults').classList.remove('show');
            input.blur();
        }
    });
});

// 點擊空白處收起搜索結果
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
        document.getElementById('searchResults')?.classList.remove('show');
    }
});