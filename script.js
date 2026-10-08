let currentGame = null;

// ===== 簡轉繁（只轉用戶輸入，數據本身是繁體） =====
const SIMP_TO_TRAD = {
    // 名字常用字
    '丛':'叢','陆':'陸','马':'馬','芦':'蘆','爱':'愛','风':'風','音':'音',
    '云':'雲','辉':'輝','欧':'歐','丽':'麗','叶':'葉','实':'實','花':'花',
    '绫':'綾','宁':'寧','叶':'葉','䌷':'紬','户':'戶','隐':'隱','凉':'涼',
    '伪':'偽','仮':'仮',
    // 體型 / 年齡
    '萝':'蘿','莉':'莉','娇':'嬌','小':'小','丰':'豐','满':'滿','纤':'纖',
    '细':'細','标':'標','准':'準','匀':'勻','称':'稱','高':'高','挑':'挑',
    '岁':'歲',
    // 性格
    '认':'認','真':'真','温':'溫','柔':'柔','开':'開','朗':'朗','调':'調',
    '皮':'皮','害':'害','羞':'羞','冷':'冷','静':'靜','活':'活','泼':'潑',
    '乖':'乖','巧':'巧','直':'直','率':'率','随':'隨','和':'和','爽':'爽',
    '拘':'拘','节':'節','执':'執','着':'著','板':'板','眼':'眼','变':'變',
    '通':'通','显':'顯','笨':'笨','拙':'拙','私':'私','下':'下','黏':'黏',
    '人':'人','熟':'熟','寂':'寂','寞':'寞','恶':'惡','作':'作','剧':'劇',
    '疼':'疼','软':'軟','糯':'糯','容':'容','易':'易','恋':'戀','后':'後',
    '很':'很','怀':'懷','母':'母','性':'性','关':'關','照':'照','顾':'顧',
    '体':'體','贴':'貼','照':'照','顾':'顧','强':'強','调':'調','皮':'皮',
    '纯':'純','情':'情','靦':'靦','腆':'腆','内':'內','向':'向','沉':'沉',
    '稳':'穩','理':'理','成':'成','熟':'熟','公':'公','反':'反','差':'差',
    '大':'大','私':'私',
    // 身份
    '织':'織','穗':'穗','建':'建','神':'神','社':'社','巫':'巫','女':'女',
    '姬':'姬','护':'護','卫':'衛','寄':'寄','宿':'宿','刀':'刀','灵':'靈',
    '魂':'魂','管':'管','理':'理','者':'者','守':'守','魔':'魔','王':'王',
    '转':'轉','世':'世','主':'主','人':'人','公':'公','天':'天','使':'使',
    '留':'留','学':'學','生':'生','芬':'芬','兰':'蘭','来':'來','日':'日',
    '本':'本','镇':'鎮','表':'表','妹':'妹','死':'死','员':'員','馆':'館',
    '店':'店','学':'學','生':'生','会':'會','长':'長','侍':'侍','从':'從',
    '师':'師','教':'教','班':'班','主':'主','任':'任','旧':'舊','识':'識',
    '大':'大','学':'學','生':'生','西':'西','点':'點','甜':'甜','品':'品',
    // 喜好 / 討厭
    '恶':'惡','作':'作','剧':'劇','读':'讀','漫':'漫','画':'畫','动':'動',
    '画':'畫','食':'食','美':'美','游':'遊','戏':'戲','朋':'朋','友':'友',
    '玩':'玩','猫':'貓','甜':'甜','食':'食','毛':'毛','绒':'絨','具':'具',
    '厨':'廚','房':'房','学':'學','习':'習','研':'研','磨':'磨','咖':'咖',
    '啡':'啡','宁':'寧','静':'靜','氛':'氛','围':'圍','喧':'喧','闹':'鬧',
    '打':'打','扰':'擾','粗':'粗','制':'製','滥':'濫','造':'造','浪':'浪',
    '费':'費','骄':'驕','傲':'傲','独':'獨','处':'處','排':'排','挤':'擠',
    '继':'繼','承':'承','体':'體','重':'重','增':'增','加':'加','幽':'幽',
    '灵':'靈','鬼':'鬼','怪':'怪','孤':'孤','独':'獨','寂':'寂','寞':'寞',
    '恐':'恐','怖':'怖','故':'故','事':'事','戳':'戳','破':'破','心':'心',
    '事':'事',
    // 服裝
    '服':'服','装':'裝','巫':'巫','女':'女','和':'和','校':'校','经':'經',
    '典':'典','忍':'忍','者':'者','私':'私','便':'便','神':'神','刀':'刀',
    '甜':'甜','点':'點','店':'店','工':'工','作':'作','天':'天','使':'使',
    '侍':'侍','从':'從','教':'教','师':'師','职':'職','业':'業','死':'死',
    '神':'神','咖':'咖','啡':'啡','馆':'館','女':'女','仆':'僕','厨':'廚',
    '师':'師','常':'常','泳':'泳','装':'裝','浴':'浴','衣':'衣','魔':'魔',
    '星':'星','币':'幣','斗':'斗','篷':'篷','粉':'粉','色':'色','荷':'荷',
    '叶':'葉','边':'邊','套':'套','袖':'袖'
};

