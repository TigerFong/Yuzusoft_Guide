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
let currentPartyData = []; // 緩存角色列表

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

    // 通用確認彈窗 DOM
    const customConfirmModal = document.getElementById('customConfirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    
    // 新手引導 DOM
    const tutorialModal = document.getElementById('tutorialModal');
    const tutorialTitle = document.getElementById('tutorialTitle');
    const tutorialText = document.getElementById('tutorialText');
    const tutorialNextBtn = document.getElementById('tutorialNextBtn');
    const tutorialSkipBtn = document.getElementById('tutorialSkipBtn');
    
    let currentUpgradeChar = null;
    let sessionValid = false;
    let sessionData = null;

    // =========================================================
    // 自定義彈窗系統
    // =========================================================
    function showAlert(message, title = '提示') {
        return new Promise((resolve) => {
            confirmTitle.textContent = title;
            confirmMessage.innerHTML = message;
            confirmCancelBtn.style.display = 'none'; // 隱藏取消按鈕
            customConfirmModal.classList.add('show');

            confirmOkBtn.onclick = () => {
                customConfirmModal.classList.remove('show');
                // 用空字串回退到 CSS 預設值（inline-block），不要硬寫 'block'
                // 否則接下來的 showConfirm 會因為按鈕變獨佔一行而佈局錯位
                confirmCancelBtn.style.display = '';
                resolve(true);
            };
        });
    }

    function showConfirm(message, title = '提示') {
        return new Promise((resolve) => {
            confirmTitle.textContent = title;
            confirmMessage.innerHTML = message;
            confirmCancelBtn.style.display = 'block';
            customConfirmModal.classList.add('show');

            confirmOkBtn.onclick = () => {
                customConfirmModal.classList.remove('show');
                resolve(true);
            };

            confirmCancelBtn.onclick = () => {
                customConfirmModal.classList.remove('show');
                resolve(false);
            };
        });
    }

    // 1. 背景檢查登入
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
        SFX.click();
        
        // 🌟 核心：請求瀏覽器全螢幕，隱藏網址列和狀態列
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(()=>{});
        } else if (docEl.webkitRequestFullscreen) { /* Safari */
            docEl.webkitRequestFullscreen().catch(()=>{});
        } else if (docEl.msRequestFullscreen) { /* IE11 */
            docEl.msRequestFullscreen().catch(()=>{});
        }

        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        } catch(e) {}

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

    // 4. 大廳切換邏輯
    const lobbyBtns = document.querySelectorAll('.lobby-card-btn'); 
    const backBtns = document.querySelectorAll('.btn-back-lobby');

    lobbyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            SFX.click();
            const targetView = btn.dataset.target;
            
            document.querySelectorAll('.view-panel').forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });
            
            const targetEl = document.getElementById(`${targetView}View`);
            if (targetEl) {
                targetEl.classList.add('active');
                targetEl.style.display = 'flex';
            }

            if (targetView === 'battle') {
                document.getElementById('battleStep1').classList.add('active');
                document.getElementById('battleStep2').classList.remove('active');
                document.getElementById('battleContainer').style.display = 'none';
                loadPartySelection(true); 
            } else if (targetView === 'weekly') {
                document.getElementById('weeklyStep1').classList.add('active');
                document.getElementById('weeklyStep2').classList.remove('active');
                loadWeeklyPanel();
            } else if (targetView === 'daily') {
                loadDailyTasks();
            } else if (targetView === 'roster') {
                renderRoster();
                fetchWithTimeout('/api/daily/view-roster', { method: 'POST' }).catch(()=>{});
            }
        });
    });

    backBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (currentBattleState && !currentBattleState.battle_over) {
                const isConfirmed = await showConfirm('戰鬥尚未結束，確定要返回大廳嗎？');
                if (!isConfirmed) return;
                currentBattleState = null; 
            }

            document.querySelectorAll('.view-panel').forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none'; 
            });
            
            const lobby = document.getElementById('lobbyView');
            lobby.classList.add('active');
            lobby.style.display = 'flex'; 
        });
    });

    document.getElementById('btnBackToStageSelect')?.addEventListener('click', () => {
        document.getElementById('battleStep2').classList.remove('active');
        document.getElementById('battleStep1').classList.add('active');
    });
    document.getElementById('btnBackToWeeklySelect')?.addEventListener('click', () => {
        document.getElementById('weeklyStep2').classList.remove('active');
        document.getElementById('weeklyStep1').classList.add('active');
    });

    draw1Btn.addEventListener('click', () => { SFX.click(); handleDraw(1); });
    draw10Btn.addEventListener('click', () => { SFX.click(); handleDraw(10); });

    // 5. 初始化
    async function initGame(data) {
        playerData = data.player;
        isTester = (data.username === 'tester');
        userNameDisplay.textContent = data.username;
        updateCoinsUI(playerData.coins);
        updateExpUI(playerData.stats?.exp || 0);
        pityCount.textContent = playerData.pity;
        const pBar = document.getElementById('pityBarFill');
        if (pBar) pBar.style.width = Math.min(100, (playerData.pity / 80) * 100) + '%';
        currentWishlist = playerData.wishlist || [];
        
        loginOverlay.style.display = 'none';
        gameContainer.style.display = 'flex';
        
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('lobbyView').classList.add('active');

        if (Object.keys(allCharacters).length === 0) await fetchAllCharacters();
        updateDrawButtons();
        checkTutorial();
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

    // =========================================================
    // 關卡與戰鬥準備
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
            div.className = `stage-item ${isLocked ? 'locked' : ''}`;
            
            let testerBtn = isTester ? `<button class="btn-tester-toggle" data-id="${stage.id}" data-cleared="${isCleared}" style="background:transparent; border:1px solid #ffd700; color:#ffd700; padding:2px 8px; border-radius:4px; cursor:pointer;">${isCleared ? '🔒 鎖定' : '🔓 解鎖'}</button>` : '';

            div.innerHTML = `
                <div class="stage-name" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${stage.name} ${isCleared ? '✅' : ''}</span>${testerBtn}
                </div>
                <div class="stage-reward">${isLocked ? '🔒 需先通關前置' : `獎勵：${stage.reward} 柚幣`}</div>
            `;
            
            div.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-tester-toggle')) return;
                if (isLocked) return showAlert('請先通關前置關卡！');
                
                currentSelectedStageId = stage.id;
                document.getElementById('selectedStageNameText').textContent = stage.name;
                document.getElementById('battleStep1').classList.remove('active');
                document.getElementById('battleStep2').classList.add('active');
                
                renderPartySelection(currentPartyData);
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

    async function loadPartySelection(forceFetch = false) {
        try {
            const progRes = await fetchWithTimeout('/api/battle/progress');
            const progData = await progRes.json();
            if (progData.ok) {
                clearedStages = progData.cleared_stages;
                const activeTab = document.querySelector('.stage-tab.active');
                if (activeTab) renderStageList(activeTab.dataset.game);
            }
        } catch(e) {}
        
        if (forceFetch || currentPartyData.length === 0) {
            try {
                const res = await fetchWithTimeout('/api/battle/party');
                const data = await res.json();
                if (data.ok) {
                    currentPartyData = data.characters;
                }
            } catch (e) { console.error('載入隊伍失敗', e); }
        }
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
                    if (selectedParty.length >= 3) return showAlert('最多只能選擇 3 名角色！');
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
            else { weeklyBtn.disabled = false; weeklyBtn.textContent = '進入迴廊'; }
        }
    }

    async function enterBattle() {
        if (selectedParty.length === 0) return showAlert('請先選擇至少 1 名出戰角色！');
        if (!currentSelectedStageId) return showAlert('請先選擇一個關卡！');
        
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
                showAlert(data.error || "進入戰鬥失敗");
                if (btn) { btn.disabled = false; btn.textContent = '進入戰鬥'; }
                return;
            }
            currentBattleIsWeekly = false;
            currentBattleState = data.state;
            if (data.story) showStoryModal(data.story, startActualBattle);
            else startActualBattle();
        } catch (e) { 
            showAlert(`進入戰鬥失敗: ${e.message}`); 
            if (btn) { btn.disabled = false; btn.textContent = '進入戰鬥'; }
        }
    }

    function startActualBattle() {
        selectedCardIndex = null; isBusy = false;
        
        document.getElementById('battleStep1')?.classList.remove('active');
        document.getElementById('battleStep2')?.classList.remove('active');
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

    // =========================================================
    // 戰鬥渲染與操作 (樂觀 UI 優化)
    // =========================================================
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
                if (selectedCardIndex === null) return showAlert("請先點擊下方手牌選擇一張卡牌！");
                const card = currentBattleState.hand[selectedCardIndex];
                if (!card) return;
                if (card.action_type !== 'damage') return showAlert("這張卡不是傷害卡，請點擊我方角色作為目標。");
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
                if (card.action_type === 'damage') return showAlert("傷害卡請點擊敵人作為目標。");
                if (card.target === 'aoe') return;
                if (dead) return showAlert("該角色已倒下！");
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
                if (card.cost > currentBattleState.sp) { SFX.deny(); return showAlert("SP 不足！"); }
                SFX.select();
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

    // 🌟 核心：樂觀 UI 秒出傷
    async function doPlayCard(cardIndex, targetIndex) {
        if (isBusy || !currentBattleState) return;
        
        const card = currentBattleState.hand[cardIndex];
        if (!card) return;

        const rollbackState = JSON.parse(JSON.stringify(currentBattleState));
        isBusy = true;

        // 音效：必殺 or 普通出牌
        if (card.card_type === 'ultimate') SFX.ultimate();
        else SFX.cardPlay();

        // 1. 前端秒反饋：飛牌、預判扣 SP、秒出傷數字
        const cardEls = document.querySelectorAll('.battle-card');
        if(cardEls[cardIndex]) cardEls[cardIndex].classList.add('playing');

        if (card.action_type === 'damage') {
            const counterMap = {"凛":"戏", "戏":"羞", "羞":"静", "静":"阳", "阳":"和", "和":"凛"};
            if (card.target === 'single' && targetIndex !== null) {
                const enemy = currentBattleState.enemies[targetIndex];
                const isCrit = (counterMap[card.mind] === enemy.mind);
                let dmg = card.value;
                if (isCrit) dmg = Math.floor(dmg * 1.5);
                
                // 預判扣血與數字
                showDamageNumber(targetIndex, dmg, isCrit);
                const el = document.querySelector(`.enemy-card[data-enemy-id="${targetIndex}"] .hp-fill`);
                if (el) {
                    const ratio = Math.max(0, (enemy.hp - dmg) / enemy.max_hp);
                    el.style.width = `${ratio * 100}%`;
                }
            } else if (card.target === 'aoe') {
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
        
        // 預扣 SP、隱藏該卡
        currentBattleState.sp -= card.cost;
        updateSPUI();
        selectedCardIndex = null;

        // 2. 背景發送請求
        try {
            const res = await fetchWithTimeout('/api/battle/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ card_index: cardIndex, target_index: targetIndex })
            });
            const data = await res.json();
            
            if (!data.ok) { 
                showAlert(data.error); 
                currentBattleState = rollbackState; // 失敗回滾
                renderBattle(); 
                return; 
            }
            
            // 3. 後端權威數據歸來，靜默校準畫面
            currentBattleState = data.state;
            renderBattle(); 
            
            const filteredEvents = data.events.filter(ev =>
                ev.type !== 'damage' && ev.type !== 'heal' && ev.type !== 'shield'
            );
            playEvents(filteredEvents);
            
            if (currentBattleState.battle_over) {
                setTimeout(() => finishBattle(currentBattleState.victory), 700);
            }
        } catch (e) { 
            showAlert('出牌失敗：' + e.message); 
            currentBattleState = rollbackState; 
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
        
        const rollbackState = JSON.parse(JSON.stringify(currentBattleState)); 

        try {
            const res = await fetchWithTimeout('/api/battle/end-turn', { method: 'POST' });
            const data = await res.json();
            if (!data.ok) { 
                showAlert(data.error); 
                currentBattleState = rollbackState; 
                renderBattle();
                return; 
            }
            selectedCardIndex = null; 
            currentBattleState = data.state;
            renderBattle(); 
            playEvents(data.events);
            if (currentBattleState.battle_over) setTimeout(() => finishBattle(currentBattleState.victory), 700);
        } catch (e) { 
            showAlert('結束回合失敗：' + e.message); 
            currentBattleState = rollbackState; 
            renderBattle();
        } finally { 
            isBusy = false; 
            if (currentBattleState && !currentBattleState.battle_over) {
                const btn = document.getElementById('endTurnBtn');
                if (btn) { btn.textContent = "結束回合"; btn.disabled = false; }
            }
        }
    }

    // 其他輔助動畫函數 (保留原本)
    function playEvents(events) {
        if (!events || !events.length) return;
        events.forEach(ev => {
            if (ev.type === 'damage') showDamageNumber(ev.target, ev.value, ev.is_crit);
            else if (ev.type === 'heal') showHealFloat(ev.target, ev.value);
            else if (ev.type === 'shield') showShieldFloat(ev.target, ev.value);
            else if (ev.type === 'sp_gain') showSPFloat(ev.value);
            else if (ev.type === 'enemy_attack') showPlayerDamage(ev.target, ev.value);
            else if (ev.type === 'log') { if (ev.msg) console.log("戰鬥提示:", ev.msg); }
        });
    }

    function showPlayerDamage(partyIndex, damage) {
        const el = document.querySelector(`.player-status[data-party-index="${partyIndex}"]`);
        if (!el) return;
        SFX.playerHurt();
        el.style.animation = 'shake 0.3s';
        setTimeout(() => { el.style.animation = ''; }, 300);
        const floatText = document.createElement('div');
        floatText.style.cssText = `position: absolute; top: -10px; left: 50%; transform: translateX(-50%); color: #ff4d4d; font-size: 20px; font-weight: 900; text-shadow: 0 0 8px #ff0000; pointer-events: none; animation: floatUp 0.9s ease-out forwards; z-index: 100;`;
        floatText.textContent = `-${damage}`;
        el.style.position = 'relative';
        el.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    function showDamageNumber(enemyId, damage, isCrit) {
        const el = document.querySelector(`.enemy-card[data-enemy-id="${enemyId}"]`);
        if (!el) return;
        SFX.hit(isCrit);
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
        SFX.heal();
        const floatText = document.createElement('div');
        floatText.style.cssText = `position: absolute; top: -10px; left: 50%; transform: translateX(-50%); color: #4ade80; font-size: 18px; font-weight: 900; text-shadow: 0 0 8px #4ade80; pointer-events: none; animation: floatUp 0.9s ease-out forwards;`;
        floatText.textContent = `+${value}`;
        el.style.position = 'relative';
        el.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    function showShieldFloat(partyIndex, value) {
        const el = document.querySelector(`.player-status[data-party-index="${partyIndex}"]`);
        if (!el || value <= 0) return;
        SFX.shield();
        const floatText = document.createElement('div');
        floatText.style.cssText = `position: absolute; top: -10px; left: 50%; transform: translateX(-50%); color: #00e5ff; font-size: 16px; font-weight: 900; text-shadow: 0 0 8px #00e5ff; pointer-events: none; animation: floatUp 0.9s ease-out forwards;`;
        floatText.textContent = `🛡️+${value}`;
        el.style.position = 'relative';
        el.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    function showSPFloat(value) {
        const spEl = document.getElementById('spValue');
        if (!spEl) return;
        SFX.spGain();
        const wrap = spEl.parentElement;
        if (!wrap) return;
        wrap.style.position = 'relative';
        const floatText = document.createElement('div');
        floatText.style.cssText = `position: absolute; top: -20px; left: 50%; transform: translateX(-50%); color: #00e5ff; font-size: 16px; font-weight: 900; text-shadow: 0 0 10px #00e5ff; pointer-events: none; animation: floatUp 0.9s ease-out forwards;`;
        floatText.textContent = `+${value} SP`;
        wrap.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    // 戰鬥結算
    async function finishBattle(victory) {
        // 音效
        if (victory) SFX.victory();
        else SFX.defeat();

        // 失敗：直接回歸到選關頁（週常或普通）
        if (!victory) {
            await showAlert("戰鬥失敗，全員陣亡...");
            document.getElementById('battleContainer').style.display = 'none';
            if (currentBattleIsWeekly) {
                document.getElementById('weeklyStep2')?.classList.remove('active');
                document.getElementById('weeklyStep1')?.classList.add('active');
                loadWeeklyPanel();
            } else {
                document.getElementById('battleStep1').classList.add('active');
            }
            currentBattleState = null;
            currentBattleIsWeekly = false;
            return;
        }

        try {
            const res = await fetchWithTimeout('/api/battle/claim-reward', { method: 'POST' });
            const data = await res.json();

            if (data.ok) {
                if (data.is_weekly) {
                    await showAlert(`週常通關！使用 ${data.turns} 回合，評分 ${data.grade}！（最佳 ${data.best_grade} · ${data.best_turns} 回合）獲得 ${data.exp_gain} EXP。`);
                } else if (data.is_first_clear) {
                    await showAlert(`首通獎勵！獲得 ${data.reward} 柚幣與 ${data.exp_gain} EXP！`);
                    if (!clearedStages.includes(currentSelectedStageId)) clearedStages.push(currentSelectedStageId);

                    // 🌟 新手引導：打完教學關卡後引導抽卡
                    if (currentSelectedStageId === 'senren-1' && tutorialStep === 1) {
                        tutorialStep = 99;
                        delete playerData.cards["朝武芳乃"];
                        delete playerData.cards["叢雨"];
                        delete playerData.cards["常陸茉子"];

                        try {
                            const d = await fetchWithTimeout('/api/auth/me').then(r => r.json());
                            if (d.logged_in) playerData = d.player;
                        } catch (_) {}

                        document.getElementById('battleContainer').style.display = 'none';
                        document.querySelectorAll('.view-panel').forEach(p => {
                            p.classList.remove('active');
                            p.style.display = 'none';
                        });
                        const lobby = document.getElementById('lobbyView');
                        lobby.classList.add('active');
                        lobby.style.display = 'flex';

                        showTutorial(
                            "幻境引路人",
                            "太棒了！你已經掌握了戰鬥與屬性克制的精髓。但僅靠借用的幻影是無法長久作戰的，去【幻境卡池】邂逅屬於你自己的真正夥伴吧！",
                            "前往卡池",
                            () => {
                                document.querySelector('.lobby-card-btn[data-target="gacha"]').click();
                            }
                        );
                        currentBattleState = null;
                        currentBattleIsWeekly = false;
                        return;
                    }
                } else {
                    await showAlert(`戰鬥勝利！獲得 ${data.exp_gain} EXP。`);
                }

                fetchWithTimeout('/api/auth/me').then(r => r.json()).then(d => {
                    if (d.logged_in) { updateCoinsUI(d.player.coins); updateExpUI(d.player.stats?.exp || 0); }
                });

                if (!data.is_weekly) {
                    const activeTab = document.querySelector('.stage-tab.active');
                    if (activeTab) renderStageList(activeTab.dataset.game);
                } else {
                    loadWeeklyPanel();
                }
            } else {
                await showAlert(data.error);
            }
        } catch (e) {
            await showAlert("結算失敗： " + e.message);
        }

        document.getElementById('battleContainer').style.display = 'none';
        // 週常打完 → 回週常列表；普通關卡打完 → 回選關頁
        if (currentBattleIsWeekly) {
            document.getElementById('weeklyStep2')?.classList.remove('active');
            document.getElementById('weeklyStep1')?.classList.add('active');
        } else {
            document.getElementById('battleStep1').classList.add('active');
        }
        currentBattleState = null;
        currentBattleIsWeekly = false;
    }

    // =========================================================
    // 角色圖鑑與升級 (保留)
    // =========================================================
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
                SFX.upgrade();
                playerData.cards[currentUpgradeChar].level = data.level;
                updateExpUI(data.exp);
                upgradeSlider.value = data.level;
                document.getElementById('upgradeCurrentLvl').textContent = data.level;
                updateUpgradeCostUI(data.level, data.level);
                renderRoster();
                loadPartySelection(true); 
            } else { showAlert(data.error); }
        } catch (e) { showAlert("操作失敗：" + e.message); } finally { doUpgradeBtn.textContent = '確認變更'; }
    });

    toAwakenBtn?.addEventListener('click', () => {
        upgradeModal.classList.remove('show');
        if (currentUpgradeChar) openAwakenModal(currentUpgradeChar);
    });

    closeAwakenBtn?.addEventListener('click', () => awakenModal.classList.remove('show'));
    
    doAwakenBtn?.addEventListener('click', async () => {
        if (!currentAwakenChar) return;
        doAwakenBtn.disabled = true;
        doAwakenBtn.textContent = '處理中...';
        try {
            const res = await fetchWithTimeout(`/api/awaken/${encodeURIComponent(currentAwakenChar)}`, { method: 'POST' });
            const data = await res.json();
            if (!data.ok) showAlert(data.error);
            else {
                SFX.upgrade();
                playerData.cards[currentAwakenChar].awaken = data.awaken;
                playerData.cards[currentAwakenChar].shards = data.shards;
                await openAwakenModal(currentAwakenChar);
                renderRoster();
            }
        } catch (e) { showAlert('覺醒失敗: ' + e.message); } finally { doAwakenBtn.disabled = false; }
    });

    async function openAwakenModal(charName) {
        currentAwakenChar = charName;
        try {
            const res = await fetchWithTimeout(`/api/awaken/${encodeURIComponent(charName)}`);
            const data = await res.json();
            if (!data.ok) return showAlert(data.error);
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
        } catch (e) { showAlert('載入覺醒資訊失敗: ' + e.message); }
    }

    // =========================================================
    // 抽卡 (保留)
    // =========================================================
    const openWishlistBtn = document.getElementById('openWishlistBtn');
    const wishlistModal = document.getElementById('wishlistModal');
    const closeWishlistBtn = document.getElementById('closeWishlistBtn');
    const saveWishlistBtn = document.getElementById('saveWishlistBtn');
    const wishlistGrid = document.getElementById('wishlistGrid');

    openWishlistBtn?.addEventListener('click', () => {
        if (Object.keys(allCharacters).length === 0) return showAlert('正在載入角色數據，請稍候...');
        renderWishlistGrid();
        wishlistModal.classList.add('show');
    });

    closeWishlistBtn?.addEventListener('click', () => wishlistModal.classList.remove('show'));

    saveWishlistBtn?.addEventListener('click', () => {
        const selected = Array.from(wishlistGrid.querySelectorAll('.wish-item.selected')).map(el => el.dataset.name);
        if (selected.length > 1) return showAlert('心願單只能選擇 1 個角色！');
        saveWishlistBtn.disabled = true;
        saveWishlistBtn.textContent = '儲存中...';
        fetchWithTimeout('/api/gacha/wishlist', {
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
                showAlert(data.error);
            }
        })
        .finally(() => {
            saveWishlistBtn.disabled = false;
            saveWishlistBtn.textContent = '儲存';
        });
    });

    document.getElementById('closeResultBtn')?.addEventListener('click', (e) => {
        if (e.target.disabled) return;
        document.getElementById('gachaResultModal').classList.remove('show');
    });

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
                    if (wishlistGrid.querySelectorAll('.wish-item.selected').length >= 1) return showAlert('心願單只能選擇 1 個角色！');
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
            if (!data.ok) return showAlert(data.error);
            
            updateCoinsUI(data.coins);
            pityCount.textContent = data.pity;
            const pBar = document.getElementById('pityBarFill');
            if (pBar) pBar.style.width = Math.min(100, (data.pity / 80) * 100) + '%';
            
            const meRes = await fetchWithTimeout('/api/auth/me');
            const meData = await meRes.json();
            if (meData.logged_in) {
                playerData = meData.player;
                updateCoinsUI(playerData.coins);
            }
            
            // 🌟 判斷本次抽卡是否包含 SSR
            const hasSSR = data.results.some(c => c.rarity === 'SSR');
            
            playGachaCinematic(() => {
                showGachaResults(data.results);
            }, hasSSR);
            
        } catch (e) { 
            showAlert('抽卡失敗：' + e.message); 
        } finally { 
            updateDrawButtons(); 
        }
    }

    // 🌟 全螢幕過場動畫（加入 SSR 判定）
    function playGachaCinematic(callback, hasSSR = false) {
        const cine = document.createElement('div');
        cine.className = 'gacha-cinematic';
        
        // 如果有 SSR，掛上專屬 Class
        if (hasSSR) {
            cine.classList.add('has-ssr');
            if (window.SFX) SFX.ultimate(); // 播放宏大音效
        } else {
            if (window.SFX) SFX.click(); // 普通轉場音效
        }

        cine.innerHTML = `
            <div class="cinematic-circle"></div>
            <div class="cinematic-flash"></div>
        `;
        document.body.appendChild(cine);

        // 動畫時長：SSR 稍微長一點，讓玩家屏息以待
        const duration = hasSSR ? 2200 : 1800;

        setTimeout(() => {
            cine.style.opacity = '0';
            setTimeout(() => {
                cine.remove();
                callback(); 
            }, 600); 
        }, duration); 
    }

    function showGachaResults(results) {
        const container = document.getElementById('gachaCards');
        const modal = document.getElementById('gachaResultModal');
        const flipAllBtn = document.getElementById('flipAllBtn');
        const closeBtn = document.getElementById('closeResultBtn');
        
        container.innerHTML = '';
        container.className = 'gacha-cards-container animate-entry'; // 加入飛入動畫 Class
        
        if (results.length === 1) {
            container.classList.add('single-pull');
        } else {
            container.classList.add('ten-pull');
        }
        
        modal.classList.add('show');
        
        let flippedCount = 0;
        const total = results.length;
        
        closeBtn.disabled = true;
        closeBtn.style.opacity = '0.4';
        closeBtn.style.cursor = 'not-allowed';

        if (total > 1) {
            flipAllBtn.style.display = 'inline-block';
            flipAllBtn.disabled = false;
        } else {
            flipAllBtn.style.display = 'none';
        }

        const flipCard = (cardEl, rarity) => {
            if (cardEl.classList.contains('flipped')) return;
            cardEl.classList.add('flipped');
            
            if (window.SFX) SFX.gachaReveal(rarity);

            if (rarity === 'SSR') {
                document.body.style.animation = 'screenShake 0.4s';
                setTimeout(() => document.body.style.animation = '', 400);
                const flash = document.createElement('div');
                flash.style.cssText = 'position:fixed; inset:0; background:white; z-index:99999; pointer-events:none; opacity:0; transition:opacity 0.1s;';
                document.body.appendChild(flash);
                requestAnimationFrame(() => {
                    flash.style.opacity = '0.8';
                    setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 300); }, 100);
                });
            }
            
            flippedCount++;
            if (flippedCount === total) {
                closeBtn.disabled = false;
                closeBtn.style.opacity = '1';
                closeBtn.style.cursor = 'pointer';
                flipAllBtn.style.display = 'none';
            }
        };

        results.forEach((card, idx) => {
            const info = allCharacters[card.name] || { code: 'game', index: 1 };
            
            let tagHtml = `<div class="card-tag">+${card.shards} 碎片</div>`;
            if (card.is_new) tagHtml = `<div class="card-tag new">NEW 解鎖</div>`;
            else if (card.refund > 0) tagHtml = `<div class="card-tag gold">滿覺返還 +${card.refund}幣</div>`;

            const div = document.createElement('div');
            div.className = `flip-card ${card.rarity}`;
            
            // SSR 的卡牌飛入時，給予稍微長一點的彈性延遲，並且加重落地感
            if (card.rarity === 'SSR') {
                div.style.animationDelay = `${idx * 0.08}s`;
                div.style.animationDuration = '0.8s'; 
            } else {
                div.style.animationDelay = `${idx * 0.08}s`; 
            }
            
            div.innerHTML = `
                <div class="flip-card-inner">
                    <div class="flip-card-front"></div>
                    <div class="flip-card-back">
                        <img src="/static/picture/char-${info.code}-${info.index}.png" data-fallback="/static/picture/thumb-${info.code}-${info.index}.png">
                        <div class="card-info">
                            <div class="card-name">${card.name}</div>
                            ${tagHtml}
                        </div>
                    </div>
                </div>
            `;
            
            div.addEventListener('click', () => flipCard(div, card.rarity));
            container.appendChild(div);
        });
        
        flipAllBtn.onclick = () => {
            flipAllBtn.disabled = true;
            const unflippedCards = container.querySelectorAll('.flip-card:not(.flipped)');
            unflippedCards.forEach((c, i) => {
                setTimeout(() => {
                    const rarity = c.classList.contains('SSR') ? 'SSR' : (c.classList.contains('SR') ? 'SR' : 'R');
                    flipCard(c, rarity);
                }, i * 150);
            });
        };
    }

    // =========================================================
    // 每日任務 (保留)
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

        const tiersContainer = document.querySelector('.daily-tiers');
        const tiers = [20, 40, 60, 80, 100];
        
        tiersContainer.innerHTML = '';
        tiers.forEach(t => {
            const reached = points >= t;
            const claimed = dailyData.claimed.includes(t);
            const div = document.createElement('div');
            div.className = 'tier';
            if (claimed) div.classList.add('claimed');
            else if (reached) div.classList.add('claimable', 'reached');
            
            div.innerHTML = `<div class="tier-dot"></div><span>${t}點</span>`;
            
            if (reached && !claimed) {
                div.style.cursor = 'pointer';
                div.addEventListener('click', () => claimDailyTier(t));
            }
            tiersContainer.appendChild(div);
        });

        dailyTaskList.innerHTML = '';
        for (const [key, config] of Object.entries(dailyData.config)) {
            const progress = dailyData.tasks[key] || 0;
            const isCompleted = progress >= config.target;
            
            const div = document.createElement('div');
            div.className = `daily-task-item ${isCompleted ? 'completed' : ''}`;
            
            let statusText = isCompleted ? '已達成' : `${progress}/${config.target}`;
            
            div.innerHTML = `
                <div class="task-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
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
                SFX.reward();
                showAlert(`領取成功！獲得 ${data.reward} 柚幣`);
                loadDailyTasks();
                fetchWithTimeout('/api/auth/me').then(r => r.json()).then(d => {
                    if (d.logged_in) updateCoinsUI(d.player.coins);
                });
            } else { showAlert(data.error); }
        } catch (e) { showAlert("領取失敗：" + e.message); }
    }

    // =========================================================
    // 星隕迴廊 (保留)
    // =========================================================
    async function loadWeeklyPanel() {
        try {
            const res = await fetchWithTimeout('/api/weekly');
            const data = await res.json();
            if (!data.ok) return;
            weeklyData = data;
            renderWeeklyStages();
            if (currentPartyData.length === 0) {
                const pRes = await fetchWithTimeout('/api/battle/party');
                const pData = await pRes.json();
                if (pData.ok) currentPartyData = pData.characters;
            }
            renderPartySelection(currentPartyData, 'weeklyPartyGrid');
        } catch (e) { console.error('載入週常失敗', e); }
    }

    function renderWeeklyStages() {
        const list = document.getElementById('weeklyStageList');
        if (!list || !weeklyData) return;
        list.innerHTML = '';
        
        weeklyData.stages.forEach((stage, index) => {
            let isLocked = false;
            if (index > 0) {
                const prevStage = weeklyData.stages[index - 1];
                if (!prevStage.best_grade) isLocked = true;
            }
            if (isTester) isLocked = false;

            const div = document.createElement('div');
            div.className = `weekly-stage-item ${isLocked ? 'locked' : ''}`;
            const best = stage.best_grade;
            const bestInfo = best ? `最佳：${best} · ${stage.best_turns} 回合` : '尚未通關';
            const rule = stage.grades_rule;

            let gradesHtml = '';
            ['S', 'A', 'B'].forEach(g => {
                const reached = best && ({'B':1,'A':2,'S':3})[best] >= ({'B':1,'A':2,'S':3})[g];
                const claimed = (stage.claimed || []).includes(g);
                const btnLabel = claimed ? '已領取' : (reached ? '領取' : '未達成');
                const btnDisabled = claimed || !reached || isLocked;
                gradesHtml += `
                    <div class="weekly-grade ${reached ? 'reached' : ''} ${claimed ? 'claimed' : ''}">
                        <span class="weekly-grade-label">${g}</span>
                        <span class="weekly-grade-turn">≤ ${g === 'S' ? rule.S : (g === 'A' ? rule.A : '通關')} 回合</span>
                        <span class="weekly-grade-reward">${stage.reward_per_grade} 柚幣</span>
                        <button class="btn-weekly-claim" data-stage="${stage.stage_id}" data-grade="${g}" ${btnDisabled ? 'disabled' : ''}>${btnLabel}</button>
                    </div>
                `;
            });

            let challengeBtnText = isLocked ? '🔒 未解鎖' : '挑戰';
            
            div.innerHTML = `
                <div class="weekly-stage-header">
                    <div>
                        <div class="weekly-stage-name">${stage.name} ${isLocked ? '🔒' : ''}</div>
                        <div class="weekly-stage-meta">${bestInfo}</div>
                    </div>
                    <button class="btn-primary btn-weekly-challenge" data-stage="${stage.stage_id}" ${isLocked ? 'disabled' : ''}>${challengeBtnText}</button>
                </div>
                <div class="weekly-grades">${gradesHtml}</div>
            `;
            list.appendChild(div);
        });

        list.querySelectorAll('.btn-weekly-challenge').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                currentWeeklyStageId = btn.dataset.stage;
                const stageObj = weeklyData.stages.find(s => s.stage_id === currentWeeklyStageId);
                document.getElementById('weeklyStageNameText').textContent = stageObj ? stageObj.name : currentWeeklyStageId;
                document.getElementById('weeklyStep1').classList.remove('active');
                document.getElementById('weeklyStep2').classList.add('active');
                renderPartySelection(currentPartyData, 'weeklyPartyGrid');
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
                        SFX.reward();
                        showAlert(`領取成功！獲得 ${data.reward} 柚幣`);
                        fetchWithTimeout('/api/auth/me').then(r => r.json()).then(d => {
                            if (d.logged_in) updateCoinsUI(d.player.coins);
                        });
                        loadWeeklyPanel();
                    } else {
                        showAlert(data.error || '領取失敗');
                        btn.disabled = false;
                    }
                } catch (e) { showAlert('領取失敗：' + e.message); btn.disabled = false; }
            });
        });
    }

    document.getElementById('weeklyEnterBtn')?.addEventListener('click', async () => {
        if (selectedParty.length === 0) return showAlert('請先選擇至少 1 名出戰角色！');
        if (!currentWeeklyStageId) return showAlert('請先選擇一個關卡！');
        
        const btn = document.getElementById('weeklyEnterBtn');
        if (btn) { btn.disabled = true; btn.textContent = '連線中...'; }

        currentBattleIsWeekly = true;
        currentSelectedStageId = currentWeeklyStageId;

        try {
            const res = await fetchWithTimeout('/api/battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage_id: currentWeeklyStageId, party: selectedParty })
            });
            const data = await res.json();
            if (!data.ok) {
                showAlert(data.error || "進入戰鬥失敗");
                currentBattleIsWeekly = false;
                if (btn) { btn.disabled = false; btn.textContent = '進入迴廊'; }
                return;
            }

            document.querySelectorAll('.view-panel').forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });
            
            const battleView = document.getElementById('battleView');
            battleView.classList.add('active');
            battleView.style.display = 'flex';
            document.getElementById('battleStep1')?.classList.remove('active');
            document.getElementById('battleStep2')?.classList.remove('active');
            
            currentBattleState = data.state;
            if (data.story) showStoryModal(data.story, startActualBattle);
            else startActualBattle();
            
        } catch (e) {
            showAlert(`進入戰鬥失敗: ${e.message}`);
            currentBattleIsWeekly = false;
            if (btn) { btn.disabled = false; btn.textContent = '進入迴廊'; }
        }
    });

    // =========================================================
    // 新手引導系統
    // =========================================================
    let tutorialStep = 0;

    function checkTutorial() {
        const hasCleared = playerData?.stats?.cleared_stages?.length > 0;
        if (hasCleared) { tutorialStep = 99; return; }
        const hasCards = Object.keys(playerData?.cards || {}).length > 0;
        if (hasCards) { tutorialStep = 99; return; }

        tutorialStep = 0;
        playerData.cards["朝武芳乃"] = { awaken: 0, level: 10 };
        playerData.cards["叢雨"] = { awaken: 0, level: 10 };
        playerData.cards["常陸茉子"] = { awaken: 0, level: 10 };
        
        showTutorial(
            "幻境引路人",
            "歡迎來到幻境樞紐。深淵的裂縫正在蔓延，需要你這樣的力量來平息混亂。不過在此之前，先讓幾位前輩來測試一下你的潛力吧！",
            "接受試煉",
            () => {
                showTutorial(
                    "幻境引路人",
                    "【戰鬥基礎】戰鬥中，打出卡牌需要消耗 <b style='color:#00e5ff'>SP（能量）</b>。每回合結束時，SP 會自動恢復 3 點。",
                    "下一頁",
                    () => {
                        showTutorial(
                            "幻境引路人",
                            "【屬性克制】每個角色和敵人都有『心相』。記住這個口訣：<b style='color:#ffd700'>凜→戲→羞→靜→陽→和→凜</b>。用克制的心相攻擊，傷害會大幅提升！",
                            "開始實戰",
                            () => {
                                hideTutorial();
                                startTutorialBattle();
                            }
                        );
                    }
                );
            }
        );
    }

    function showTutorial(title, text, btnText, onNext) {
        tutorialTitle.textContent = title;
        tutorialText.innerHTML = text;
        tutorialNextBtn.textContent = btnText;
        tutorialModal.classList.add('show');
        tutorialNextBtn.onclick = null;
        tutorialNextBtn.onclick = () => {
            hideTutorial();
            if (onNext) onNext();
        };
    }

    function hideTutorial() {
        tutorialModal.classList.remove('show');
    }

    tutorialSkipBtn?.addEventListener('click', async () => {
        const isConfirmed = await showConfirm('確定要跳過新手引導嗎？這會幫助你快速上手。', '跳過引導');
        if (isConfirmed) {
            hideTutorial();
            tutorialStep = 99;
            if (playerData && playerData.cards) {
                delete playerData.cards["朝武芳乃"];
                delete playerData.cards["叢雨"];
                delete playerData.cards["常陸茉子"];
            }
        }
    });

    async function startTutorialBattle() {
        currentSelectedStageId = "senren-1";
        selectedParty = ["朝武芳乃", "叢雨", "常陸茉子"];
        tutorialStep = 1;
        
        document.querySelectorAll('.view-panel').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });
        const battleView = document.getElementById('battleView');
        battleView.classList.add('active');
        battleView.style.display = 'flex';
        document.getElementById('battleStep1')?.classList.remove('active');
        document.getElementById('battleStep2')?.classList.remove('active');
        
        try {
            const res = await fetchWithTimeout('/api/battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage_id: currentSelectedStageId, party: selectedParty })
            });
            const data = await res.json();
            
            if (!data.ok) {
                showAlert(data.error || "進入戰鬥失敗");
                battleView.classList.remove('active');
                document.getElementById('lobbyView').classList.add('active');
                return;
            }
            
            currentBattleIsWeekly = false;
            currentBattleState = data.state;
            
            if (data.story) showStoryModal(data.story, startActualBattle);
            else startActualBattle();
            
        } catch (e) { 
            showAlert(`進入戰鬥失敗: ${e.message}`); 
            battleView.classList.remove('active');
            document.getElementById('lobbyView').classList.add('active');
        }
    }

    // =========================================================
    // 帳號設置邏輯
    // =========================================================
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    
    settingsBtn?.addEventListener('click', () => {
        SFX.click();
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        settingsModal.classList.add('show');
    });
    
    closeSettingsBtn?.addEventListener('click', () => settingsModal.classList.remove('show'));

    // 修改密碼
    document.getElementById('doChangePwBtn')?.addEventListener('click', async () => {
        const oldPw = document.getElementById('oldPassword').value;
        const newPw = document.getElementById('newPassword').value;
        const confPw = document.getElementById('confirmPassword').value;
        
        if (!oldPw || !newPw) return showAlert('請填寫完整密碼資訊');
        if (newPw !== confPw) return showAlert('兩次輸入的新密碼不一致');
        if (newPw.length < 6) return showAlert('新密碼長度至少為 6 位');
        
        const btn = document.getElementById('doChangePwBtn');
        btn.disabled = true; btn.textContent = '處理中...';
        
        try {
            const res = await fetchWithTimeout('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_password: oldPw, new_password: newPw })
            });
            const data = await res.json();
            if (data.ok) {
                SFX.upgrade();
                showAlert('密碼修改成功！請重新登入。');
                settingsModal.classList.remove('show');
                setTimeout(() => {
                    fetchWithTimeout('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
                }, 1500);
            } else {
                SFX.deny();
                showAlert(data.error || '修改失敗');
            }
        } catch (e) {
            showAlert('網路錯誤：' + e.message);
        } finally {
            btn.disabled = false; btn.textContent = '確認修改';
        }
    });

    // 刪除帳號
    document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
        const isConfirmed = await showConfirm(
            '<span style="color:var(--red-bright);font-weight:bold;">警告：</span>刪除後所有進度將無法恢復！<br><br>請輸入您的密碼以確認刪除：<br><br><input type="password" id="deletePwInput" class="settings-input" style="text-align:center;">', 
            '確認刪除帳號'
        );
        
        if (!isConfirmed) return;
        
        const password = document.getElementById('deletePwInput').value;
        if (!password) return showAlert('請輸入密碼');
        
        try {
            const res = await fetchWithTimeout('/api/auth/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            
            if (data.ok) {
                SFX.defeat();
                showAlert('帳號已成功刪除，再見。');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                SFX.deny();
                showAlert(data.error || '刪除失敗');
            }
        } catch (e) {
            showAlert('網路錯誤：' + e.message);
        }
    });

    // 綁定按鈕
    document.getElementById('endTurnBtn')?.addEventListener('click', () => {
        SFX.click();
        doEndTurn();
    });
    document.getElementById('enterStageBtn')?.addEventListener('click', () => {
        SFX.click();
        enterBattle();
    });
});