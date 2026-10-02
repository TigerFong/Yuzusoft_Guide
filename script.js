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
function selectGame(gameName) {
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
    updateStoryContent(gameName);   // ← 加這行
    document.body.classList.add('has-game');

    closeMenu();
}

// ===== 取消選擇遊戲 =====
function clearGame() {
    currentGame = null;

    // 移除遊戲高亮
    document.querySelectorAll('#gameList a').forEach(a => {
        a.classList.remove('active');
    });

    // 鎖定遊戲專屬功能
    document.querySelectorAll('#featureList a.game-feature').forEach(a => {
        a.classList.add('disabled');
    });

    // 移除 body 的 has-game 標記（隱藏遊戲區塊）
    document.body.classList.remove('has-game');

    // 背景還原成柚子社 logo
    setBackground(DEFAULT_BG.image, DEFAULT_BG.size, DEFAULT_BG.color);

    // 首頁內容還原成預設
    updateHomeContent(null);

    // 回到首頁
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