function simpToTrad(str) {
    if (!str) return '';
    return String(str).split('').map(c => SIMP_TO_TRAD[c] || c).join('');
}

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

    // 4. 預設顯示第一位（不上報瀏覽量）
    selectCharacter(chars, 0, code, false);
}

// ===== 切換角色 =====
function selectCharacter(chars, index, code, trackView = true) {
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

    // 記錄瀏覽量：前端去重（同一天同角色只上報一次）
    if (trackView && char.name && !hasViewedToday(char.name)) {
        markViewedToday(char.name);   // 先標記，避免連點重複送

        fetch(`/api/view/${encodeURIComponent(char.name)}`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                // 只有後端真的 +1 才刷新排行榜
                if (data.counted) refreshRanking();
            })
            .catch(() => {});
    }

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

// =========================================================
// 搜索（增强版：字段权重 + 排除 + 同义词 + 攻略 + 高亮 + 历史 + 键盘 + 拼音 + 建议 + 分组）
// =========================================================

const WEIGHT_HIGH = 3;
const WEIGHT_MID  = 2;
const WEIGHT_LOW  = 1;
const _EXACT  = 60;
const _PREFIX = 40;
const _SUBSTR = 20;
const _MAX_SCORE = 100;
const HISTORY_KEY = 'yuzu-search-history';
const HISTORY_MAX = 8;

// ===== 角色名拼音（首字母 + 全拼）=====
const PINYIN_MAP = {
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
};

function getPinyin(name) {
    return (PINYIN_MAP[name] || []).join(' ');
}

// ===== 同义词 =====
const SYNONYMS = {
    '蘿莉': ['蘿莉', '萝莉', 'loli'],
    '少女': ['少女', 'girl'],
    '御姐': ['御姐', '御姊'],
    '巫女': ['巫女', 'miko'],
    '魔女': ['魔女', 'witch'],
    '死神': ['死神', 'reaper'],
    '學生': ['學生', '学生'],
    '甜食': ['甜食', '甜點', '甜点'],
};

function expandKeyword(kw) {
    const lower = kw.toLowerCase();
    for (const group of Object.values(SYNONYMS)) {
        if (group.map(g => g.toLowerCase()).includes(lower)) {
            return group.map(g => g.toLowerCase());
        }
    }
    return [lower];
}

// ===== 字段权重 =====
function buildCharFields(char) {
    return [
        { label: '名稱', value: char.name        || '', weight: WEIGHT_HIGH },
        { label: '身份', value: char.identity    || '', weight: WEIGHT_HIGH },
        { label: '體型', value: char.body_type   || '', weight: WEIGHT_MID  },
        { label: '性格', value: char.personality || '', weight: WEIGHT_MID  },
        { label: '喜好', value: (char.likes    || []).join(' '), weight: WEIGHT_MID },
        { label: '討厭', value: (char.dislikes || []).join(' '), weight: WEIGHT_MID },
        { label: '服裝', value: (char.clothes  || []).join(' '), weight: WEIGHT_MID },
        { label: '年齡', value: char.age         || '', weight: WEIGHT_LOW  },
        { label: '身高', value: char.height      || '', weight: WEIGHT_LOW  },
    ];
}

