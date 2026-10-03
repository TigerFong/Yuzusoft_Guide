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
    desc: '這個網站--柚子社攻略站(Yuzusoft Guide)是一個非官方粉絲站，專門收錄柚子社（YUZUSOFT）歷代作品的角色資料、劇情簡介與全路線攻略，涵蓋《千戀＊萬花》、《天使紛擾》、《星光咖啡館與死神之蝶》、《魔女的夜宴》等作品。網站提供角色查詢、故事介紹、路線攻略、全站搜索與角色篩選等功能，讓玩家能快速查找所需資訊。所有遊戲名稱、角色人設與相關版權均歸 YUZUSOFT 所有，本站僅供學習與交流使用。'
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

    updateHomeContent(gameName, true);
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

    updateHomeContent(null, true);
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
function updateHomeContent(gameName, animate = false) {
    const titleEl = document.getElementById('homeTitle');
    const subEl   = document.getElementById('homeSub');
    const descEl  = document.getElementById('homeDesc');

    const info = GAME_INFO[gameName] || DEFAULT_INFO;
    titleEl.textContent = info.title;
    subEl.textContent   = info.sub;

    // 打字機效果（只在 animate 為 true 且不排斥動畫時）
    if (animate && !shouldSkipTyping()) {
        typewriterText(descEl, info.desc);
    } else {
        // 直接顯示
        if (typewriterTimer) {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
        }
        descEl.classList.remove('typing');
        descEl.classList.add('done');
        descEl.textContent = info.desc;
    }
}

// ===== 打字機效果 =====
let typewriterTimer = null;
let typewriterEl = null;
let typewriterFullText = '';
let typewriterDone = true;

function typewriterText(el, text, speed = 30) {
    // 清除先前的計時器
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

// 立即完成打字
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

// 跳過打字（如果還在打）
function skipTypewriter() {
    if (!typewriterDone) {
        finishTypewriter();
    }
}

// 尊重使用者的「減少動態」設定
function shouldSkipTyping() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

// ===== 首次進站：首頁簡介打字機效果 =====
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const descEl = document.getElementById('homeDesc');
        if (!descEl) return;

        const text = descEl.textContent;
        if (text && text.trim()) {
            typewriterText(descEl, text, 35);
        }
    }, 800);

    // 點擊簡介卡片 → 跳過打字
    document.getElementById('homeDesc')?.addEventListener('click', skipTypewriter);
});

// ===== 命運邂逅 =====
let mmIndex = null;
let mmFilters = {
    height: 'all',
    body: 'all',
    age: 'all',
    personality: 'all'
};

// 體型歸類
function classifyBody(str) {
    if (!str) return '其他';
    if (/蘿莉|萝莉|娇小|嬌小/.test(str)) return '蘿莉';
    if (/少女|标准纤细|標準纖細|标准|標準/.test(str)) return '少女';
    if (/御姐|丰满|豐滿|高挑|勻稱|匀称/.test(str)) return '御姐';
    return '其他';
}

// 年齡歸類
function classifyAge(str) {
    if (!str) return 'unknown';
    if (/暂无|暫無|外表|成年/.test(str)) return 'unknown';
    const n = extractNumber(str);
    if (n === null) return 'unknown';
    if (n < 20) return 'teen';
    if (n < 30) return 'young';
    return 'old';
}

// 性格標籤
function classifyPersonality(str) {
    if (!str) return [];
    const tags = [];
    if (/認真|认真|努力|優等生|责任|負責/.test(str)) tags.push('認真');
    if (/溫柔|温柔|体贴|體貼|照顾|照顧|关怀|關懷|母性/.test(str)) tags.push('溫柔');
    if (/開朗|开朗|活泼|活力|热情|熱情|元氣/.test(str)) tags.push('開朗');
    if (/調皮|调皮|恶作剧|惡作劇|捉弄|玩笑|幽默/.test(str)) tags.push('調皮');
    if (/害羞|怕生|靦腆|内向|內向|纯情|純情/.test(str)) tags.push('害羞');
    if (/冷靜|冷静|寡言|沉稳|沉穩|理性|成熟/.test(str)) tags.push('冷靜');
    return tags;
}

