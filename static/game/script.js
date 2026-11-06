// 文件：static/game/script.js
let currentMode = 'login';
let allCharacters = {}; // 儲存所有角色 { name, game, code, index, rarity }
let playerData = null;
let currentWishlist = [];
let currentAwakenChar = null;
let currentBattleData = null;
let currentSP = 3;
let currentEnemies = [];
let currentHand = [];
let selectedCardIndex = null;
let playerParty = []; // 我方隊伍狀態
let isEnemyTurn = false; // 防止連點

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素 ---
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
    
    // 視圖切換與覺醒元素
    const gachaView = document.getElementById('gachaView');
    const rosterView = document.getElementById('rosterView');
    const battleView = document.getElementById('battleView');
    const navTabs = document.querySelectorAll('.nav-tab');
    const rosterGrid = document.getElementById('rosterGrid');
    const awakenModal = document.getElementById('awakenModal');
    const closeAwakenBtn = document.getElementById('closeAwakenBtn');
    const doAwakenBtn = document.getElementById('doAwakenBtn');
    const awakenLvlEls = [
        document.getElementById('awakenLvl1'),
        document.getElementById('awakenLvl2'),
        document.getElementById('awakenLvl3')
    ];

    // --- 初始化檢查登入狀態 ---
    fetch('/api/auth/me')
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 200 && data.logged_in) {
                initGame(data);
            } else {
                showLogin();
            }
        })
        .catch(() => showLogin());

    // --- 登入/註冊表單 ---
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

    // --- 頁籤切換 ---
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
            } else {
                rosterView.classList.add('active');
                renderRoster();
            }
        });
    });

    document.getElementById('enterStageBtn')?.addEventListener('click', () => {
        enterBattle('senren-1');
    });

    // --- 抽卡相關 ---
    draw1Btn.addEventListener('click', () => handleDraw(1));
    draw10Btn.addEventListener('click', () => handleDraw(10));

    // --- 心願單 ---
    const openWishlistBtn = document.getElementById('openWishlistBtn');
    const wishlistModal = document.getElementById('wishlistModal');
    const closeWishlistBtn = document.getElementById('closeWishlistBtn');
    const saveWishlistBtn = document.getElementById('saveWishlistBtn');
    const wishlistGrid = document.getElementById('wishlistGrid');
    
    openWishlistBtn.addEventListener('click', () => {
        if (Object.keys(allCharacters).length === 0) {
            alert('正在載入角色數據，請稍候...');
            return;
        }
        renderWishlistGrid();
        wishlistModal.classList.add('show');
    });
    
    closeWishlistBtn.addEventListener('click', () => wishlistModal.classList.remove('show'));

    saveWishlistBtn.addEventListener('click', () => {
        const selected = Array.from(wishlistGrid.querySelectorAll('.wish-item.selected')).map(el => el.dataset.name);
        if (selected.length > 1) { // 改為 1
            alert('心願單只能選擇 1 個角色！');
            return;
        }
        
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

    // --- 抽卡結果彈窗 ---
    const resultModal = document.getElementById('gachaResultModal');
    document.getElementById('closeResultBtn').addEventListener('click', () => {
        resultModal.classList.remove('show');
    });

    // --- 覺醒彈窗關閉 ---
    closeAwakenBtn.addEventListener('click', () => awakenModal.classList.remove('show'));

    // --- 執行覺醒 ---
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
                // 更新本地數據並重繪
                playerData.cards[currentAwakenChar].awaken = data.awaken;
                playerData.cards[currentAwakenChar].shards = data.shards;
                
                await openAwakenModal(currentAwakenChar); // 刷新彈窗內容
                renderRoster(); // 刷新圖鑑
            }
        } catch (e) {
            alert('覺醒失敗');
        } finally {
            doAwakenBtn.disabled = false;
        }
    });

    // --- 核心邏輯函數 ---
    async function initGame(data) {
        playerData = data.player;
        userNameDisplay.textContent = data.username;
        updateCoinsUI(playerData.coins);
        pityCount.textContent = playerData.pity;
        currentWishlist = playerData.wishlist || [];
        
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.style.display = 'none';
            gameContainer.style.display = 'flex';
        }, 400);

        if (Object.keys(allCharacters).length === 0) {
            await fetchAllCharacters();
        }
        updateDrawButtons();
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
            
            // 手動補齊稀有度對照表 (從 game_data.py 同步)
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
        // 只篩選 SSR 角色
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
                    const currentSel = wishlistGrid.querySelectorAll('.wish-item.selected').length;
                    if (currentSel >= 1) { // 改為 1
                        alert('心願單只能選擇 1 個角色！');
                        return;
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
            
            if (!data.ok) {
                alert(data.error);
                return;
            }

            updateCoinsUI(data.coins);
            pityCount.textContent = data.pity;
            
            // 重要：抽卡後重新獲取用戶資料，以更新 playerData.cards
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
            const delay = idx * 0.15;
            
            const div = document.createElement('div');
            div.className = `card-item ${card.rarity}`;
            div.style.animationDelay = `${delay}s`;
            
            let tagHtml = `<div class="card-tag">+${card.shards} 碎片</div>`;
            if (card.is_new) {
                tagHtml = `<div class="card-tag new">NEW 解鎖</div>`;
            } else if (card.refund > 0) {
                tagHtml = `<div class="card-tag" style="color: #ffd700; font-weight: bold;">滿覺 返還+${card.refund}幣</div>`;
            }
            
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

    // --- 圖鑑與覺醒 ---
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
                    <div class="roster-awaken">覺醒 ${card.awaken} / 3</div>
                </div>
            `;
            div.addEventListener('click', () => openAwakenModal(name));
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
            document.getElementById('awakenImg').onerror = function() { this.src = `/static/picture/thumb-${info.code}-${info.index}.png`; };
            
            document.getElementById('awakenName').textContent = data.name;
            document.getElementById('awakenRarity').textContent = data.rarity;
            document.getElementById('awakenShards').textContent = data.shards;

            data.effects.forEach((desc, idx) => {
                const el = awakenLvlEls[idx];
                el.querySelector('.lvl-desc').textContent = desc;
                if (idx < data.awaken) {
                    el.classList.add('active');
                    el.querySelector('.lvl-title').innerHTML = `覺醒 ${['I','II','III'][idx]} <span class="lvl-cost" style="color:var(--gold-main)">已解鎖</span>`;
                } else {
                    el.classList.remove('active');
                }
            });

            if (data.awaken >= 3) {
                doAwakenBtn.textContent = '已滿級';
                doAwakenBtn.disabled = true;
            } else {
                const cost = data.awaken + 1;
                if (data.shards >= cost) {
                    doAwakenBtn.textContent = `消耗 ${cost} 碎片覺醒`;
                    doAwakenBtn.disabled = false;
                } else {
                    doAwakenBtn.textContent = `碎片不足 (需 ${cost})`;
                    doAwakenBtn.disabled = true;
                }
            }
            awakenModal.classList.add('show');
        } catch (e) {
            alert('載入覺醒資訊失敗');
        }
    }

    // 戰鬥核心邏輯
    async function enterBattle(stageId) {
        try {
            const res = await fetch(`/api/battle/${stageId}`);
            const data = await res.json();
            if (!data.ok) return alert(data.error);
            
            currentBattleData = data;
            document.getElementById('stageSelect').style.display = 'none';
            document.getElementById('battleContainer').style.display = 'flex';
            
            // 初始化敵人
            currentEnemies = data.enemies.map((e, i) => ({ 
                ...e, id: i, toughness: 3, max_toughness: 3, is_stunned: false 
            }));
            
            // 初始化我方隊伍 (初始HP 1000, EP 0)
            playerParty = data.party.map(p => ({
                ...p, hp: 1000, max_hp: 1000, ep: 0, max_ep: 100
            }));
            
            // 初始化狀態
            currentSP = 3;
            isEnemyTurn = false;
            updateSPUI();
            renderEnemies();
            renderPlayerParty();
            drawHand(5);
            
        } catch (e) {
            alert("進入戰鬥失敗");
        }
    }

    function renderEnemies() {
        const area = document.getElementById('enemyArea');
        area.innerHTML = '';
        currentEnemies.forEach((enemy, idx) => {
            if (enemy.hp <= 0) return;
            
            const el = document.createElement('div');
            el.className = `enemy-card ${enemy.is_stunned ? 'stunned' : ''}`;
            
            // 韌性條顯示
            let toughHtml = '<div class="toughness-bar">';
            for(let i=0; i<enemy.max_toughness; i++) {
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
                    <div class="hp-bar"><div class="hp-fill" style="width: ${(enemy.hp/enemy.max_hp)*100}%;"></div></div>
                    ${toughHtml}
                </div>
            `;
            el.addEventListener('click', () => {
                if (isEnemyTurn) return;
                if (selectedCardIndex !== null) {
                    playCard(selectedCardIndex, idx);
                } else {
                    alert("請先點擊下方手牌選擇一張卡牌！");
                }
            });
            area.appendChild(el);
        });
    }

    function renderPlayerParty() {
        const area = document.getElementById('playerParty');
        area.innerHTML = '';
        playerParty.forEach(p => {
            const info = allCharacters[p.name] || { code: 'game', index: 1 };
            const el = document.createElement('div');
            el.className = `player-status ${p.hp <= 0 ? 'dead' : ''}`;
            el.innerHTML = `
                <img src="/static/picture/thumb-${info.code}-${info.index}.png" class="party-thumb">
                <div class="party-info">
                    <div class="party-name">${p.name} (${p.role})</div>
                    <div class="mini-bar hp"><div style="width: ${(p.hp/p.max_hp)*100}%;"></div></div>
                    <div class="mini-bar ep"><div style="width: ${(p.ep/p.max_ep)*100}%;"></div></div>
                </div>
            `;
            area.appendChild(el);
        });
    }

    function drawHand(count) {
        currentHand = [];
        // 取存活的角色生成手牌
        const aliveChars = playerParty.filter(p => p.hp > 0);
        if (aliveChars.length === 0) return;
        
        for (let i = 0; i < count; i++) {
            const char = aliveChars[Math.floor(Math.random() * aliveChars.length)];
            const info = allCharacters[char.name] || { code: 'game', index: 1 };
            
            // 根據 EP 判斷是否刷出必殺卡
            const isUltimate = char.ep >= char.max_ep;
            
            if (isUltimate) {
                // 必殺卡：不耗 SP，消耗 100 EP
                currentHand.push({
                    name: char.name, title: "必殺技", cost: 0, 
                    mind: char.mind, desc: "對單體造成 300 點無視韌性傷害", 
                    code: info.code, index: info.index, type: "ultimate",
                    ownerIndex: playerParty.indexOf(char)
                });
                // 消耗 EP (避免重複刷出)
                char.ep = 0; 
            } else {
                // 普攻卡：消耗 1 SP
                currentHand.push({
                    name: char.name, title: "普通攻擊", cost: 1, 
                    mind: char.mind, desc: "對單體造成 100 點傷害，削減 1 段韌性", 
                    code: info.code, index: info.index, type: "normal",
                    ownerIndex: playerParty.indexOf(char)
                });
            }
        }
        renderHand();
        renderPlayerParty(); // 刷新 EP 條
    }

    function renderHand() {
        const area = document.getElementById('handArea');
        area.innerHTML = '';
        currentHand.forEach((card, idx) => {
            const el = document.createElement('div');
            el.className = `battle-card ${selectedCardIndex === idx ? 'selected' : ''} ${card.type === 'ultimate' ? 'ultimate' : ''}`;
            el.innerHTML = `
                <div class="card-cost">${card.cost}</div>
                <div class="card-mind mind-rin">${card.mind}</div>
                <div class="card-thumb" style="background-image: url('/static/picture/thumb-${card.code}-${card.index}.png');"></div>
                <div class="card-title">${card.name} - ${card.title}</div>
                <div class="card-desc">${card.desc}</div>
            `;
            el.addEventListener('click', () => {
                if (isEnemyTurn) return;
                if (currentSP >= card.cost) {
                    selectedCardIndex = idx;
                    renderHand();
                } else {
                    alert("SP 不足！");
                }
            });
            area.appendChild(el);
        });
    }

    function playCard(cardIndex, enemyIndex) {
        const card = currentHand[cardIndex];
        const enemy = currentEnemies[enemyIndex];
        const char = playerParty[card.ownerIndex];
        
        if (enemy.hp <= 0) return alert("該敵人已死亡");
        if (currentSP < card.cost) return;
        
        // 1. 扣除資源
        currentSP -= card.cost;
        if (card.type === 'ultimate') char.ep = 0; // 消耗 EP
        
        // 2. 計算傷害與心相克制
        let damage = card.type === 'ultimate' ? 300 : 100;
        const isCounter = checkMindCounter(card.mind, enemy.mind);
        if (isCounter) damage *= 1.5; // 克制傷害 +50%
        
        enemy.hp -= damage;
        if (enemy.hp < 0) enemy.hp = 0;
        
        // 3. 增加攻擊者 EP (非必殺卡才加)
        if (card.type !== 'ultimate') {
            char.ep = Math.min(char.max_ep, char.ep + 30);
        }
        
        // 4. 削減韌性
        if (enemy.hp > 0 && enemy.toughness > 0 && !enemy.is_stunned) {
            let toughCut = isCounter ? 2 : 1;
            enemy.toughness -= toughCut;
            if (enemy.toughness <= 0) {
                enemy.toughness = 0;
                enemy.is_stunned = true;
            }
        }
        
        // 5. 顯示特效與結算
        showDamageNumber(enemyIndex, Math.floor(damage), isCounter);
        currentHand.splice(cardIndex, 1);
        selectedCardIndex = null;
        
        updateSPUI();
        renderEnemies();
        renderPlayerParty();
        renderHand();
        
        checkBattleEnd();
    }

    function checkMindCounter(myMind, enemyMind) {
        const counterMap = {"凛":"戏", "戏":"羞", "羞":"静", "静":"阳", "阳":"和", "和":"凛"};
        return counterMap[myMind] === enemyMind;
    }

    function showDamageNumber(enemyIndex, damage, isCounter) {
        const enemyEl = document.getElementById('enemyArea').querySelectorAll('.enemy-card')[enemyIndex];
        if (!enemyEl) return;
        
        const floatText = document.createElement('div');
        floatText.className = `damage-float ${isCounter ? 'crit' : ''}`;
        floatText.textContent = `-${damage}`;
        if(isCounter) {
            const critLabel = document.createElement('div');
            critLabel.className = 'crit-label';
            critLabel.textContent = '克制!';
            floatText.appendChild(critLabel);
        }
        
        enemyEl.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);
    }

    function checkBattleEnd() {
        const alive = currentEnemies.filter(e => e.hp > 0);
        if (alive.length === 0) {
            setTimeout(() => finishBattle(true), 800);
        }
    }

    // ==========================================
    // 回合結束與敵人反擊
    // ==========================================
    document.getElementById('endTurnBtn')?.addEventListener('click', async () => {
        if (isEnemyTurn) return;
        const aliveEnemies = currentEnemies.filter(e => e.hp > 0);
        if (aliveEnemies.length === 0) return;
        
        isEnemyTurn = true;
        document.getElementById('endTurnBtn').textContent = "敵方行動中...";
        document.getElementById('endTurnBtn').disabled = true;

        // 敵人逐一反擊
        for (let enemy of aliveEnemies) {
            if (enemy.hp <= 0) continue;
            
            // 如果眩暈，跳過攻擊，解除眩暈並恢復韌性
            if (enemy.is_stunned) {
                enemy.is_stunned = false;
                enemy.toughness = enemy.max_toughness;
                renderEnemies();
                await new Promise(r => setTimeout(r, 600));
                continue;
            }

            // 隨機挑選存活的我方角色
            const aliveChars = playerParty.filter(p => p.hp > 0);
            if (aliveChars.length === 0) break;
            
            const target = aliveChars[Math.floor(Math.random() * aliveChars.length)];
            const dmg = 150; // 敵人基礎傷害
            
            target.hp -= dmg;
            if (target.hp < 0) target.hp = 0;
            
            // 顯示我方受傷 (簡單起見，直接更新頭像區)
            renderPlayerParty();
            
            // 受擊增加 EP
            target.ep = Math.min(target.max_ep, target.ep + 20);
            
            await new Promise(r => setTimeout(r, 600)); // 攻擊間隔
        }

        // 檢查我方是否全滅
        const aliveParty = playerParty.filter(p => p.hp > 0);
        if (aliveParty.length === 0) {
            setTimeout(() => finishBattle(false), 800);
            return;
        }

        // 進入新回合
        currentSP = Math.min(10, currentSP + 3);
        updateSPUI();
        drawHand(5); // 補充新手牌
        
        isEnemyTurn = false;
        const btn = document.getElementById('endTurnBtn');
        btn.textContent = "結束回合";
        btn.disabled = false;
    });

    async function finishBattle(isWin) {
        try {
            const res = await fetch('/api/battle/end', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ stage_id: "senren-1", is_win: isWin })
            });
            const data = await res.json();
            
            if (isWin) {
                alert(`戰鬥勝利！獲得 ${data.reward} 柚幣！`);
                fetch('/api/auth/me').then(r=>r.json()).then(d=>{
                    if(d.logged_in) updateCoinsUI(d.player.coins);
                });
            } else {
                alert("戰鬥失敗，全員陣亡...");
            }
            
            document.getElementById('stageSelect').style.display = 'block';
            document.getElementById('battleContainer').style.display = 'none';
        } catch(e) {
            alert("結算失敗");
        }
    }
});