// ===== 解析查询 =====
function parseQuery(raw) {
    if (!raw) return { include: [], exclude: [] };
    const tokens = raw.replace(/\u3000/g, ' ').split(/\s+/).filter(Boolean);
    const include = [], exclude = [];
    for (const t of tokens) {
        if (t.startsWith('-') && t.length > 1) exclude.push(t.slice(1));
        else include.push(t);
    }
    return { include, exclude };
}

// ===== 打分 =====
function scoreObject(item, fields, includeGroups, excludeGroups, pinyinText) {
    if (includeGroups.length === 0) return null;

    // 拼音也算入搜索文本
    const allFields = pinyinText
        ? [...fields, { label: '拼音', value: pinyinText, weight: WEIGHT_MID }]
        : fields;

    // 排除检查
    for (const group of excludeGroups) {
        for (const f of allFields) {
            const text = (f.value || '').toLowerCase();
            if (!text) continue;
            for (const kw of group) {
                if (kw && text.includes(kw)) return null;
            }
        }
    }

    // 包含 + 打分
    let total = 0;
    const matchedFields = [];
    const matchedKeywords = [];

    for (const group of includeGroups) {
        const primary = group[0];
        let groupHit = false;
        for (const f of allFields) {
            const text = (f.value || '').toLowerCase();
            if (!text) continue;
            for (const kw of group) {
                if (!kw) continue;
                if (text === kw)              { total += _EXACT  * f.weight; groupHit = true; }
                else if (text.startsWith(kw)) { total += _PREFIX * f.weight; groupHit = true; }
                else if (text.includes(kw))   { total += _SUBSTR * f.weight; groupHit = true; }
                else continue;
                if (!matchedFields.includes(f.label)) matchedFields.push(f.label);
                break;
            }
        }
        if (!groupHit) return null;
        matchedKeywords.push(primary);
    }

    return { item, score: Math.min(total, _MAX_SCORE), matchedFields, matchedKeywords };
}

// ===== 高亮 =====
function highlightText(text, keywords) {
    if (!text) return '';
    if (!keywords || !keywords.length) return escapeHtml(text);

    let out = escapeHtml(text);
    const sorted = [...new Set(keywords.filter(Boolean))].sort((a, b) => b.length - a.length);

    for (const kw of sorted) {
        const re = new RegExp(escapeRegex(kw), 'gi');
        out = out.replace(re, m => `<mark>${m}</mark>`);
    }
    return out;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== 索引 =====
let searchIndex = null;
let searchIndexPromise = null;

async function buildSearchIndex() {
    if (searchIndex) return searchIndex;
    if (searchIndexPromise) return searchIndexPromise;

    searchIndexPromise = (async () => {
        const index = [];

        for (const game of Object.keys(GAME_CODES)) {
            try {
                const res = await fetch(`/api/games/${encodeURIComponent(game)}/characters`);
                if (!res.ok) continue;
                const names = await res.json();
                const code = GAME_CODES[game];

                // 角色
                for (let i = 0; i < names.length; i++) {
                    try {
                        const r = await fetch(`/api/characters/${encodeURIComponent(names[i])}`);
                        if (!r.ok) continue;
                        const char = await r.json();
                        index.push({
                            type: 'character',
                            name: char.name,
                            game, code,
                            index: i + 1,
                            fields: buildCharFields(char),
                            pinyin: getPinyin(char.name),
                            raw: char,
                        });
                    } catch (e) {}
                }

                // 攻略
                try {
                    const gr = await fetch(`/api/games/${encodeURIComponent(game)}/guides`);
                    if (gr.ok) {
                        const guideNames = await gr.json();
                        for (const gname of guideNames) {
                            try {
                                const rr = await fetch(`/api/guides/${encodeURIComponent(gname)}`);
                                if (!rr.ok) continue;
                                const guide = await rr.json();
                                const charIdx = names.indexOf(gname) + 1;
                                (guide.options || []).forEach((opt, oi) => {
                                    if (!opt || !opt.trim()) return;
                                    index.push({
                                        type: 'guide',
                                        name: gname,
                                        option: opt,
                                        optionIndex: oi + 1,
                                        game, code,
                                        index: charIdx,
                                        fields: [
                                            { label: '攻略選項', value: opt, weight: WEIGHT_HIGH },
                                            { label: '角色', value: gname, weight: WEIGHT_MID },
                                        ],
                                        pinyin: '',
                                    });
                                });
                            } catch (e) {}
                        }
                    }
                } catch (e) {}

            } catch (e) {
                console.error('建立索引失敗:', game, e);
            }
        }

        searchIndex = index;
        return index;
    })();

    return searchIndexPromise;
}

// ===== 搜索历史 =====
function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) { return []; }
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

