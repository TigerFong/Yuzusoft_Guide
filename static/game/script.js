// 文件：static/game/script.js
let currentMode = 'login'; // 'login' 或 'register'

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

    // 1. 檢查登入狀態
    fetch('/api/auth/me')
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 200 && data.logged_in) {
                showGame(data);
            } else {
                showLogin();
            }
        })
        .catch(() => showLogin());

    // 2. 切換 Tab
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

    // 3. 提交表單
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
        .then(data => {
            // 登入/註冊成功，重新拉取數據
            return fetch('/api/auth/me');
        })
        .then(res => res.json())
        .then(data => {
            if (data.logged_in) {
                showGame(data);
            }
        })
        .catch(err => {
            errorDiv.textContent = err.message;
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = currentMode === 'login' ? '進 入 幻 境' : '創 建 帳 號';
        });
    });

    // 4. 登出
    logoutBtn.addEventListener('click', () => {
        fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
                window.location.reload();
            });
    });

    // UI 輔助函數
    function showGame(data) {
        userNameDisplay.textContent = data.username;
        userCoinsDisplay.textContent = data.player.coins;
        
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.style.display = 'none';
            gameContainer.style.display = 'flex';
        }, 400);
    }

    function showLogin() {
        gameContainer.style.display = 'none';
        loginOverlay.style.display = 'flex';
        loginOverlay.style.opacity = '1';
    }
});