async function buildMMIndex() {
    if (mmIndex) return mmIndex;

    mmIndex = [];
    const games = Object.keys(GAME_CODES);

    for (const game of games) {
        try {
            const res = await fetch(`/api/games/${encodeURIComponent(game)}/characters`);
            if (!res.ok) continue;
            const names = await res.json();
            const code = GAME_CODES[game];

            for (let i = 0; i < names.length; i++) {
                try {
                    const r = await fetch(`/api/characters/${encodeURIComponent(names[i])}`);
                    if (!r.ok) continue;
                    const char = await r.json();
                    mmIndex.push({
                        ...char,
                        game,
                        code,
                        index: i + 1,
                        heightNum: extractNumber(char.height) || 0,
                        bodyCat: classifyBody(char.body_type),
                        ageCat: classifyAge(char.age),
                        personalityTags: classifyPersonality(char.personality)
                    });
                } catch (e) {}
            }
        } catch (e) {}
    }

    return mmIndex;
}

function filterMMPool() {
    return mmIndex.filter(char => {
        if (mmFilters.height !== 'all') {
            const h = char.heightNum;
            if (h === 0) return false;
            if (mmFilters.height === 'short' && h >= 150) return false;
            if (mmFilters.height === 'medium' && (h < 150 || h >= 160)) return false;
            if (mmFilters.height === 'tall' && h < 160) return false;
        }
        if (mmFilters.body !== 'all' && char.bodyCat !== mmFilters.body) return false;
        if (mmFilters.age !== 'all' && char.ageCat !== mmFilters.age) return false;
        if (mmFilters.personality !== 'all' &&
            !char.personalityTags.includes(mmFilters.personality)) return false;
        return true;
    });
}

async function searchMatchmaker() {
    const btn = document.getElementById('mmSearch');
    const resultEl = document.getElementById('mmResult');

    if (!mmIndex) await buildMMIndex();

    const pool = filterMMPool();

    if (pool.length === 0) {
        resultEl.innerHTML = `
            <div class="mm-empty">
                <div class="mm-empty-title">沒有符合條件的角色</div>
                <div class="mm-empty-desc">試著放寬一些條件吧</div>
            </div>
        `;
        return;
    }

    btn.classList.add('rolling');
    btn.disabled = true;
    resultEl.innerHTML = '<p class="mm-hint">搜尋中…</p>';

    await new Promise(r => setTimeout(r, 300));

    renderMMList(pool);

    btn.classList.remove('rolling');
    btn.disabled = false;
}

function renderMMList(pool) {
    const resultEl = document.getElementById('mmResult');

    let html = '<div class="mm-result-grid">';
    html += `<div class="mm-result-count">共 ${pool.length} 位符合條件</div>`;

    pool.forEach(char => {
        const stats = [];
        if (char.height) stats.push(char.height);
        if (char.body_type) stats.push(char.bodyCat);

        html += `
            <div class="mm-result-item" data-game="${char.game}" data-name="${char.name}">
                <div class="mm-result-thumb"
                     style="background-image: url('picture/thumb-${char.code}-${char.index}.png')"></div>
                <div class="mm-result-name">${char.name}</div>
                <div class="mm-result-game">${char.game}</div>
                <div class="mm-result-stats">
                    ${stats.map(s => `<span class="mm-result-stat">${s}</span>`).join('')}
                </div>
            </div>
        `;
    });

    html += `
        <div class="mm-random-row">
            <button class="mm-btn-random" id="mmRandomBtn">🎲 從這 ${pool.length} 位隨機選一個</button>
        </div>
    `;

    html += '</div>';
    resultEl.innerHTML = html;

    resultEl.querySelectorAll('.mm-result-item').forEach(item => {
        item.addEventListener('click', () => {
            goToCharacter(item.dataset.game, item.dataset.name);
        });
    });

    document.getElementById('mmRandomBtn').addEventListener('click', () => {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        goToCharacter(pick.game, pick.name);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const bindGroup = (groupId, filterKey) => {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                mmFilters[filterKey] = btn.dataset.val;
            });
        });
    };

    bindGroup('mmHeight', 'height');
    bindGroup('mmBody', 'body');
    bindGroup('mmAge', 'age');
    bindGroup('mmPersonality', 'personality');

    document.getElementById('mmSearch')?.addEventListener('click', searchMatchmaker);
});

