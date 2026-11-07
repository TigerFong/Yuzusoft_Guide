// 文件：static/game/script.js
let currentMode = 'login';
let allCharacters = {};
let playerData = null;
let isTester = false; 
let currentWishlist = [];
let currentAwakenChar = null;

// --- 戰鬥狀態 ---
let currentBattleState = null;
let selectedCardIndex = null;
let isBusy = false;
let selectedParty = [];

// --- 關卡選擇狀態 ---
let currentSelectedStageId = null;
let clearedStages = [];
const STAGE_DATA = {
    senren: [
        { id: 'senren-1', name: '第一章 · 神刀的試煉', reward: 120 },
        { id: 'senren-2', name: '第二章 · 甜品店的日常', reward: 150 },
        { id: 'senren-3', name: '第三章 · 巫女姬的決意', reward: 200 },
        { id: 'senren-4', name: '第四章 · 詛咒的蔓延', reward: 250 },
        { id: 'senren-5', name: '終章 · 祟神降臨', reward: 300 }
    ],
    tenshi: [
        { id: 'tenshi-1', name: '第一章 · 天降之物', reward: 120 },
        { id: 'tenshi-2', name: '第二章 · 魔族來襲', reward: 150 },
        { id: 'tenshi-3', name: '第三章 · 皇女的惡戲', reward: 200 },
        { id: 'tenshi-4', name: '第四章 · 教師的關愛', reward: 250 },
        { id: 'tenshi-5', name: '終章 · 魔王覺醒', reward: 300 }
    ],
    cafe: [
        { id: 'cafe-1', name: '第一章 · 咖啡館的邀約', reward: 120 },
        { id: 'cafe-2', name: '第二章 · 巫女的祈願', reward: 150 },
        { id: 'cafe-3', name: '第三章 · 高冷女僕', reward: 200 },
        { id: 'cafe-4', name: '第四章 · 死神之蝶', reward: 250 },
        { id: 'cafe-5', name: '終章 · 星光的奇蹟', reward: 300 }
    ],
    sabbat: [
        { id: 'sabbat-1', name: '第一章 · 夜宴開啟', reward: 120 },
        { id: 'sabbat-2', name: '第二章 · 學生會長', reward: 150 },
        { id: 'sabbat-3', name: '第三章 · 軟糯的轉校生', reward: 200 },
        { id: 'sabbat-4', name: '第四章 · 魔女的契約', reward: 250 },
        { id: 'sabbat-5', name: '終章 · 誓約之吻', reward: 300 }
    ]
};

let dailyData = null;
let currentBattleIsWeekly = false;
let currentWeeklyStageId = null;
let weeklyData = null;