// ===== 建议 =====
function getSuggestions(query, index) {
    const q = query.toLowerCase();
    const words = new Set();
    for (const item of index) {
        for (const f of item.fields) {
            const v = (f.value || '').trim();
            if (!v) continue;
            if (v.toLowerCase().includes(q) && v.length <= 12) {
                words.add(v);
            }
        }
    }
    return [...words].sort((a, b) => a.length - b.length).slice(0, 6);
}

// ===== UI 状态 =====
let searchState = {
    hits: [],
    selectedIndex: -1,
    activeTab: 'all',
    showHistory: false,
};

// ===== 渲染结果 =====
function renderSearchResults(resultsEl, hits, keywords) {
    searchState._id = 0;

    // 顶部建议（用输入框当前词）
    const input = document.getElementById('searchInput');
    const currentQ = (input?.value || '').trim();
    const suggestionsHtml = buildSuggestionsHtml(currentQ);

    if (hits.length === 0) {
        resultsEl.innerHTML = suggestionsHtml +
            '<div class="search-result-empty">沒有找到符合的角色</div>';
        resultsEl.classList.add('show');
        bindSuggestionClicks(resultsEl);
        return;
    }

    // Tab 过滤
    let filtered = hits;
    if (searchState.activeTab === 'character') filtered = hits.filter(h => h.item.type === 'character');
    if (searchState.activeTab === 'guide')     filtered = hits.filter(h => h.item.type === 'guide');

    // 按游戏分组
    const groups = {};
    filtered.forEach(h => {
        const g = h.item.game;
        if (!groups[g]) groups[g] = [];
        groups[g].push(h);
    });

    // Tab 栏
    let html = suggestionsHtml + '<div class="search-tabs">';
    const counts = {
        all: hits.length,
        character: hits.filter(h => h.item.type === 'character').length,
        guide: hits.filter(h => h.item.type === 'guide').length,
    };
    html += `<button class="search-tab ${searchState.activeTab === 'all' ? 'active' : ''}" data-tab="all">全部 ${counts.all}</button>`;
    html += `<button class="search-tab ${searchState.activeTab === 'character' ? 'active' : ''}" data-tab="character">角色 ${counts.character}</button>`;
    html += `<button class="search-tab ${searchState.activeTab === 'guide' ? 'active' : ''}" data-tab="guide">攻略 ${counts.guide}</button>`;
    html += '</div>';

    if (filtered.length === 0) {
        html += '<div class="search-result-empty">此分類下無結果</div>';
    } else {
        for (const [gameName, list] of Object.entries(groups)) {
            html += `<div class="search-group-title">${escapeHtml(gameName)}</div>`;
            list.forEach(h => {
                const item = h.item;
                const idx = ++searchState._id;
                let nameText, gameText;

                if (item.type === 'character') {
                    nameText = highlightText(item.name, keywords);
                    const otherFields = h.matchedFields.filter(f => f !== '名稱' && f !== '拼音');
                    gameText = otherFields.length ? '· ' + otherFields.join('、') : '';
                } else {
                    nameText = highlightText(item.name, keywords) +
                               ' <span class="guide-tag">攻略 ' + item.optionIndex + '</span>';
                    gameText = '· ' + highlightText(item.option, keywords);
                }

                const isSelected = (idx - 1) === searchState.selectedIndex;

                html += `
                    <div class="search-result-item ${isSelected ? 'selected' : ''}"
                         data-idx="${idx - 1}">
                        <div class="search-result-thumb"
                             style="background-image: url('picture/thumb-${item.code}-${item.index}.png')"></div>
                        <div class="search-result-info">
                            <div class="search-result-name">${nameText}</div>
                            <div class="search-result-game">${escapeHtml(item.game)} ${gameText}</div>
                        </div>
                    </div>
                `;
            });
        }
    }

    resultsEl.innerHTML = html;
    resultsEl.classList.add('show');

    // 绑定 Tab
    resultsEl.querySelectorAll('.search-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            searchState.activeTab = tab.dataset.tab;
            searchState.selectedIndex = -1;
            renderSearchResults(resultsEl, hits, keywords);
        });
    });

    // 绑定结果点击
    resultsEl.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.idx, 10);
            goToHit(filtered[idx]);
        });
    });

    // 绑定建议点击
    bindSuggestionClicks(resultsEl);
}