function extractNumber(str) {
    if (!str) return null;
    const m = String(str).match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
}

function extractAge(str) {
    if (!str) return null;
    const n = extractNumber(str);
    if (n === null) return 'unknown';
    if (n < 20) return 'teen';
    if (n < 30) return 'young';
    return 'old';
}

// ===== 回到頂部 =====
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 滾動時顯示/隱藏按鈕
function updateReturnTopBtn() {
    const btn = document.getElementById('returnTop');
    if (!btn) return;

    if (window.scrollY > 300) {
        btn.classList.add('show');
    } else {
        btn.classList.remove('show');
    }
}

window.addEventListener('scroll', updateReturnTopBtn, { passive: true });

// 初始化
document.addEventListener('DOMContentLoaded', updateReturnTopBtn);

// =========================================================
// 隱藏彩蛋
// =========================================================

// ===== 彩蛋 1：Konami 密碼（↑↑↓↓←→←→BA） =====
const KONAMI_CODE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    // 不要在輸入框裡觸發
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

// 角色頭像雨
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

    const count = 40;

    for (let i = 0; i < count; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';

        const thumb = EASTER_THUMBS[Math.floor(Math.random() * EASTER_THUMBS.length)];
        drop.style.backgroundImage = `url('picture/thumb-${thumb}.png')`;

        // 隨機水平位置、大小、速度、延遲
        drop.style.left = Math.random() * 100 + '%';
        const size = 40 + Math.random() * 40;
        drop.style.width = size + 'px';
        drop.style.height = size + 'px';
        drop.style.animationDuration = (2.5 + Math.random() * 2) + 's';
        drop.style.animationDelay = (Math.random() * 1.5) + 's';

        layer.appendChild(drop);
    }

    // 6 秒後移除
    setTimeout(() => layer.remove(), 6000);
}

// ===== 彩蛋 2：搜尋「ciallo」 =====
const _originalPerformSearch = performSearch;
performSearch = async function(query) {
    const q = query.trim().toLowerCase();

    // 檢測 ciallo 彩蛋
    if (q === 'ciallo' || q === 'ciallo～' || q === 'ciallo~' || q === '(∠·ω<)') {
        const resultsEl = document.getElementById('searchResults');
        resultsEl.innerHTML = `
            <div class="search-result-item search-result-special"
                 data-game="魔女的夜宴" data-name="因幡巡">
                <div class="search-result-thumb"
                     style="background-image: url('picture/thumb-sabbat-2.png')"></div>
                <div class="search-result-info">
                    <div class="search-result-name">因幡巡</div>
                    <div class="search-result-game">魔女的夜宴</div>
                </div>
            </div>
        `;
        resultsEl.classList.add('show');

        // 綁定點擊
        resultsEl.querySelector('.search-result-item').addEventListener('click', () => {
            goToCharacter('魔女的夜宴', '因幡巡');
        });

        // 顯示提示
        showEasterToast('⭐ Ciallo～(∠·ω< )⌒★', '因幡巡向你打招呼！');
        return;
    }

    // 其他情況走原本邏輯
    return _originalPerformSearch.call(this, query);
};