document.addEventListener('DOMContentLoaded', () => {
    // 全局圖片載入失敗監聽
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG' && e.target.dataset.fallback) {
            if (e.target.src.includes('thumb-')) return;
            e.target.src = e.target.dataset.fallback;
        }
    }, true);

    // 自定義帶超時的 Fetch
    async function fetchWithTimeout(resource, options = {}) {
        const { timeout = 15000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(resource, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (err) {
            clearTimeout(id);
            if (err.name === 'AbortError') {
                throw new Error('伺服器回應超時，請檢查網路或稍後再試');
            }
            throw err;
        }
    }

    // DOM 元素獲取
    const loginOverlay = document.getElementById('loginOverlay');
    const gameContainer = document.getElementById('gameContainer');
    const authForm = document.getElementById('authForm');
    const tabs = document.querySelectorAll('.tab-btn');
    const submitBtn = document.getElementById('submitBtn');
    const errorDiv = document.getElementById('authError');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const userNameDisplay = document.getElementById('userName');
    const userCoinsDisplay = document.getElementById('userCoins');
    const userExpDisplay = document.getElementById('userExp');
    const logoutBtn = document.getElementById('logoutBtn');
    const pityCount = document.getElementById('pityCount');
    const draw1Btn = document.getElementById('draw1Btn');
    const draw10Btn = document.getElementById('draw10Btn');
    const gachaView = document.getElementById('gachaView');
    const rosterView = document.getElementById('rosterView');
    const battleView = document.getElementById('battleView');
    const dailyView = document.getElementById('dailyView');
    const navTabs = document.querySelectorAll('.nav-tab');
    const rosterGrid = document.getElementById('rosterGrid');
    const awakenModal = document.getElementById('awakenModal');
    const closeAwakenBtn = document.getElementById('closeAwakenBtn');
    const doAwakenBtn = document.getElementById('doAwakenBtn');
    const awakenLvlEls = [
        document.getElementById('awakenLvl1'), document.getElementById('awakenLvl2'),
        document.getElementById('awakenLvl3'), document.getElementById('awakenLvl4'),
        document.getElementById('awakenLvl5'), document.getElementById('awakenLvl6')
    ];
    const upgradeModal = document.getElementById('upgradeModal');
    const closeUpgradeBtn = document.getElementById('closeUpgradeBtn');
    const toAwakenBtn = document.getElementById('toAwakenBtn');
    const upgradeSlider = document.getElementById('upgradeSlider');
    const targetLvlDisplay = document.getElementById('targetLvlDisplay');
    const doUpgradeBtn = document.getElementById('doUpgradeBtn');
    const dailyBarFill = document.getElementById('dailyBarFill');
    const dailyPointsText = document.getElementById('dailyPointsText');
    const dailyTaskList = document.getElementById('dailyTaskList');
    const startGameBtn = document.getElementById('startGameBtn');
    const titleScreen = document.getElementById('titleScreen');
    
    let currentUpgradeChar = null;
    let sessionValid = false;
    let sessionData = null;

    // 1. 背景偷偷檢查登入狀態
    fetchWithTimeout('/api/auth/me')
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 200 && data.logged_in) {
                sessionValid = true;
                sessionData = data;
                playerData = data.player;
                if (Object.keys(allCharacters).length === 0) fetchAllCharacters();
            }
        })
        .catch(() => {});

    // 2. 點擊「進入幻境」
    startGameBtn.addEventListener('click', () => {
        titleScreen.classList.add('hidden');
        setTimeout(() => {
            titleScreen.style.display = 'none';
            if (sessionValid && sessionData) {
                initGame(sessionData);
            } else {
                showLogin();
            }
        }, 800);
    });

    // 3. 登入/註冊邏輯
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.dataset.tab;
            submitBtn.textContent = currentMode === 'login' ? '進 入 幻 境' : '創 建 帳 號';
            errorDiv.textContent = '';
            passwordInput.value = '';
        });
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) return;
        submitBtn.disabled = true;
        submitBtn.textContent = '處理中...';
        errorDiv.textContent = '';
        const url = currentMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '發生錯誤');
            return data;
        })
        .then(() => fetchWithTimeout('/api/auth/me'))
        .then(res => res.json())
        .then(data => { 
            if (data.logged_in) {
                sessionValid = true;
                sessionData = data;
                initGame(data); 
            }
        })
        .catch(err => { errorDiv.textContent = err.message; })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = currentMode === 'login' ? '進 入 幻 境' : '創 建 帳 號';
        });
    });

    logoutBtn.addEventListener('click', () => {
        fetchWithTimeout('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
    });

    // 尋找所有大廳的按鈕
    const lobbyBtns = document.querySelectorAll('.lobby-card-btn'); // 確認這裡是 lobby-card-btn
    const backBtns = document.querySelectorAll('.btn-back-lobby');

    lobbyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.dataset.target;
            
            // 隱藏所有視圖
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            
            // 顯示目標視圖
            const targetEl = document.getElementById(`${targetView}View`);
            if (targetEl) targetEl.classList.add('active');

            // 根據進入的視圖加載對應數據
            if (targetView === 'battle') {
                document.getElementById('stageSelect').style.display = 'block';
                document.getElementById('battleContainer').style.display = 'none';
                loadPartySelection();
            } else if (targetView === 'daily') {
                loadDailyTasks();
            } else if (targetView === 'weekly') {
                loadWeeklyPanel();
            } else if (targetView === 'roster') {
                renderRoster();
                fetchWithTimeout('/api/daily/view-roster', { method: 'POST' }).catch(()=>{});
            }
        });
    });

    // 返回大廳按鈕
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 如果正在戰鬥中，可能需要確認是否離開
            if (currentBattleState && !currentBattleState.battle_over) {
                if (!confirm('戰鬥尚未結束，確定要返回大廳嗎？')) return;
                currentBattleState = null; // 強制結束
            }

            // 隱藏所有視圖
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            // 顯示大廳
            document.getElementById('lobbyView').classList.add('active');
        });
    });

    draw1Btn.addEventListener('click', () => handleDraw(1));
    draw10Btn.addEventListener('click', () => handleDraw(10));

    // 5. 初始化遊戲與顯示登入
    async function initGame(data) {
        playerData = data.player;
        isTester = (data.username === 'tester');
        userNameDisplay.textContent = data.username;
        updateCoinsUI(playerData.coins);
        updateExpUI(playerData.stats?.exp || 0);
        pityCount.textContent = playerData.pity;
        currentWishlist = playerData.wishlist || [];
        
        loginOverlay.style.display = 'none';
        gameContainer.style.display = 'flex';
        
        // 🌟 登入後預設顯示大廳
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('lobbyView').classList.add('active');

        if (Object.keys(allCharacters).length === 0) await fetchAllCharacters();
        updateDrawButtons();
    }

    function showLogin() {
        gameContainer.style.display = 'none';
        loginOverlay.style.display = 'flex';
    }

    function updateExpUI(exp) {
        if (!playerData) playerData = {};
        if (!playerData.stats) playerData.stats = {};
        playerData.stats.exp = exp;
        if (userExpDisplay) userExpDisplay.textContent = exp;
    }

    function updateCoinsUI(coins) {
        if (!playerData) playerData = {};
        playerData.coins = coins;
        if (userCoinsDisplay) userCoinsDisplay.textContent = coins;
        updateDrawButtons();
    }

    function updateDrawButtons() {
        if (!playerData) return;
        draw1Btn.disabled = playerData.coins < 160;
        draw10Btn.disabled = playerData.coins < 1600;
    }

    async function fetchAllCharacters() {
        try {
            const metaRes = await fetchWithTimeout('/api/meta');
            const meta = await metaRes.json();
            const rarityMap = {
                "朝武芳乃":"SSR", "白雪乃愛":"SSR", "明月栞那":"SSR", "綾地寧寧":"SSR",
                "常陸茉子":"SR", "叢雨":"SR", "谷風天音":"SR", "星河輝耶":"SR",
                "百里風實花":"SR", "四季夏目":"SR", "墨染希":"SR", "因幡巡":"SR", "椎葉紬":"SR"
            };
            for (const [gameName, gameMeta] of Object.entries(meta.games)) {
                const res = await fetchWithTimeout(`/api/games/${encodeURIComponent(gameName)}/characters`);
                const names = await res.json();
                names.forEach((name, i) => {
                    allCharacters[name] = {
                        game: gameName,
                        code: gameMeta.code,
                        index: i + 1,
                        rarity: rarityMap[name] || "R"
                    };
                });
            }
        } catch (e) { console.error('載入角色失敗', e); }
    }

    function renderWishlistGrid() {
        wishlistGrid.innerHTML = '';
        const ssrNames = Object.keys(allCharacters).filter(name => allCharacters[name].rarity === 'SSR');
        ssrNames.forEach(name => {
            const info = allCharacters[name];
            const isSel = currentWishlist.includes(name);
            const div = document.createElement('div');
            div.className = `wish-item ${isSel ? 'selected' : ''}`;
            div.dataset.name = name;
            div.innerHTML = `<img src="/static/picture/thumb-${info.code}-${info.index}.png" alt="${name}"><span>${name}</span>`;
            div.addEventListener('click', () => {
                if (div.classList.contains('selected')) div.classList.remove('selected');
                else {
                    if (wishlistGrid.querySelectorAll('.wish-item.selected').length >= 1) return alert('心願單只能選擇 1 個角色！');
                    div.classList.add('selected');
                }
            });
            wishlistGrid.appendChild(div);
        });
    }

    async function handleDraw(count) {
        if (playerData.coins < 160 * count) return;
        draw1Btn.disabled = true; draw10Btn.disabled = true;
        try {
            const res = await fetchWithTimeout('/api/gacha/draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count })
            });
            const data = await res.json();
            if (!data.ok) return alert(data.error);
            updateCoinsUI(data.coins);
            pityCount.textContent = data.pity;
            const meRes = await fetchWithTimeout('/api/auth/me');
            const meData = await meRes.json();
            if (meData.logged_in) {
                playerData = meData.player;
                updateCoinsUI(playerData.coins);
            }
            showGachaResults(data.results);
        } catch (e) { alert('抽卡失敗：' + e.message); } finally { updateDrawButtons(); }
    }

    function showGachaResults(results) {
        const container = document.getElementById('gachaCards');
        const modal = document.getElementById('gachaResultModal');
        container.innerHTML = '';
        modal.classList.add('show');
        results.forEach((card, idx) => {
            const info = allCharacters[card.name] || { code: 'game', index: 1 };
            const div = document.createElement('div');
            div.className = `card-item ${card.rarity}`;
            div.style.animationDelay = `${idx * 0.15}s`;
            let tagHtml = `<div class="card-tag">+${card.shards} 碎片</div>`;
            if (card.is_new) tagHtml = `<div class="card-tag new">NEW 解鎖</div>`;
            else if (card.refund > 0) tagHtml = `<div class="card-tag" style="color: #ffd700; font-weight: bold;">滿覺 返還+${card.refund}幣</div>`;
            div.innerHTML = `
                <img src="/static/picture/char-${info.code}-${info.index}.png" data-fallback="/static/picture/thumb-${info.code}-${info.index}.png">
                <div class="card-info"><div class="card-name">${card.name}</div>${tagHtml}</div>
            `;
            container.appendChild(div);
        });
    }

    function renderRoster() {
        if (!playerData || !playerData.cards) return;
        rosterGrid.innerHTML = '';
        const ownedChars = Object.keys(playerData.cards);
        if (ownedChars.length === 0) {
            rosterGrid.innerHTML = '<p style="color:#aaa; grid-column:1/-1; text-align:center;">還沒有任何角色，去抽卡吧！</p>';
            return;
        }
        ownedChars.sort((a,b) => {
            const aData = playerData.cards[a];
            const bData = playerData.cards[b];
            if (aData.awaken !== bData.awaken) return bData.awaken - aData.awaken;
            const w = {'SSR':3, 'SR':2, 'R':1};
            return w[allCharacters[b]?.rarity || 'R'] - w[allCharacters[a]?.rarity || 'R'];
        });
        ownedChars.forEach(name => {
            const card = playerData.cards[name];
            const info = allCharacters[name] || { code: 'game', index: 1 };
            const rarity = info.rarity || 'R';
            const div = document.createElement('div');
            div.className = `roster-card ${rarity}`;
            div.innerHTML = `
                <img src="/static/picture/char-${info.code}-${info.index}.png" data-fallback="/static/picture/thumb-${info.code}-${info.index}.png">
                <div class="roster-info">
                    <div class="roster-name">${name}</div>
                    <div class="roster-awaken">Lv.${card.level || 1} · 覺醒 ${card.awaken} / 6</div>
                </div>
            `;
            div.addEventListener('click', () => openUpgradeModal(name));
            rosterGrid.appendChild(div);
        });
    }

    async function openAwakenModal(charName) {
        currentAwakenChar = charName;
        try {
            const res = await fetchWithTimeout(`/api/awaken/${encodeURIComponent(charName)}`);
            const data = await res.json();
            if (!data.ok) return alert(data.error);
            const info = allCharacters[charName];
            document.getElementById('awakenImg').src = `/static/picture/char-${info.code}-${info.index}.png`;
            document.getElementById('awakenName').textContent = data.name;
            document.getElementById('awakenRarity').textContent = data.rarity;
            document.getElementById('awakenShards').textContent = data.shards;

            data.effects.forEach((desc, idx) => {
                const el = awakenLvlEls[idx];
                if(!el) return;
                el.onclick = null; el.style.border = 'none'; el.style.cursor = 'default';
                
                if (isTester) {
                    el.style.cursor = 'pointer'; el.style.border = '1px dashed rgba(212, 175, 55, 0.5)';
                    el.title = '點擊切換至此覺醒等級';
                    el.onclick = async () => {
                        const targetLvl = (idx + 1 === data.awaken) ? idx : (idx + 1);
                        const req = await fetchWithTimeout('/api/tester/awaken', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: charName, target_lvl: targetLvl })
                        });
                        const reqData = await req.json();
                        if (reqData.ok) {
                            playerData.cards[charName].awaken = reqData.awaken;
                            await openAwakenModal(charName);
                            renderRoster();
                        }
                    };
                }

                el.querySelector('.lvl-desc').textContent = desc;
                if (idx < data.awaken) {
                    el.classList.add('active');
                    el.querySelector('.lvl-title').innerHTML = `覺醒 ${['I','II','III','IV','V','VI'][idx]} <span class="lvl-cost" style="color:var(--gold-main)">已解鎖</span>`;
                } else {
                    el.classList.remove('active');
                    el.querySelector('.lvl-title').innerHTML = `覺醒 ${['I','II','III','IV','V','VI'][idx]} <span class="lvl-cost">消耗 1 碎片</span>`;
                }
            });

            if (isTester) {
                doAwakenBtn.textContent = '✨ 測試員無需碎片，請直接點擊上方等級框切換';
                doAwakenBtn.disabled = true; doAwakenBtn.style.opacity = '0.8';
                doAwakenBtn.style.borderColor = 'transparent'; doAwakenBtn.style.backgroundColor = 'transparent';
            } else {
                doAwakenBtn.style.opacity = '1'; doAwakenBtn.style.borderColor = 'var(--red-deep)'; doAwakenBtn.style.backgroundColor = '';
                if (data.awaken >= 6) { doAwakenBtn.textContent = '已滿級'; doAwakenBtn.disabled = true; }
                else if (data.shards >= 1) { doAwakenBtn.textContent = `消耗 1 碎片覺醒`; doAwakenBtn.disabled = false; }
                else { doAwakenBtn.textContent = `碎片不足 (需 1)`; doAwakenBtn.disabled = true; }
            }
            awakenModal.classList.add('show');
        } catch (e) { alert('載入覺醒資訊失敗: ' + e.message); }
    }

    // =========================================================
    // 出戰隊伍與關卡選擇
    // =========================================================
    document.querySelectorAll('.stage-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.stage-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderStageList(tab.dataset.game);
        });
    });

    function renderStageList(gameCode) {
        const list = document.getElementById('stageList');
        if (!list) return;
        list.innerHTML = '';
        STAGE_DATA[gameCode].forEach((stage, index) => {
            let isLocked = false;
            if (index > 0 && !isTester) {
                const prevStageId = STAGE_DATA[gameCode][index - 1].id;
                if (!clearedStages.includes(prevStageId)) isLocked = true;
            }
            const isCleared = clearedStages.includes(stage.id);
            const div = document.createElement('div');
            div.className = `stage-item ${currentSelectedStageId === stage.id ? 'selected' : ''} ${isLocked ? 'locked' : ''}`;
            
            let testerBtn = isTester ? `<button class="btn-tester-toggle" data-id="${stage.id}" data-cleared="${isCleared}" style="background:transparent; border:1px solid #ffd700; color:#ffd700; padding:2px 8px; border-radius:4px; cursor:pointer; z-index:10;">${isCleared ? '🔒 鎖定' : '🔓 解鎖'}</button>` : '';

            div.innerHTML = `
                <div class="stage-name" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${stage.name} ${isCleared ? '✅' : ''}</span>${testerBtn}
                </div>
                <div class="stage-reward">${isLocked ? '🔒 需先通關前置' : `獎勵：${stage.reward} 柚幣`}</div>
            `;
            
            div.addEventListener('click', (e) => {
                if (e.target.closest('.btn-tester-toggle')) return;
                if (isLocked) return alert('請先通關前置關卡！');
                currentSelectedStageId = stage.id;
                renderStageList(gameCode);
                updatePartySelectBtn();
            });

            if (isTester) {
                const btn = div.querySelector('.btn-tester-toggle');
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation(); 
                    const action = btn.dataset.cleared === 'true' ? 'lock' : 'unlock';
                    const res = await fetchWithTimeout('/api/tester/stage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stage_id: stage.id, action })
                    });
                    const d = await res.json();
                    if (d.ok) { clearedStages = d.cleared_stages; renderStageList(gameCode); }
                });
            }
            list.appendChild(div);
        });
    }

    async function loadPartySelection() {
        try {
            const progRes = await fetchWithTimeout('/api/battle/progress');
            const progData = await progRes.json();
            if (progData.ok) {
                clearedStages = progData.cleared_stages;
                const activeTab = document.querySelector('.stage-tab.active');
                if (activeTab) renderStageList(activeTab.dataset.game);
            }
        } catch(e) {}
        try {
            const res = await fetchWithTimeout('/api/battle/party');
            const data = await res.json();
            if (!data.ok) return alert(data.error);
            renderPartySelection(data.characters);
        } catch (e) { console.error('載入隊伍失敗', e); }
    }

    function renderPartySelection(characters, gridId = 'partySelectGrid') {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.innerHTML = '';
        if (!characters || characters.length === 0) {
            grid.innerHTML = '<p style="color:#aaa; grid-column:1/-1; text-align:center; padding:20px;">還沒有任何角色，去抽卡吧！</p>';
            selectedParty = []; updatePartySelectBtn(); return;
        }
        selectedParty = selectedParty.filter(n => characters.some(c => c.name === n));
        characters.forEach(c => {
            const info = allCharacters[c.name] || { code: 'game', index: 1 };
            const isSel = selectedParty.includes(c.name);
            const div = document.createElement('div');
            div.className = `party-select-item ${c.rarity} ${isSel ? 'selected' : ''}`;
            div.dataset.name = c.name;
            div.innerHTML = `
                <img src="/static/picture/char-${info.code}-${info.index}.png" data-fallback="/static/picture/thumb-${info.code}-${info.index}.png" alt="${c.name}">
                <div class="party-select-info">
                    <div class="party-select-name">${c.name}</div>
                    <div class="party-select-meta">Lv.${c.level || 1} · ${c.rarity} · 覺醒 ${c.awaken}</div>
                </div>
                <div class="party-select-check">✓</div>
            `;
            div.addEventListener('click', () => {
                if (selectedParty.includes(c.name)) selectedParty = selectedParty.filter(n => n !== c.name);
                else {
                    if (selectedParty.length >= 3) return alert('最多只能選擇 3 名角色！');
                    selectedParty.push(c.name);
                }
                renderPartySelection(characters, gridId);
            });
            grid.appendChild(div);
        });
        updatePartySelectBtn();
    }

    function updatePartySelectBtn() {
        const countEl = document.getElementById('partySelectCount');
        if (countEl) countEl.textContent = selectedParty.length;
        const weeklyCountEl = document.getElementById('weeklyPartyCount');
        if (weeklyCountEl) weeklyCountEl.textContent = selectedParty.length;

        const btn = document.getElementById('enterStageBtn');
        if (btn) {
            if (selectedParty.length === 0) { btn.disabled = true; btn.textContent = '請先選擇出戰角色'; }
            else if (!currentSelectedStageId) { btn.disabled = true; btn.textContent = '請先選擇關卡'; }
            else { btn.disabled = false; btn.textContent = '進入戰鬥'; }
        }

        const weeklyBtn = document.getElementById('weeklyEnterBtn');
        if (weeklyBtn) {
            if (selectedParty.length === 0) { weeklyBtn.disabled = true; weeklyBtn.textContent = '請先選擇出戰角色'; }
            else if (!currentWeeklyStageId) { weeklyBtn.disabled = true; weeklyBtn.textContent = '請先選擇關卡'; }
            else { weeklyBtn.disabled = false; weeklyBtn.textContent = '挑戰週常深淵'; }
        }
    }

    // =========================================================
    // 戰鬥
    // =========================================================
    async function enterBattle() {
        if (selectedParty.length === 0) return alert('請先選擇至少 1 名出戰角色！');
        if (!currentSelectedStageId) return alert('請先選擇一個關卡！');
        
        const btn = document.getElementById('enterStageBtn');
        if (btn) { btn.disabled = true; btn.textContent = '連線中...'; }

        try {
            fetchWithTimeout('/api/daily/change-party', { method: 'POST' }).catch(()=>{});
            const res = await fetchWithTimeout('/api/battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage_id: currentSelectedStageId, party: selectedParty })
            });
            const data = await res.json();
            if (!data.ok) {
                alert(data.error || "進入戰鬥失敗");
                if (btn) { btn.disabled = false; btn.textContent = '進入戰鬥'; }
                return;
            }
            currentBattleState = data.state;
            if (data.story) showStoryModal(data.story, startActualBattle);
            else startActualBattle();
        } catch (e) { 
            alert(`進入戰鬥失敗: ${e.message}`); 
            if (btn) { btn.disabled = false; btn.textContent = '進入戰鬥'; }
        }
    }

    function startActualBattle() {
        selectedCardIndex = null; isBusy = false;
        document.getElementById('stageSelect').style.display = 'none';
        document.getElementById('battleContainer').style.display = 'flex';
        document.querySelector('.enemy-area').innerHTML = ''; 
        renderBattle();
    }

    function showStoryModal(text, callback) {
        const modal = document.getElementById('storyModal');
        document.getElementById('storyText').textContent = text;
        modal.classList.add('show');
        document.getElementById('closeStoryBtn').onclick = () => { modal.classList.remove('show'); callback(); };
    }

    function renderBattle() {
        if (!currentBattleState) return;
        let waveEl = document.getElementById('waveDisplay');
        if (!waveEl) {
            waveEl = document.createElement('div'); waveEl.id = 'waveDisplay';
            document.getElementById('battleContainer').appendChild(waveEl);
        }
        waveEl.textContent = `第 ${currentBattleState.wave} / ${currentBattleState.total_waves} 波`;
        renderEnemies(); renderPlayerParty(); renderHand(); updateSPUI();
        const btn = document.getElementById('endTurnBtn');
        if (btn) {
            btn.textContent = currentBattleState.battle_over ? "戰鬥結束" : "結束回合";
            btn.disabled = currentBattleState.battle_over || isBusy;
        }
    }

    function currentCardNeedsAlly() {
        if (selectedCardIndex === null || !currentBattleState) return false;
        const card = currentBattleState.hand[selectedCardIndex];
        if (!card) return false;
        if (card.target === 'aoe') return false;
        return card.action_type !== 'damage';
    }

    function renderEnemies() {
        const area = document.getElementById('enemyArea');
        if (!area || !currentBattleState) return;
        area.innerHTML = '';
        currentBattleState.enemies.forEach((enemy, idx) => {
            if (enemy.hp <= 0) return;
            const el = document.createElement('div');
            el.className = `enemy-card ${enemy.is_stunned ? 'stunned' : ''}`;
            el.dataset.enemyId = idx;
            let toughHtml = '<div class="toughness-bar">';
            for (let i = 0; i < enemy.max_toughness; i++) toughHtml += `<div class="toughness-seg ${i < enemy.toughness ? 'active' : ''}"></div>`;
            toughHtml += '</div>';
            el.innerHTML = `
                <div class="enemy-avatar-wrap">
                    <div class="enemy-portrait mirror-filter" style="background-image: url('/static/picture/char-${enemy.code}-${enemy.index}.png');"></div>
                    <div class="enemy-shadow"></div>${enemy.is_stunned ? '<div class="stun-icon">💫</div>' : ''}
                </div>
                <div class="enemy-info">
                    <div class="enemy-name">${enemy.name}</div><div class="enemy-mind">心相：${enemy.mind}</div>
                    <div class="hp-bar"><div class="hp-fill" style="width: ${(enemy.hp / enemy.max_hp) * 100}%;"></div></div>${toughHtml}
                </div>
            `;
            el.addEventListener('click', () => {
                if (isBusy || !currentBattleState || currentBattleState.battle_over) return;
                if (selectedCardIndex === null) return alert("請先點擊下方手牌選擇一張卡牌！");
                const card = currentBattleState.hand[selectedCardIndex];
                if (!card) return;
                if (card.action_type !== 'damage') return alert("這張卡不是傷害卡，請點擊我方角色作為目標。");
                doPlayCard(selectedCardIndex, idx);
            });
            area.appendChild(el);
        });
    }

    function renderPlayerParty() {
        const area = document.getElementById('playerParty');
        if (!area || !currentBattleState) return;
        area.innerHTML = '';
        const needsAlly = currentCardNeedsAlly();
        currentBattleState.party.forEach((p, index) => {
            const info = allCharacters[p.name] || { code: 'game', index: 1 };
            const el = document.createElement('div');
            const dead = p.hp <= 0;
            const targetable = needsAlly && !dead;
            el.className = `player-status ${dead ? 'dead' : ''} ${targetable ? 'targetable' : ''}`;
            el.dataset.partyIndex = index;
            el.innerHTML = `
                <img src="/static/picture/thumb-${info.code}-${info.index}.png" class="party-thumb">
                <div class="party-info">
                    <div class="party-name">${p.name} (${p.role})</div>
                    <div class="mini-bar hp"><div style="width: ${(p.hp / p.max_hp) * 100}%;"></div></div>
                    <div class="mini-bar ep"><div style="width: ${(p.ep / p.max_ep) * 100}%;"></div></div>
                    ${p.shield > 0 ? `<div style="font-size:10px; color:#00e5ff;">🛡️ ${p.shield}</div>` : ''}
                </div>
            `;
            el.addEventListener('click', () => {
                if (isBusy || !currentBattleState || currentBattleState.battle_over) return;
                if (selectedCardIndex === null) return;
                const card = currentBattleState.hand[selectedCardIndex];
                if (!card) return;
                if (card.action_type === 'damage') return alert("傷害卡請點擊敵人作為目標。");
                if (card.target === 'aoe') return;
                if (dead) return alert("該角色已倒下！");
                doPlayCard(selectedCardIndex, index);
            });
            area.appendChild(el);
        });
    }

    function renderHand() {
        const area = document.getElementById('handArea');
        if (!area || !currentBattleState) return;
        area.innerHTML = '';
        currentBattleState.hand.forEach((card, idx) => {
            const info = allCharacters[card.name] || { code: 'game', index: 1 };
            const el = document.createElement('div');
            el.className = `battle-card ${selectedCardIndex === idx ? 'selected' : ''} ${card.card_type === 'ultimate' ? 'ultimate' : ''}`;
            const mindClass = ({凛:'rin', 戏:'xi', 羞:'xiu', 静:'jing', 阳:'yang', 和:'he'})[card.mind] || 'rin';
            el.innerHTML = `
                <div class="card-cost">${card.cost}</div><div class="card-mind mind-${mindClass}">${card.mind}</div>
                <div class="card-thumb" style="background-image: url('/static/picture/thumb-${info.code}-${info.index}.png');"></div>
                <div class="card-title">${card.name} - ${card.title}</div><div class="card-desc">${card.desc}</div>
            `;
            el.addEventListener('click', () => {
                if (isBusy || !currentBattleState || currentBattleState.battle_over) return;
                if (card.cost > currentBattleState.sp) return alert("SP 不足！");
                if (card.target === 'aoe') { doPlayCard(idx, null); return; }
                selectedCardIndex = (selectedCardIndex === idx) ? null : idx;
                renderHand(); 
                renderPlayerParty(); 
            });
            area.appendChild(el);
        });
    }

    function updateSPUI() {
        const spEl = document.getElementById('spValue');
        if (spEl && currentBattleState) spEl.textContent = currentBattleState.sp;
    }

    async function doPlayCard(cardIndex, targetIndex) {
        if (isBusy || !currentBattleState) return;
        isBusy = true;
        
        const card = currentBattleState.hand[cardIndex];
        if (!card) { isBusy = false; return; }

        // 備份狀態用於失敗回滾
        const rollbackState = JSON.parse(JSON.stringify(currentBattleState));

        // ===== 1. 前端極速反饋（秒出傷、卡牌飛出） =====
        const cardEls = document.querySelectorAll('.battle-card');
        if(cardEls[cardIndex]) cardEls[cardIndex].classList.add('playing');

        if (card.action_type === 'damage') {
            if (card.target === 'single' && targetIndex !== null) {
                const enemy = currentBattleState.enemies[targetIndex];
                const counterMap = {"凛":"戏", "戏":"羞", "羞":"静", "静":"阳", "阳":"和", "和":"凛"};
                const isCrit = (counterMap[card.mind] === enemy.mind);
                let dmg = card.value;
                if (isCrit) dmg = Math.floor(dmg * 1.5);
                
                // 前端飛出傷害數字
                showDamageNumber(targetIndex, dmg, isCrit);
                
                // 預判扣除血條
                const el = document.querySelector(`.enemy-card[data-enemy-id="${targetIndex}"] .hp-fill`);
                if (el) {
                    const ratio = Math.max(0, (enemy.hp - dmg) / enemy.max_hp);
                    el.style.width = `${ratio * 100}%`;
                }
            } else if (card.target === 'aoe') {
                const counterMap = {"凛":"戏", "戏":"羞", "羞":"静", "静":"阳", "阳":"和", "和":"凛"};
                currentBattleState.enemies.forEach((enemy, idx) => {
                    if (enemy.hp > 0) {
                        const isCrit = (counterMap[card.mind] === enemy.mind);
                        let dmg = card.value;
                        if (isCrit) dmg = Math.floor(dmg * 1.5);
                        showDamageNumber(idx, dmg, isCrit);
                        const el = document.querySelector(`.enemy-card[data-enemy-id="${idx}"] .hp-fill`);
                        if (el) {
                            const ratio = Math.max(0, (enemy.hp - dmg) / enemy.max_hp);
                            el.style.width = `${ratio * 100}%`;
                        }
                    }
                });
            }
        } else if (card.action_type === 'heal' || card.action_type === 'shield') {
            if (targetIndex !== null) {
                if(card.action_type === 'heal') showHealFloat(targetIndex, card.value);
                else showShieldFloat(targetIndex, card.value);
            } else {
                currentBattleState.party.forEach((p, idx) => {
                    if(p.hp > 0) {
                        if(card.action_type === 'heal') showHealFloat(idx, card.value);
                        else showShieldFloat(idx, card.value);
                    }
                });
            }
        }

        selectedCardIndex = null;

        try {
            // ===== 2. 發送請求 =====
            const res = await fetchWithTimeout('/api/battle/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ card_index: cardIndex, target_index: targetIndex })
            });
            const data = await res.json();
            
            if (!data.ok) { 
                alert(data.error); 
                currentBattleState = rollbackState; // 失敗回滾
                renderBattle(); 
                return; 
            }
            
            // ===== 3. 後端真實數據回來，靜默校準畫面 =====
            currentBattleState = data.state;
            renderBattle(); // 用真實結果覆蓋，配合 CSS 的 transition，血條會平滑掉到正確位置
            
            // 🌟 關鍵：過濾掉後端傳來的 damage 事件，防止數字飛兩次！
            // 這樣你只會看到一開始前端飛出的那一次數字。
            const filteredEvents = data.events.filter(ev => ev.type !== 'damage');
            playEvents(filteredEvents);
            
            if (currentBattleState.battle_over) {
                setTimeout(() => finishBattle(currentBattleState.victory), 700);
            }
        } catch (e) { 
            alert('出牌失敗：' + e.message); 
            currentBattleState = rollbackState; // 超時回滾
            renderBattle();
        } finally { 
            isBusy = false; 
            if (currentBattleState && !currentBattleState.battle_over) {
                const btn = document.getElementById('endTurnBtn');
                if (btn) btn.disabled = false;
            }
        }
    }

    async function doEndTurn() {
        if (isBusy || !currentBattleState || currentBattleState.battle_over) return;
        isBusy = true;
        const btn = document.getElementById('endTurnBtn');
        if (btn) { btn.textContent = "敵方行動中..."; btn.disabled = true; }
        
        const rollbackState = JSON.parse(JSON.stringify(currentBattleState)); // 🌟 備份

        try {
            const res = await fetchWithTimeout('/api/battle/end-turn', { method: 'POST' });
            const data = await res.json();
            if (!data.ok) { 
                alert(data.error); 
                currentBattleState = rollbackState; // 🌟 回滾
                renderBattle();
                return; 
            }
            selectedCardIndex = null; 
            currentBattleState = data.state;
            renderBattle(); 
            playEvents(data.events);
            if (currentBattleState.battle_over) setTimeout(() => finishBattle(currentBattleState.victory), 700);
        } catch (e) { 
            alert('結束回合失敗：' + e.message); 
            currentBattleState = rollbackState; // 🌟 回滾
            renderBattle();
        } finally { 
            isBusy = false; 
            if (currentBattleState && !currentBattleState.battle_over) {
                const btn = document.getElementById('endTurnBtn');
                if (btn) { btn.textContent = "結束回合"; btn.disabled = false; }
            }
        }
    }

    function playEvents(events) {
        if (!events || !events.length) return;
        events.forEach(ev => {
            if (ev.type === 'damage') {
                showDamageNumber(ev.target, ev.value, ev.is_crit);
            } else if (ev.type === 'heal') {
                showHealFloat(ev.target, ev.value);
            } else if (ev.type === 'shield') {
                showShieldFloat(ev.target, ev.value);
            } else if (ev.type === 'sp_gain') {
                showSPFloat(ev.value);
            } else if (ev.type === 'enemy_attack') {
                // 🌟 新增：敵人攻擊我方，顯示紅色震動與數字
                showPlayerDamage(ev.target, ev.value);
            } else if (ev.type === 'log') {
                if (ev.msg) console.log("戰鬥提示:", ev.msg);
            }
        });
    }

    // 新增這個輔助函數
    function showPlayerDamage(partyIndex, damage) {
        const el = document.querySelector(`.player-status[data-party-index="${partyIndex}"]`);
        if (!el) return;
        
        // 震動動畫
        el.style.animation = 'shake 0.3s';
        setTimeout(() => { el.style.animation = ''; }, 300);

        // 紅色飄字
        const floatText = document.createElement('div');
        floatText.style.cssText = `
            position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
            color: #ff4d4d; font-size: 20px; font-weight: 900; text-shadow: 0 0 8px #ff0000;
            pointer-events: none; animation: floatUp 0.9s ease-out forwards; z-index: 100;
        `;
        floatText.textContent = `-${damage}`;
        el.style.position = 'relative';
        el.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    function showDamageNumber(enemyId, damage, isCrit) {
        const el = document.querySelector(`.enemy-card[data-enemy-id="${enemyId}"]`);
        if (!el) return;
        const floatText = document.createElement('div');
        floatText.className = `damage-float ${isCrit ? 'crit' : ''}`;
        floatText.textContent = `-${damage}`;
        if (isCrit) {
            const critLabel = document.createElement('div');
            critLabel.className = 'crit-label';
            critLabel.textContent = '克制!';
            floatText.appendChild(critLabel);
        }
        el.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    function showHealFloat(partyIndex, value) {
        const el = document.querySelector(`.player-status[data-party-index="${partyIndex}"]`);
        if (!el || value <= 0) return;
        const floatText = document.createElement('div');
        floatText.style.cssText = `
            position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
            color: #4ade80; font-size: 18px; font-weight: 900; text-shadow: 0 0 8px #4ade80;
            pointer-events: none; animation: floatUp 0.9s ease-out forwards;
        `;
        floatText.textContent = `+${value}`;
        el.style.position = 'relative';
        el.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    function showShieldFloat(partyIndex, value) {
        const el = document.querySelector(`.player-status[data-party-index="${partyIndex}"]`);
        if (!el || value <= 0) return;
        const floatText = document.createElement('div');
        floatText.style.cssText = `
            position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
            color: #00e5ff; font-size: 16px; font-weight: 900; text-shadow: 0 0 8px #00e5ff;
            pointer-events: none; animation: floatUp 0.9s ease-out forwards;
        `;
        floatText.textContent = `🛡️+${value}`;
        el.style.position = 'relative';
        el.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    function showSPFloat(value) {
        const spEl = document.getElementById('spValue');
        if (!spEl) return;
        const wrap = spEl.parentElement;
        if (!wrap) return;
        wrap.style.position = 'relative';
        const floatText = document.createElement('div');
        floatText.style.cssText = `
            position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
            color: #00e5ff; font-size: 16px; font-weight: 900; text-shadow: 0 0 10px #00e5ff;
            pointer-events: none; animation: floatUp 0.9s ease-out forwards;
        `;
        floatText.textContent = `+${value} SP`;
        wrap.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    async function finishBattle(victory) {
        if (!victory) {
            alert("戰鬥失敗，全員陣亡...");
            if (currentBattleIsWeekly) {
                currentBattleIsWeekly = false;
                document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
                document.getElementById('weeklyView').classList.add('active');
                document.querySelectorAll('.nav-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.view === 'weekly');
                });
                loadWeeklyPanel();
            } else {
                document.getElementById('stageSelect').style.display = 'block';
                document.getElementById('battleContainer').style.display = 'none';
            }
            currentBattleState = null;
            return;
        }
        try {
            const res = await fetchWithTimeout('/api/battle/claim-reward', { method: 'POST' });
            const data = await res.json();

            if (data.ok) {
                if (data.is_weekly) {
                    alert(`週常通關！使用 ${data.turns} 回合，評分 ${data.grade}！（最佳 ${data.best_grade} · ${data.best_turns} 回合）獲得 ${data.exp_gain} EXP。`);
                } else if (data.is_first_clear) {
                    alert(`首通獎勵！獲得 ${data.reward} 柚幣與 ${data.exp_gain} EXP！`);
                    if (!clearedStages.includes(currentSelectedStageId)) clearedStages.push(currentSelectedStageId);
                } else {
                    alert(`戰鬥勝利！獲得 ${data.exp_gain} EXP。（該關卡已通關過，無額外柚幣）`);
                }

                fetchWithTimeout('/api/auth/me').then(r => r.json()).then(d => {
                    if (d.logged_in) { updateCoinsUI(d.player.coins); updateExpUI(d.player.stats?.exp || 0); }
                });

                if (!data.is_weekly) {
                    const activeTab = document.querySelector('.stage-tab.active');
                    if (activeTab) renderStageList(activeTab.dataset.game);
                }
            } else { alert(data.error); }
        } catch (e) { alert("結算失敗： " + e.message); }

        if (currentBattleIsWeekly) {
            currentBattleIsWeekly = false;
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('weeklyView').classList.add('active');
            document.querySelectorAll('.nav-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.view === 'weekly');
            });
            loadWeeklyPanel();
        } else {
            document.getElementById('stageSelect').style.display = 'block';
            document.getElementById('battleContainer').style.display = 'none';
        }
        currentBattleState = null;
    }

    // =========================================================
    // 升級
    // =========================================================
    function openUpgradeModal(charName) {
        currentUpgradeChar = charName;
        const card = playerData.cards[charName];
        const lvl = card.level || 1;
        
        document.getElementById('upgradeName').textContent = `${charName} - 升級`;
        document.getElementById('upgradeCurrentLvl').textContent = lvl;
        
        upgradeSlider.min = 1;
        upgradeSlider.max = 60;
        upgradeSlider.value = lvl;
        
        updateUpgradeCostUI(lvl, lvl);
        upgradeModal.classList.add('show');
    }

    upgradeSlider?.addEventListener('input', (e) => {
        const targetLvl = parseInt(e.target.value);
        const currentLvl = playerData.cards[currentUpgradeChar].level || 1;
        updateUpgradeCostUI(currentLvl, targetLvl);
    });

    function updateUpgradeCostUI(currentLvl, targetLvl) {
        targetLvlDisplay.textContent = targetLvl;
        const costEl = document.getElementById('upgradeCostInfo');

        if (targetLvl === currentLvl) {
            costEl.innerHTML = `當前等級不變`;
            doUpgradeBtn.disabled = true;
            doUpgradeBtn.textContent = '確認變更';
            return;
        }

        if (isTester) {
            if (targetLvl < currentLvl) {
                costEl.innerHTML = `<span style="color: #ffd700;">降級至 Lv.${targetLvl} (測試員特權)</span>`;
                doUpgradeBtn.textContent = '確認降級';
            } else {
                costEl.innerHTML = `<span style="color: #ffd700;">升級至 Lv.${targetLvl} (測試員特權)</span>`;
                doUpgradeBtn.textContent = '確認升級';
            }
            doUpgradeBtn.disabled = false;
            return;
        }

        doUpgradeBtn.textContent = '確認升級';
        if (targetLvl < currentLvl) { doUpgradeBtn.disabled = true; return; }

        let costExp = 0;
        for (let i = currentLvl; i < targetLvl; i++) costExp += i * 20;
        
        const currentExp = playerData.stats?.exp || 0;
        if (currentExp < costExp) {
            costEl.innerHTML = `需要消耗：<span style="color: #ff4d4d; font-weight: bold;">${costExp}</span> EXP (經驗不足)`;
            doUpgradeBtn.disabled = true;
        } else {
            costEl.innerHTML = `需要消耗：<span style="color: #00e5ff; font-weight: bold;">${costExp}</span> EXP`;
            doUpgradeBtn.disabled = false;
        }
    }

    closeUpgradeBtn?.addEventListener('click', () => upgradeModal.classList.remove('show'));

    doUpgradeBtn?.addEventListener('click', async () => {
        const currentLvl = playerData.cards[currentUpgradeChar].level || 1;
        const targetLvl = parseInt(upgradeSlider.value);
        if (targetLvl === currentLvl) return;

        doUpgradeBtn.disabled = true;
        doUpgradeBtn.textContent = '處理中...';
        
        try {
            const res = await fetchWithTimeout('/api/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: currentUpgradeChar, target_level: targetLvl })
            });
            const data = await res.json();
            if (data.ok) {
                playerData.cards[currentUpgradeChar].level = data.level;
                updateExpUI(data.exp);
                upgradeSlider.value = data.level;
                document.getElementById('upgradeCurrentLvl').textContent = data.level;
                updateUpgradeCostUI(data.level, data.level);
                renderRoster();
                const activeTab = document.querySelector('.stage-tab.active');
                if (activeTab) loadPartySelection();
            } else { alert(data.error); }
        } catch (e) { alert("操作失敗：" + e.message); } finally { doUpgradeBtn.textContent = '確認變更'; }
    });

    toAwakenBtn?.addEventListener('click', () => {
        upgradeModal.classList.remove('show');
        if (currentUpgradeChar) openAwakenModal(currentUpgradeChar);
    });

    // =========================================================
    // 每日任務
    // =========================================================
    async function loadDailyTasks() {
        try {
            const res = await fetchWithTimeout('/api/daily');
            const data = await res.json();
            if (!data.ok) return;
            dailyData = data;
            renderDailyUI();
        } catch (e) { console.error('載入每日任務失敗', e); }
    }

    function renderDailyUI() {
        if (!dailyData) return;
        const points = Math.min(dailyData.points, 100);
        dailyBarFill.style.width = `${points}%`;
        dailyPointsText.textContent = dailyData.points;

        document.querySelectorAll('.tier').forEach(el => {
            const tier = parseInt(el.dataset.tier);
            el.classList.remove('claimable', 'claimed');
            if (dailyData.claimed.includes(tier)) {
                el.classList.add('claimed');
            } else if (dailyData.points >= tier) {
                el.classList.add('claimable');
                el.onclick = () => claimDailyTier(tier);
            } else {
                el.onclick = null;
            }
        });

        dailyTaskList.innerHTML = '';
        for (const [key, config] of Object.entries(dailyData.config)) {
            const progress = dailyData.tasks[key] || 0;
            const isCompleted = progress >= config.target;
            
            const div = document.createElement('div');
            div.className = `daily-task-item ${isCompleted ? 'completed' : ''}`;
            
            let statusText = isCompleted ? '已達成' : `${progress}/${config.target}`;
            
            div.innerHTML = `
                <div class="task-desc">${config.desc}</div>
                <div>
                    <span class="task-reward">+${config.points} 活躍</span>
                    <span class="task-status">${statusText}</span>
                </div>
            `;
            dailyTaskList.appendChild(div);
        }
    }

    async function claimDailyTier(tier) {
        try {
            const res = await fetchWithTimeout('/api/daily/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier })
            });
            const data = await res.json();
            if (data.ok) {
                alert(`領取成功！獲得 ${data.reward} 柚幣`);
                loadDailyTasks();
                fetchWithTimeout('/api/auth/me').then(r => r.json()).then(d => {
                    if (d.logged_in) updateCoinsUI(d.player.coins);
                });
            } else { alert(data.error); }
        } catch (e) { alert("領取失敗：" + e.message); }
    }

    // =========================================================
    // 週常深淵
    // =========================================================
    async function loadWeeklyPanel() {
        try {
            const res = await fetchWithTimeout('/api/weekly');
            const data = await res.json();
            if (!data.ok) return;
            weeklyData = data;
            renderWeeklyStages();
            const pRes = await fetchWithTimeout('/api/battle/party');
            const pData = await pRes.json();
            if (pData.ok) renderPartySelection(pData.characters, 'weeklyPartyGrid');
        } catch (e) { console.error('載入週常失敗', e); }
    }

    function renderWeeklyStages() {
        const list = document.getElementById('weeklyStageList');
        if (!list || !weeklyData) return;
        list.innerHTML = '';
        weeklyData.stages.forEach(stage => {
            const div = document.createElement('div');
            div.className = 'weekly-stage-item';
            const best = stage.best_grade;
            const bestInfo = best ? `最佳：${best} · ${stage.best_turns} 回合` : '尚未通關';
            const rule = stage.grades_rule;

            let gradesHtml = '';
            ['S', 'A', 'B'].forEach(g => {
                const reached = best && ({'B':1,'A':2,'S':3})[best] >= ({'B':1,'A':2,'S':3})[g];
                const claimed = (stage.claimed || []).includes(g);
                const btnLabel = claimed ? '已領取' : (reached ? '領取' : '未達成');
                const btnDisabled = claimed || !reached;
                gradesHtml += `
                    <div class="weekly-grade ${reached ? 'reached' : ''} ${claimed ? 'claimed' : ''}">
                        <span class="weekly-grade-label">${g}</span>
                        <span class="weekly-grade-turn">≤ ${g === 'S' ? rule.S : (g === 'A' ? rule.A : '通關')} 回合</span>
                        <span class="weekly-grade-reward">${stage.reward_per_grade} 柚幣</span>
                        <button class="btn-weekly-claim" data-stage="${stage.stage_id}" data-grade="${g}" ${btnDisabled ? 'disabled' : ''}>${btnLabel}</button>
                    </div>
                `;
            });

            div.innerHTML = `
                <div class="weekly-stage-header">
                    <div>
                        <div class="weekly-stage-name">${stage.name}</div>
                        <div class="weekly-stage-meta">${bestInfo}</div>
                    </div>
                    <button class="btn-primary btn-weekly-challenge" data-stage="${stage.stage_id}">挑戰</button>
                </div>
                <div class="weekly-grades">${gradesHtml}</div>
            `;
            list.appendChild(div);
        });

        list.querySelectorAll('.btn-weekly-challenge').forEach(btn => {
            btn.addEventListener('click', () => {
                currentWeeklyStageId = btn.dataset.stage;
                updatePartySelectBtn();
                document.querySelectorAll('.weekly-stage-item').forEach(it => it.classList.remove('selected'));
                btn.closest('.weekly-stage-item').classList.add('selected');
            });
        });

        list.querySelectorAll('.btn-weekly-claim').forEach(btn => {
            btn.addEventListener('click', async () => {
                const stage_id = btn.dataset.stage;
                const grade = btn.dataset.grade;
                btn.disabled = true;
                try {
                    const res = await fetchWithTimeout('/api/weekly/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stage_id, grade })
                    });
                    const data = await res.json();
                    if (data.ok) {
                        alert(`領取成功！獲得 ${data.reward} 柚幣`);
                        fetchWithTimeout('/api/auth/me').then(r => r.json()).then(d => {
                            if (d.logged_in) updateCoinsUI(d.player.coins);
                        });
                        loadWeeklyPanel();
                    } else {
                        alert(data.error || '領取失敗');
                        btn.disabled = false;
                    }
                } catch (e) { alert('領取失敗：' + e.message); btn.disabled = false; }
            });
        });
    }

    document.getElementById('weeklyEnterBtn')?.addEventListener('click', async () => {
        if (selectedParty.length === 0) return alert('請先選擇至少 1 名出戰角色！');
        if (!currentWeeklyStageId) return alert('請先選擇一個週常關卡！');
        
        const btn = document.getElementById('weeklyEnterBtn');
        if (btn) { btn.disabled = true; btn.textContent = '連線中...'; }

        currentBattleIsWeekly = true;
        currentSelectedStageId = currentWeeklyStageId;

        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.nav-tab[data-view="battle"]').classList.add('active');
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('battleView').classList.add('active');
        document.getElementById('stageSelect').style.display = 'none';
        document.getElementById('battleContainer').style.display = 'flex';

        try {
            const res = await fetchWithTimeout('/api/battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage_id: currentWeeklyStageId, party: selectedParty })
            });
            const data = await res.json();
            if (!data.ok) {
                alert(data.error || "進入戰鬥失敗");
                currentBattleIsWeekly = false;
                document.getElementById('battleView').classList.remove('active');
                document.getElementById('weeklyView').classList.add('active');
                if (btn) { btn.disabled = false; btn.textContent = '挑戰週常深淵'; }
                return;
            }
            currentBattleState = data.state;
            if (data.story) showStoryModal(data.story, startActualBattle);
            else startActualBattle();
        } catch (e) {
            alert(`進入戰鬥失敗: ${e.message}`);
            currentBattleIsWeekly = false;
            if (btn) { btn.disabled = false; btn.textContent = '挑戰週常深淵'; }
        }
    });

    // 綁定按鈕
    document.getElementById('endTurnBtn')?.addEventListener('click', doEndTurn);
    document.getElementById('enterStageBtn')?.addEventListener('click', enterBattle);
});