// ===== 绑定建议点击（共用）=====
function bindSuggestionClicks(resultsEl) {
    resultsEl.querySelectorAll('.search-suggest-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();                    // ← 防止 input 失焦
            e.stopPropagation();
            const input = document.getElementById('searchInput');
            input.value = el.dataset.q;
            input.focus();
            performSearch(el.dataset.q);
        });
    });
}

// ===== 历史管理 =====
function removeHistoryItem(q) {
    const list = loadHistory().filter(x => x !== q);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

// ===== 渲染历史 =====
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
            <div class="search-history-item" data-q="${escapeHtml(q)}">
                <span class="history-text">${escapeHtml(q)}</span>
                <button class="history-remove" data-q="${escapeHtml(q)}" title="刪除">✕</button>
            </div>
        `;
    });
    html += '</div>';

    resultsEl.innerHTML = html;
    resultsEl.classList.add('show');

    // 全部清除
    resultsEl.querySelector('.clear-history')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('確定要清除全部搜尋記錄嗎？')) {
            clearHistory();
            resultsEl.classList.remove('show');
        }
    });

    // 单项删除
    resultsEl.querySelectorAll('.history-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const q = btn.dataset.q;
            removeHistoryItem(q);
            // 重新渲染
            renderSearchHistory(resultsEl);
        });
    });

    resultsEl.querySelectorAll('.search-history-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('history-remove')) return;
            e.preventDefault();                    // ← 防止 input 失焦
            const input = document.getElementById('searchInput');
            input.value = el.dataset.q;
            input.focus();                         // ← 确保保持焦点
            performSearch(el.dataset.q);
        });
    });
}

// ===== 跳转到命中 =====
function goToHit(hit) {
    const item = hit.item;
    if (item.type === 'guide') {
        goToGuide(item.game, item.name);
    } else {
        goToCharacter(item.game, item.name);
    }
}

// ===== 生成建议=====
function buildSuggestionsHtml(q) {
    if (!q || !searchIndex) return '';
    const suggestions = getSuggestions(q, searchIndex);
    if (suggestions.length === 0) return '';

    let html = '<div class="search-suggest-head">建議</div>';
    suggestions.slice(0, 4).forEach(s => {
        html += `<div class="search-suggest-item" data-q="${escapeHtml(s)}">
                    <span class="suggest-icon">🔍</span>
                    <span class="suggest-text">${highlightText(s, [q])}</span>
                 </div>`;
    });
    return html;
}

// ===== 显示建议 =====
async function showSuggestions(input, resultsEl) {
    const q = input.value.trim();
    if (!q) {
        renderSearchHistory(resultsEl);
        return;
    }

    const index = await buildSearchIndex();
    const suggestions = getSuggestions(q, index);
    const history = loadHistory().filter(h => h.toLowerCase().includes(q.toLowerCase()));

    if (suggestions.length === 0 && history.length === 0) {
        resultsEl.classList.remove('show');
        return;
    }

    let html = '';
    if (suggestions.length > 0) {
        html += '<div class="search-suggest-head">建議</div>';
        suggestions.forEach(s => {
            html += `<div class="search-suggest-item" data-q="${escapeHtml(s)}">
                        <span class="suggest-icon">🔍</span>
                        <span class="suggest-text">${highlightText(s, [q])}</span>
                     </div>`;
        });
    }
    if (history.length > 0) {
        html += '<div class="search-suggest-head">🕐 最近</div>';
        history.slice(0, 3).forEach(h => {
            html += `<div class="search-suggest-item" data-q="${escapeHtml(h)}">
                        <span class="suggest-icon">🕐</span>
                        <span class="suggest-text">${escapeHtml(h)}</span>
                     </div>`;
        });
    }

    resultsEl.innerHTML = html;
    resultsEl.classList.add('show');

    bindSuggestionClicks(resultsEl);
}

// ===== 执行搜索 =====
async function performSearch(query) {
    const resultsEl = document.getElementById('searchResults');
    const raw = simpToTrad((query || '').trim());

    if (!raw) {
        searchState.hits = [];
        searchState.selectedIndex = -1;
        renderSearchHistory(resultsEl);
        return;
    }

    const parsed = parseQuery(raw.toLowerCase());
    if (parsed.include.length === 0) {
        resultsEl.innerHTML = '<div class="search-result-empty">請輸入正向關鍵詞</div>';
        resultsEl.classList.add('show');
        return;
    }

    const includeGroups = parsed.include.map(expandKeyword);
    const excludeGroups = parsed.exclude.map(expandKeyword);
    const flatKeywords = parsed.include;

    const index = await buildSearchIndex();

    const hits = [];
    for (const item of index) {
        const hit = scoreObject(item, item.fields, includeGroups, excludeGroups, item.pinyin);
        if (hit) hits.push(hit);
    }
    hits.sort((a, b) => b.score - a.score);

    searchState.hits = hits;
    searchState.selectedIndex = -1;
    searchState.activeTab = 'all';
    searchState._id = 0;

    renderSearchResults(resultsEl, hits, flatKeywords);
}

// 保留给彩蛋 2
function highlightKeyword(text, keyword) {
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return '';
    const start = Math.max(0, idx - 12);
    const end = Math.min(text.length, idx + keyword.length + 12);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet;
}

// ===== 事件绑定 =====
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchInput');
    const resultsEl = document.getElementById('searchResults');
    if (!input || !resultsEl) return;

    let debounceTimer = null;

    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value;

        // 立刻显示建议
        showSuggestions(input, resultsEl);

        // 300ms 后再正式搜索
        debounceTimer = setTimeout(() => {
            if (val.trim()) {
                performSearch(val);
            }
        }, 300);
    });

    input.addEventListener('focus', async () => {
        await buildSearchIndex();
        if (!input.value.trim()) {
            renderSearchHistory(resultsEl);
        } else {
            performSearch(input.value);
        }
    });

    // 键盘导航
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            input.value = '';
            resultsEl.classList.remove('show');
            input.blur();
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const total = searchState.hits.length;
            if (total === 0) return;

            if (e.key === 'ArrowDown') {
                searchState.selectedIndex = (searchState.selectedIndex + 1) % total;
            } else {
                searchState.selectedIndex = (searchState.selectedIndex - 1 + total) % total;
            }

            // 重绘（只改高亮）
            const items = resultsEl.querySelectorAll('.search-result-item');
            items.forEach((el, i) => {
                el.classList.toggle('selected', i === searchState.selectedIndex);
            });
            items[searchState.selectedIndex]?.scrollIntoView({ block: 'nearest' });
        }

        if (e.key === 'Enter') {
            if (searchState.selectedIndex >= 0 && searchState.hits[searchState.selectedIndex]) {
                goToHit(searchState.hits[searchState.selectedIndex]);
            } else if (input.value.trim()) {
                pushHistory(input.value.trim());
            }
        }
    });

    // 回车保存历史
    input.addEventListener('change', () => {
        if (input.value.trim()) pushHistory(input.value.trim());
    });
});

// 跳轉到指定角色
async function goToCharacter(gameName, charName) {
    // 1. 清空搜索
    const input = document.getElementById('searchInput');
    const resultsEl = document.getElementById('searchResults');
    if (input) { input.value = ''; input.blur(); }
    if (resultsEl) {
        resultsEl.classList.remove('show');
        resultsEl.innerHTML = '';
    }

    // 2. 切換遊戲
    if (currentGame !== gameName) {
        await selectGame(gameName);
    }

    // 3. 等一下讓 DOM 渲染完
    await new Promise(r => setTimeout(r, 120));

    // 4. 找到角色按鈕並點擊
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

    // 5. 滾動到角色介紹區（不依賴 scrollToSection 的 disabled 檢查）
    const target = document.getElementById('character');
    if (target) {
        const topbar = document.querySelector('.topbar-inner');
        const topbarHeight = topbar ? topbar.offsetHeight + 30 : 100;
        const targetY = target.getBoundingClientRect().top + window.scrollY - topbarHeight;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    return found;
}

// 跳轉到指定角色的攻略
async function goToGuide(gameName, charName) {
    // 1. 清空搜索
    const input = document.getElementById('searchInput');
    const resultsEl = document.getElementById('searchResults');
    if (input) { input.value = ''; input.blur(); }
    if (resultsEl) {
        resultsEl.classList.remove('show');
        resultsEl.innerHTML = '';
    }

    // 2. 切換遊戲
    if (currentGame !== gameName) {
        await selectGame(gameName);
    }

    // 3. 等一下讓 DOM 渲染完
    await new Promise(r => setTimeout(r, 120));

    // 4. 在攻略區找到該角色按鈕並點擊
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

    // 5. 滾動到攻略區
    const target = document.getElementById('guide');
    if (target) {
        const topbar = document.querySelector('.topbar-inner');
        const topbarHeight = topbar ? topbar.offsetHeight + 30 : 100;
        const targetY = target.getBoundingClientRect().top + window.scrollY - topbarHeight;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    return found;
}

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

// =========================================================
// 人氣排行榜
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
            html += `
                <div class="ranking-item rank-${item.rank}"
                     data-game="${escapeHtml(item.game)}"
                     data-name="${escapeHtml(item.name)}">
                    <div class="ranking-rank">${item.rank}</div>
                    <div class="ranking-thumb"
                         style="background-image: url('picture/thumb-${item.code}-${item.index}.png')"></div>
                    <div class="ranking-info">
                        <div class="ranking-name">${escapeHtml(item.name)}</div>
                        <div class="ranking-game">${escapeHtml(item.game)}</div>
                    </div>
                    <div class="ranking-count">${item.count} 次</div>
                </div>
            `;
        });

        listEl.innerHTML = html;
        rankingLoaded = true;

        // 点击跳转
        listEl.querySelectorAll('.ranking-item').forEach(el => {
            el.addEventListener('click', () => {
                goToCharacter(el.dataset.game, el.dataset.name);
            });
        });

    } catch (e) {
        listEl.innerHTML = '<p class="ranking-empty">排行榜載入失敗，請稍後再試</p>';
    }
}

// 滚到排行榜时才加载
const rankingObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !rankingLoaded) {
        loadRanking();
    }
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
    const section = document.getElementById('ranking');
    if (section) rankingObserver.observe(section);
});

// 刷新排行榜（浏览后调用）
let refreshTimer = null;
function refreshRanking() {
    if (!rankingLoaded) return;   // 还没加载过就不用刷
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
        rankingLoaded = false;
        await loadRanking();
    }, 300);
}

// ===== 前端防刷：同一瀏覽器同角色每 10 分鐘上報一次 =====
const VIEW_LOCAL_KEY = 'yuzu-view-recent';
const VIEW_INTERVAL_MS = 10 * 60 * 1000;   // 10 分鐘

function getViewRecords() {
    try {
        const raw = localStorage.getItem(VIEW_LOCAL_KEY);
        if (!raw) return {};
        const data = JSON.parse(raw);
        // 清掉超過 24 小時的舊記錄（避免無限增長）
        const now = Date.now();
        const cleaned = {};
        for (const [name, ts] of Object.entries(data)) {
            if (now - ts < 24 * 60 * 60 * 1000) {
                cleaned[name] = ts;
            }
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