// ===== 彩蛋 3：點擊標題 10 次 =====
let titleClickCount = 0;
let titleClickTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    const brand = document.querySelector('.brand');
    if (!brand) return;

    brand.addEventListener('click', () => {
        titleClickCount++;
        brand.classList.add('pressed');
        setTimeout(() => brand.classList.remove('pressed'), 300);

        // 2 秒內沒繼續點就重置
        clearTimeout(titleClickTimer);
        titleClickTimer = setTimeout(() => {
            titleClickCount = 0;
        }, 2000);

        if (titleClickCount === 10) {
            triggerCharacterRain();
            showEasterToast('🍊 柚子社攻略站', '感謝你的支持！繼續探索吧～');
            titleClickCount = 0;
        }
    });
});

// ===== 提示框共用函式 =====
let toastTimer = null;

function showEasterToast(title, desc = '') {
    // 移除舊的
    const old = document.querySelector('.easter-toast');
    if (old) old.remove();

    clearTimeout(toastTimer);

    const toast = document.createElement('div');
    toast.className = 'easter-toast';
    toast.innerHTML = `
        <span class="toast-title">${title}</span>
        ${desc ? `<span class="toast-desc">${desc}</span>` : ''}
    `;
    document.body.appendChild(toast);

    // 觸發動畫
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 4 秒後淡出
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ===== 彩蛋 4：雙擊角色頭像 =====
document.addEventListener('dblclick', (e) => {
    const navItem = e.target.closest('.char-nav-item');
    if (navItem) {
        triggerHeartBurst(e.clientX, e.clientY);
        return;
    }

    // 雙擊立繪也可以
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
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 30;

        heart.style.setProperty('--dx', dx + 'px');
        heart.style.setProperty('--dy', dy + 'px');

        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1100);
    }
}

// ===== 彩蛋 5：連續切換遊戲 5 次 =====
let switchGameCount = 0;
let switchGameTimer = null;

const _originalSelectGame = selectGame;
selectGame = async function(gameName) {
    // 記錄切換
    switchGameCount++;
    clearTimeout(switchGameTimer);
    switchGameTimer = setTimeout(() => {
        switchGameCount = 0;
    }, 8000);

    if (switchGameCount === 5) {
        showEasterToast('🤔 你是在猶豫嗎？', '每部作品都很棒，慢慢選吧～');
        switchGameCount = 0;
    }

    return _originalSelectGame.call(this, gameName);
};

// ===== 彩蛋 6：命運邂逅選「蘿莉 + 30+」 =====
const _originalSearchMatchmaker = searchMatchmaker;
searchMatchmaker = async function() {
    const result = await _originalSearchMatchmaker.call(this);

    // 檢查是否選了「蘿莉 + 30+」這種特殊組合
    if (mmFilters.body === '蘿莉' && mmFilters.age === 'old') {
        setTimeout(() => {
            showEasterToast('🧙 找到了長生不老的蘿莉！', '500 歲的叢雨報到～');
        }, 400);
    }

    return result;
};

// ===== 彩蛋 7：連續點「回到頂部」5 次 =====
let returnTopCount = 0;
let returnTopTimer = null;

const _originalScrollToTop = scrollToTop;
scrollToTop = function() {
    returnTopCount++;
    clearTimeout(returnTopTimer);
    returnTopTimer = setTimeout(() => {
        returnTopCount = 0;
    }, 3000);

    if (returnTopCount === 5) {
        showEasterToast('🚀 已經很上面了～', '你是想飛到宇宙嗎？');
        returnTopCount = 0;
    }

    return _originalScrollToTop.call(this);
};

// ===== 彩蛋 8：搜尋「柚子」 =====
const _originalPerformSearch2 = performSearch;
performSearch = async function(query) {
    const q = query.trim().toLowerCase();

    if (q === '柚子' || q === 'yuzu' || q === 'yuzusoft') {
        showEasterToast('🍊 柚子社 YUZUSOFT', '感謝你喜歡柚子社的作品！');
        // 繼續正常搜索
    }

    return _originalPerformSearch2.call(this, query);
};