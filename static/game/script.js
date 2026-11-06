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

document.addEventListener('DOMContentLoaded', () => {
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
    const logoutBtn = document.getElementById('logoutBtn');
    const pityCount = document.getElementById('pityCount');
    const draw1Btn = document.getElementById('draw1Btn');
    const draw10Btn = document.getElementById('draw10Btn');

    const gachaView = document.getElementById('gachaView');
    const rosterView = document.getElementById('rosterView');
    const battleView = document.getElementById('battleView');
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
    const userExpDisplay = document.getElementById('userExp');
    const upgradeModal = document.getElementById('upgradeModal');
    const closeUpgradeBtn = document.getElementById('closeUpgradeBtn');
    const upgrade1Btn = document.getElementById('upgrade1Btn');
    const upgradeMaxBtn = document.getElementById('upgradeMaxBtn');
    const toAwakenBtn = document.getElementById('toAwakenBtn');
    const upgradeSlider = document.getElementById('upgradeSlider');
    const targetLvlDisplay = document.getElementById('targetLvlDisplay');
    const doUpgradeBtn = document.getElementById('doUpgradeBtn');
    let currentUpgradeChar = null;

    // --- 初始化 ---
    fetch('/api/auth/me')
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 200 && data.logged_in) initGame(data);
            else showLogin();
        })
        .catch(() => showLogin());

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
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '發生錯誤');
            return data;
        })
        .then(() => fetch('/api/auth/me'))
        .then(res => res.json())
        .then(data => { if (data.logged_in) initGame(data); })
        .catch(err => { errorDiv.textContent = err.message; })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = currentMode === 'login' ? '進 入 幻 境' : '創 建 帳 號';
        });
    });

    logoutBtn.addEventListener('click', () => {
        fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
    });

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            if (tab.dataset.view === 'gacha') {
                gachaView.classList.add('active');
            } else if (tab.dataset.view === 'battle') {
                battleView.classList.add('active');
                document.getElementById('stageSelect').style.display = 'block';
                document.getElementById('battleContainer').style.display = 'none';
                loadPartySelection();
            } else {
                rosterView.classList.add('active');
                renderRoster();
            }
        });
    });

    draw1Btn.addEventListener('click', () => handleDraw(1));
    draw10Btn.addEventListener('click', () => handleDraw(10));

    const openWishlistBtn = document.getElementById('openWishlistBtn');
    const wishlistModal = document.getElementById('wishlistModal');
    const closeWishlistBtn = document.getElementById('closeWishlistBtn');
    const saveWishlistBtn = document.getElementById('saveWishlistBtn');
    const wishlistGrid = document.getElementById('wishlistGrid');

    openWishlistBtn.addEventListener('click', () => {
        if (Object.keys(allCharacters).length === 0) return alert('正在載入角色數據，請稍候...');
        renderWishlistGrid();
        wishlistModal.classList.add('show');
    });

    closeWishlistBtn.addEventListener('click', () => wishlistModal.classList.remove('show'));

    saveWishlistBtn.addEventListener('click', () => {
        const selected = Array.from(wishlistGrid.querySelectorAll('.wish-item.selected')).map(el => el.dataset.name);
        if (selected.length > 1) return alert('心願單只能選擇 1 個角色！');
        saveWishlistBtn.disabled = true;
        saveWishlistBtn.textContent = '儲存中...';
        fetch('/api/gacha/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wishlist: selected })
        })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                currentWishlist = data.wishlist;
                wishlistModal.classList.remove('show');
            } else {
                alert(data.error);
            }
        })
        .finally(() => {
            saveWishlistBtn.disabled = false;
            saveWishlistBtn.textContent = '儲存';
        });
    });

    const resultModal = document.getElementById('gachaResultModal');
    document.getElementById('closeResultBtn').addEventListener('click', () => resultModal.classList.remove('show'));

    closeAwakenBtn.addEventListener('click', () => awakenModal.classList.remove('show'));

    doAwakenBtn.addEventListener('click', async () => {
        if (!currentAwakenChar) return;
        doAwakenBtn.disabled = true;
        doAwakenBtn.textContent = '處理中...';
        try {
            const res = await fetch(`/api/awaken/${encodeURIComponent(currentAwakenChar)}`, { method: 'POST' });
            const data = await res.json();
            if (!data.ok) {
                alert(data.error);
            } else {
                playerData.cards[currentAwakenChar].awaken = data.awaken;
                playerData.cards[currentAwakenChar].shards = data.shards;
                await openAwakenModal(currentAwakenChar);
                renderRoster();
            }
        } catch (e) {
            alert('覺醒失敗');
        } finally {
            doAwakenBtn.disabled = false;
        }
    });

    // --- 核心 ---
    async function initGame(data) {
        playerData = data.player;
        isTester = (data.username === 'tester');
        userNameDisplay.textContent = data.username;
        updateCoinsUI(playerData.coins);
        updateExpUI(playerData.stats?.exp || 0);
        pityCount.textContent = playerData.pity;
        currentWishlist = playerData.wishlist || [];
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.style.display = 'none';
            gameContainer.style.display = 'flex';
        }, 400);
        if (Object.keys(allCharacters).length === 0) await fetchAllCharacters();
        updateDrawButtons();
    }

    function updateExpUI(exp) {
        if (!playerData) playerData = {};
        if (!playerData.stats) playerData.stats = {};
        playerData.stats.exp = exp;
        userExpDisplay.textContent = exp;
    }

    function showLogin() {
        gameContainer.style.display = 'none';
        loginOverlay.style.display = 'flex';
        loginOverlay.style.opacity = '1';
    }

    function updateCoinsUI(coins) {
        if (!playerData) playerData = {};
        playerData.coins = coins;
        userCoinsDisplay.textContent = coins;
        updateDrawButtons();
    }

    function updateDrawButtons() {
        if (!playerData) return;
        draw1Btn.disabled = playerData.coins < 160;
        draw10Btn.disabled = playerData.coins < 1600;
    }

    async function fetchAllCharacters() {
        try {
            const metaRes = await fetch('/api/meta');
            const meta = await metaRes.json();
            const rarityMap = {
                "朝武芳乃":"SSR", "白雪乃愛":"SSR", "明月栞那":"SSR", "綾地寧寧":"SSR",
                "常陸茉子":"SR", "叢雨":"SR", "谷風天音":"SR", "星河輝耶":"SR",
                "百里風實花":"SR", "四季夏目":"SR", "墨染希":"SR", "因幡巡":"SR", "椎葉紬":"SR"
            };
            for (const [gameName, gameMeta] of Object.entries(meta.games)) {
                const res = await fetch(`/api/games/${encodeURIComponent(gameName)}/characters`);
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
        } catch (e) {
            console.error('載入角色失敗', e);
        }
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
            div.innerHTML = `
                <img src="/static/picture/thumb-${info.code}-${info.index}.png" alt="${name}">
                <span>${name}</span>
            `;
            div.addEventListener('click', () => {
                if (div.classList.contains('selected')) {
                    div.classList.remove('selected');
                } else {
                    if (wishlistGrid.querySelectorAll('.wish-item.selected').length >= 1) {
                        return alert('心願單只能選擇 1 個角色！');
                    }
                    div.classList.add('selected');
                }
            });
            wishlistGrid.appendChild(div);
        });
    }

    async function handleDraw(count) {
        if (playerData.coins < 160 * count) return;
        draw1Btn.disabled = true;
        draw10Btn.disabled = true;
        try {
            const res = await fetch('/api/gacha/draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count })
            });
            const data = await res.json();
            if (!data.ok) return alert(data.error);
            updateCoinsUI(data.coins);
            pityCount.textContent = data.pity;
            const meRes = await fetch('/api/auth/me');
            const meData = await meRes.json();
            if (meData.logged_in) {
                playerData = meData.player;
                updateCoinsUI(playerData.coins);
            }
            showGachaResults(data.results);
        } catch (e) {
            alert('抽卡失敗，請檢查網路連線');
        } finally {
            updateDrawButtons();
        }
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
                <img src="/static/picture/char-${info.code}-${info.index}.png" onerror="this.src='/static/picture/thumb-${info.code}-${info.index}.png'">
                <div class="card-info">
                    <div class="card-name">${card.name}</div>
                    ${tagHtml}
                </div>
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
                <img src="/static/picture/char-${info.code}-${info.index}.png" onerror="this.src='/static/picture/thumb-${info.code}-${info.index}.png'">
                <div class="roster-info">
                    <div class="roster-name">${name}</div>
                    <div class="roster-awaken">Lv.${card.level || 1} · 覺醒 ${card.awaken} / 6</div>
                </div>
            `;
            // 點擊改為打開升級
            div.addEventListener('click', () => openUpgradeModal(name));
            rosterGrid.appendChild(div);
        });
    }

    async function openAwakenModal(charName) {
        currentAwakenChar = charName;
        try {
            const res = await fetch(`/api/awaken/${encodeURIComponent(charName)}`);
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
                
                // 清除舊事件與樣式
                el.onclick = null;
                el.style.border = 'none';
                el.style.cursor = 'default';
                
                // ★ 測試員專屬：點擊切換覺醒等級
                if (isTester) {
                    el.style.cursor = 'pointer';
                    el.style.border = '1px dashed rgba(212, 175, 55, 0.5)';
                    el.title = '點擊切換至此覺醒等級';
                    
                    el.onclick = async () => {
                        // 如果點擊的是當前等級，則降一級；否則升/降到點擊的等級
                        const targetLvl = (idx + 1 === data.awaken) ? idx : (idx + 1);
                        
                        const req = await fetch('/api/tester/awaken', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: charName, target_lvl: targetLvl })
                        });
                        const reqData = await req.json();
                        if (reqData.ok) {
                            // 更新本地數據，防止圖鑑不同步
                            playerData.cards[charName].awaken = reqData.awaken;
                            await openAwakenModal(charName); // 刷新當前彈窗
                            renderRoster(); // 刷新背景圖鑑
                        }
                    };
                }

                el.querySelector('.lvl-desc').textContent = desc;
                
                // 判斷是否已解鎖
                if (idx < data.awaken) {
                    el.classList.add('active');
                    el.querySelector('.lvl-title').innerHTML = `覺醒 ${['I','II','III','IV','V','VI'][idx]} <span class="lvl-cost" style="color:var(--gold-main)">已解鎖</span>`;
                } else {
                    el.classList.remove('active');
                    el.querySelector('.lvl-title').innerHTML = `覺醒 ${['I','II','III','IV','V','VI'][idx]} <span class="lvl-cost">消耗 1 碎片</span>`;
                }
            });

            // 底部按鈕狀態
            if (isTester) {
                doAwakenBtn.textContent = '✨ 測試員無需碎片，請直接點擊上方等級框切換';
                doAwakenBtn.disabled = true;
                doAwakenBtn.style.opacity = '0.8';
                doAwakenBtn.style.borderColor = 'transparent';
                doAwakenBtn.style.backgroundColor = 'transparent';
            } else {
                doAwakenBtn.style.opacity = '1';
                doAwakenBtn.style.borderColor = 'var(--red-deep)';
                doAwakenBtn.style.backgroundColor = '';
                
                if (data.awaken >= 6) {
                    doAwakenBtn.textContent = '已滿級';
                    doAwakenBtn.disabled = true;
                } else if (data.shards >= 1) {
                    doAwakenBtn.textContent = `消耗 1 碎片覺醒`;
                    doAwakenBtn.disabled = false;
                } else {
                    doAwakenBtn.textContent = `碎片不足 (需 1)`;
                    doAwakenBtn.disabled = true;
                }
            }
            awakenModal.classList.add('show');
        } catch (e) {
            console.error(e);
            alert('載入覺醒資訊失敗');
        }
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
            // ★ 如果是 Tester，強制不鎖定
            if (index > 0 && !isTester) {
                const prevStageId = STAGE_DATA[gameCode][index - 1].id;
                if (!clearedStages.includes(prevStageId)) isLocked = true;
            }
            const isCleared = clearedStages.includes(stage.id);

            const div = document.createElement('div');
            div.className = `stage-item ${currentSelectedStageId === stage.id ? 'selected' : ''} ${isLocked ? 'locked' : ''}`;
            
            let testerBtn = '';
            if (isTester) {
                testerBtn = `<button class="btn-tester-toggle" data-id="${stage.id}" data-cleared="${isCleared}" style="background:transparent; border:1px solid #ffd700; color:#ffd700; padding:2px 8px; border-radius:4px; cursor:pointer; z-index:10;">${isCleared ? '🔒 鎖定' : '🔓 解鎖'}</button>`;
            }

            div.innerHTML = `
                <div class="stage-name" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${stage.name} ${isCleared ? '✅' : ''}</span>
                    ${testerBtn}
                </div>
                <div class="stage-reward">${isLocked ? '🔒 需先通關前置' : `獎勵：${stage.reward} 柚幣`}</div>
            `;
            
            // 關卡本身的點擊事件
            div.addEventListener('click', (e) => {
                // 如果點的是內部的解鎖按鈕，則不觸發選擇關卡
                if (e.target.closest('.btn-tester-toggle')) return;
                
                if (isLocked) {
                    return alert('請先通關前置關卡！');
                }
                
                currentSelectedStageId = stage.id;
                renderStageList(gameCode);
                updatePartySelectBtn();
            });

            // Tester 解鎖按鈕的點擊事件
            if (isTester) {
                const btn = div.querySelector('.btn-tester-toggle');
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation(); 
                    const action = btn.dataset.cleared === 'true' ? 'lock' : 'unlock';
                    const res = await fetch('/api/tester/stage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stage_id: stage.id, action })
                    });
                    const d = await res.json();
                    if (d.ok) {
                        clearedStages = d.cleared_stages;
                        renderStageList(gameCode);
                    }
                });
            }

            list.appendChild(div);
        });
    }

    async function loadPartySelection() {
        try {
            const progRes = await fetch('/api/battle/progress');
            const progData = await progRes.json();
            if (progData.ok) {
                clearedStages = progData.cleared_stages;
                // 重新渲染當前選中的 Tab，確保狀態更新
                const activeTab = document.querySelector('.stage-tab.active');
                if (activeTab) renderStageList(activeTab.dataset.game);
            }
        } catch(e) {}
        
        try {
            const res = await fetch('/api/battle/party');
            const data = await res.json();
            if (!data.ok) return alert(data.error);
            renderPartySelection(data.characters);
        } catch (e) {
            console.error('載入隊伍失敗', e);
        }
    }

    function renderPartySelection(characters) {
        const grid = document.getElementById('partySelectGrid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!characters || characters.length === 0) {
            grid.innerHTML = '<p style="color:#aaa; grid-column:1/-1; text-align:center; padding:20px;">還沒有任何角色，去抽卡吧！</p>';
            selectedParty = [];
            updatePartySelectBtn();
            return;
        }
        selectedParty = selectedParty.filter(n => characters.some(c => c.name === n));
        characters.forEach(c => {
            const info = allCharacters[c.name] || { code: 'game', index: 1 };
            const isSel = selectedParty.includes(c.name);
            const div = document.createElement('div');
            div.className = `party-select-item ${c.rarity} ${isSel ? 'selected' : ''}`;
            div.dataset.name = c.name;
            div.innerHTML = `
                <img src="/static/picture/char-${info.code}-${info.index}.png"
                    onerror="this.src='/static/picture/thumb-${info.code}-${info.index}.png'"
                    alt="${c.name}">
                <div class="party-select-info">
                    <div class="party-select-name">${c.name}</div>
                    <!-- ★ 修改：補上 Lv.${c.level || 1} -->
                    <div class="party-select-meta">Lv.${c.level || 1} · ${c.rarity} · 覺醒 ${c.awaken}</div>
                </div>
                <div class="party-select-check">✓</div>
            `;
            div.addEventListener('click', () => {
                if (selectedParty.includes(c.name)) {
                    selectedParty = selectedParty.filter(n => n !== c.name);
                } else {
                    if (selectedParty.length >= 3) return alert('最多只能選擇 3 名角色！');
                    selectedParty.push(c.name);
                }
                renderPartySelection(characters);
            });
            grid.appendChild(div);
        });
        updatePartySelectBtn();
    }

    function updatePartySelectBtn() {
        const countEl = document.getElementById('partySelectCount');
        if (countEl) countEl.textContent = selectedParty.length;
        
        const btn = document.getElementById('enterStageBtn');
        if (btn) {
            if (selectedParty.length === 0) {
                btn.disabled = true;
                btn.textContent = '請先選擇出戰角色';
            } else if (!currentSelectedStageId) {
                btn.disabled = true;
                btn.textContent = '請先選擇關卡';
            } else {
                btn.disabled = false;
                btn.textContent = '進入戰鬥';
            }
        }
    }

    // =========================================================
    // 戰鬥
    // =========================================================
    async function enterBattle() {
        if (selectedParty.length === 0) return alert('請先選擇至少 1 名出戰角色！');
        if (!currentSelectedStageId) return alert('請先選擇一個關卡！');
        
        try {
            const res = await fetch('/api/battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage_id: currentSelectedStageId, party: selectedParty })
            });
            const data = await res.json();
            if (!data.ok) return alert(data.error || "進入戰鬥失敗");
            
            currentBattleState = data.state;
            const story = data.story || "";
            
            if (story) {
                showStoryModal(story, () => {
                    startActualBattle();
                });
            } else {
                startActualBattle();
            }
        } catch (e) {
            alert(`進入戰鬥失敗: ${e.message}`);
        }
    }

    function startActualBattle() {
        selectedCardIndex = null;
        isBusy = false;
        document.getElementById('stageSelect').style.display = 'none';
        document.getElementById('battleContainer').style.display = 'flex';
        document.querySelector('.enemy-area').innerHTML = ''; 
        renderBattle();
    }

    function showStoryModal(text, callback) {
        const modal = document.getElementById('storyModal');
        document.getElementById('storyText').textContent = text;
        modal.classList.add('show');
        
        const btn = document.getElementById('closeStoryBtn');
        btn.onclick = () => {
            modal.classList.remove('show');
            callback();
        };
    }

    function renderBattle() {
        if (!currentBattleState) return;
        
        let waveEl = document.getElementById('waveDisplay');
        if (!waveEl) {
            waveEl = document.createElement('div');
            waveEl.id = 'waveDisplay';
            document.getElementById('battleContainer').appendChild(waveEl);
        }
        waveEl.textContent = `第 ${currentBattleState.wave} / ${currentBattleState.total_waves} 波`;

        renderEnemies();
        renderPlayerParty();
        renderHand();
        updateSPUI();
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
            for (let i = 0; i < enemy.max_toughness; i++) {
                toughHtml += `<div class="toughness-seg ${i < enemy.toughness ? 'active' : ''}"></div>`;
            }
            toughHtml += '</div>';

            el.innerHTML = `
                <div class="enemy-avatar-wrap">
                    <div class="enemy-portrait mirror-filter" style="background-image: url('/static/picture/char-${enemy.code}-${enemy.index}.png');"></div>
                    <div class="enemy-shadow"></div>
                    ${enemy.is_stunned ? '<div class="stun-icon">💫</div>' : ''}
                </div>
                <div class="enemy-info">
                    <div class="enemy-name">${enemy.name}</div>
                    <div class="enemy-mind">心相：${enemy.mind}</div>
                    <div class="hp-bar"><div class="hp-fill" style="width: ${(enemy.hp / enemy.max_hp) * 100}%;"></div></div>
                    ${toughHtml}
                </div>
            `;
            el.addEventListener('click', () => {
                if (isBusy || !currentBattleState || currentBattleState.battle_over) return;
                if (selectedCardIndex === null) {
                    return alert("請先點擊下方手牌選擇一張卡牌！");
                }
                const card = currentBattleState.hand[selectedCardIndex];
                if (!card) return;
                if (card.action_type !== 'damage') {
                    return alert("這張卡不是傷害卡，請點擊我方角色作為目標。");
                }
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
                if (card.action_type === 'damage') {
                    return alert("傷害卡請點擊敵人作為目標。");
                }
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
            el.innerHTML = `
                <div class="card-cost">${card.cost}</div>
                <div class="card-mind mind-rin">${card.mind}</div>
                <div class="card-thumb" style="background-image: url('/static/picture/thumb-${info.code}-${info.index}.png');"></div>
                <div class="card-title">${card.name} - ${card.title}</div>
                <div class="card-desc">${card.desc}</div>
            `;
            el.addEventListener('click', () => {
                if (isBusy || !currentBattleState || currentBattleState.battle_over) return;
                if (card.cost > currentBattleState.sp) return alert("SP 不足！");

                if (card.target === 'aoe') {
                    doPlayCard(idx, null);
                    return;
                }

                if (selectedCardIndex === idx) {
                    selectedCardIndex = null;
                } else {
                    selectedCardIndex = idx;
                }
                renderHand();
                renderEnemies();
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
        try {
            const res = await fetch('/api/battle/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ card_index: cardIndex, target_index: targetIndex })
            });
            const data = await res.json();
            if (!data.ok) {
                alert(data.error);
                return;
            }
            selectedCardIndex = null;
            currentBattleState = data.state;
            renderBattle();
            playEvents(data.events);
            if (currentBattleState.battle_over) {
                setTimeout(() => finishBattle(currentBattleState.victory), 700);
            }
        } catch (e) {
            alert('操作失敗：' + e.message);
        } finally {
            isBusy = false;
            renderBattle();
        }
    }

    async function doEndTurn() {
        if (isBusy || !currentBattleState || currentBattleState.battle_over) return;
        isBusy = true;
        const btn = document.getElementById('endTurnBtn');
        if (btn) {
            btn.textContent = "敵方行動中...";
            btn.disabled = true;
        }
        try {
            const res = await fetch('/api/battle/end-turn', { method: 'POST' });
            const data = await res.json();
            if (!data.ok) {
                alert(data.error);
                return;
            }
            selectedCardIndex = null;
            currentBattleState = data.state;
            renderBattle();
            playEvents(data.events);
            if (currentBattleState.battle_over) {
                setTimeout(() => finishBattle(currentBattleState.victory), 700);
            }
        } catch (e) {
            alert('結束回合失敗：' + e.message);
        } finally {
            isBusy = false;
            renderBattle();
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
            } else if (ev.type === 'log') {
                console.log("戰鬥提示:", ev.msg);
            }
        });
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
            document.getElementById('stageSelect').style.display = 'block';
            document.getElementById('battleContainer').style.display = 'none';
            currentBattleState = null;
            return;
        }
        try {
            const res = await fetch('/api/battle/claim-reward', { method: 'POST' });
            const data = await res.json();
            
            if (data.ok) {
                if (data.is_first_clear) {
                    alert(`首通獎勵！獲得 ${data.reward} 柚幣與 ${data.exp_gain} EXP！`);
                    if (!clearedStages.includes(currentSelectedStageId)) {
                        clearedStages.push(currentSelectedStageId);
                    }
                } else {
                    alert(`戰鬥勝利！獲得 ${data.exp_gain} EXP。（該關卡已通關過，無額外柚幣）`);
                }
                
                // 刷新金幣與 EXP
                fetch('/api/auth/me').then(r => r.json()).then(d => {
                    if (d.logged_in) {
                        updateCoinsUI(d.player.coins);
                        updateExpUI(d.player.stats?.exp || 0);
                    }
                });
                
                const activeTab = document.querySelector('.stage-tab.active');
                if (activeTab) renderStageList(activeTab.dataset.game);
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert("結算失敗");
        }
        document.getElementById('stageSelect').style.display = 'block';
        document.getElementById('battleContainer').style.display = 'none';
        currentBattleState = null;
    }

    function openUpgradeModal(charName) {
        currentUpgradeChar = charName;
        const card = playerData.cards[charName];
        const lvl = card.level || 1;
        
        document.getElementById('upgradeName').textContent = `${charName} - 升級`;
        document.getElementById('upgradeCurrentLvl').textContent = lvl;
        
        upgradeSlider.min = 1;   // ★ 所有人都是 1
        upgradeSlider.max = 60;
        upgradeSlider.value = lvl;
        
        updateUpgradeCostUI(lvl, lvl);
        upgradeModal.classList.add('show');
    }

    // 滑動條拖動時即時計算
    upgradeSlider.addEventListener('input', (e) => {
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

        // ★ Tester 特權
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

        // 普通玩家
        doUpgradeBtn.textContent = '確認升級';
        if (targetLvl < currentLvl) {
            doUpgradeBtn.disabled = true;
            return;
        }

        let costExp = 0;
        for (let i = currentLvl; i < targetLvl; i++) {
            costExp += i * 20;
        }
        
        const currentExp = playerData.stats?.exp || 0;
        
        if (currentExp < costExp) {
            costEl.innerHTML = `需要消耗：<span style="color: #ff4d4d; font-weight: bold;">${costExp}</span> EXP (經驗不足)`;
            doUpgradeBtn.disabled = true;
        } else {
            costEl.innerHTML = `需要消耗：<span style="color: #00e5ff; font-weight: bold;">${costExp}</span> EXP`;
            doUpgradeBtn.disabled = false;
        }
    }

    closeUpgradeBtn.addEventListener('click', () => upgradeModal.classList.remove('show'));

    doUpgradeBtn.addEventListener('click', async () => {
        const currentLvl = playerData.cards[currentUpgradeChar].level || 1;
        const targetLvl = parseInt(upgradeSlider.value);
        
        // ★ 改為只有相等時才返回，允許降級
        if (targetLvl === currentLvl) return;

        doUpgradeBtn.disabled = true;
        doUpgradeBtn.textContent = '處理中...';
        
        try {
            const res = await fetch('/api/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: currentUpgradeChar, target_level: targetLvl })
            });
            const data = await res.json();
            if (data.ok) {
                playerData.cards[currentUpgradeChar].level = data.level;
                updateExpUI(data.exp);
                
                // ★ 更新滑動條數值，不修改 min，保持 1 以允許自由調節
                upgradeSlider.min = 1; 
                upgradeSlider.value = data.level;
                document.getElementById('upgradeCurrentLvl').textContent = data.level;
                updateUpgradeCostUI(data.level, data.level);
                
                renderRoster();
                const activeTab = document.querySelector('.stage-tab.active');
                if (activeTab) loadPartySelection();
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert("操作失敗");
        } finally {
            doUpgradeBtn.textContent = '確認變更';
        }
    });

    // 前往覺醒按鈕（加上 ?. 防呆，就算 HTML 沒寫也不會報錯）
    toAwakenBtn?.addEventListener('click', () => {
        upgradeModal.classList.remove('show');
        if (currentUpgradeChar) {
            openAwakenModal(currentUpgradeChar);
        }
    });

    // 綁定戰鬥按鈕
    document.getElementById('endTurnBtn')?.addEventListener('click', doEndTurn);
    document.getElementById('enterStageBtn')?.addEventListener('click', enterBattle);
});