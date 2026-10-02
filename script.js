// ==================== 導航 ====================
function openhomepage2(){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'block';
    document.getElementById('story').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('guide').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';
    document.body.style.backgroundImage = "url('picture/homepage2.jpg')";
}

window.onload = function() {
    document.getElementById("homepage2").style.display = "none";
    document.getElementById("story").style.display = "none";
    document.getElementById("character").style.display = "none";
    document.getElementById("choosepage").style.display = "none";
    document.getElementById('guide').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';
}

function gotolink(){
    window.open("https://hikarifield.co.jp/senren/");
}

function gotocharacter(){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'flex';
    document.getElementById('story').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';
    document.getElementById('guide').style.display = 'none';
    document.body.style.backgroundImage = "url('picture/background.jpg')";
}

function gotostory(){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('story').style.display = 'flex';
    document.getElementById('guidepage').style.display = 'none';
    document.getElementById('guide').style.display = 'none';
    document.body.style.backgroundImage = "url('picture/background.jpg')";
}

// ==================== API 快取 ====================
const characterCache = {};
const guideCache = {};

async function fetchCharacter(name) {
    if (characterCache[name] !== undefined) return characterCache[name];
    try {
        const res = await fetch(`/api/characters/${encodeURIComponent(name)}`);
        if (!res.ok) {
            characterCache[name] = null;
            return null;
        }
        const data = await res.json();
        characterCache[name] = data;
        return data;
    } catch (e) {
        console.error('fetchCharacter error:', e);
        return null;
    }
}

async function fetchGuide(name) {
    if (guideCache[name] !== undefined) return guideCache[name];
    try {
        const res = await fetch(`/api/guides/${encodeURIComponent(name)}`);
        if (!res.ok) {
            guideCache[name] = null;
            return null;
        }
        const data = await res.json();
        guideCache[name] = data;
        return data;
    } catch (e) {
        console.error('fetchGuide error:', e);
        return null;
    }
}

// ==================== 角色介紹 ====================
async function opencharacter(selectedCharacter){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'flex';
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('story').style.display = 'none';
    document.getElementById('guide').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';

    // 預先抓取角色資料
    await fetchCharacter(selectedCharacter);

    const buttons = document.querySelectorAll('.characterbutton button');
    if (buttons.length > 0) {
        buttons.forEach(btn => btn.classList.remove('active'));
        buttons[0].classList.add('active');
        document.getElementById('content').textContent = '請選擇需要查詢的資料';
    }

    bindButtonEvents(selectedCharacter);
    updateCharacterImage(selectedCharacter);
    updateCharacterName(selectedCharacter);
}

function updateCharacterImage(characterName) {
    const characterImages = {
        '朝武芳乃': 'picture/character1.png',
        '常陸茉子': 'picture/character2.png',
        '叢雨': 'picture/character3.png',
        '蕾娜·列支敦瑙爾': 'picture/character4.png',
        '鞍馬小春': 'picture/character5.png',
        '馬庭蘆花': 'picture/character6.png'
    };

    const imageElement = document.getElementById('characterpicture');
    const imagePath = characterImages[characterName] || 'picture/character1.png';
    imageElement.style.backgroundImage = `url('${imagePath}')`;
}

function updateCharacterName(characterName) {
    document.getElementById('name').textContent = characterName;
}

function back(){
    document.getElementById('choosepage').style.display = 'flex';
    document.getElementById('character').style.display = 'none';
}

function bindButtonEvents(characterName) {
    const characterButtons = document.querySelectorAll('.characterbutton button');

    // 清除舊的事件監聽器
    characterButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });

    const updatedButtons = document.querySelectorAll('.characterbutton button');

    updatedButtons.forEach(button => {
        button.addEventListener('click', function() {
            const allButtons = document.querySelectorAll('.characterbutton button');
            allButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            displayCharacterInfo(this.id, characterName);
        });
    });
}

// 顯示角色資訊（改為 async，透過 API 取得）
async function displayCharacterInfo(infoType, characterName) {
    const contentEl = document.getElementById('content');
    contentEl.textContent = '載入中…';

    const character = await fetchCharacter(characterName);
    if (!character) {
        contentEl.textContent = '找不到角色資料';
        return;
    }

    let infoText = '';
    switch(infoType) {
        case 'name':        infoText = `姓名: ${character.name}`; break;
        case 'age':         infoText = `年齡: ${character.age}`; break;
        case 'height':      infoText = `身高: ${character.height}`; break;
        case 'body_type':   infoText = `體型: ${character.body_type}`; break;
        case 'personality': infoText = `性格: ${character.personality}`; break;
        case 'identity':    infoText = `身份: ${character.identity}`; break;
        case 'likes':       infoText = `喜好: ${(character.likes || []).join(', ')}`; break;
        case 'dislikes':    infoText = `討厭: ${(character.dislikes || []).join(', ')}`; break;
        case 'clothes':     infoText = `服裝: ${(character.clothes || []).join(', ')}`; break;
        default:            infoText = `${infoType}: ${character[infoType] || '未知'}`;
    }

    contentEl.textContent = infoText;
}

// ==================== 攻略 ====================
function gotoguidepage(){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('story').style.display = 'none';
    document.getElementById('guidepage').style.display = 'flex';
    document.getElementById('guide').style.display = 'none';
    document.body.style.backgroundImage = "url('picture/background.jpg')";
}

async function openguide(selectedCharacter){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('story').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';
    document.getElementById('guide').style.display = 'flex';
    document.body.style.backgroundImage = "url('picture/background.jpg')";

    document.getElementById('guide_content').innerHTML = '<p>載入中…</p>';
    await displayGuideContent(selectedCharacter);
}

async function displayGuideContent(characterName) {
    const guideContent = document.getElementById('guide_content');
    const guide = await fetchGuide(characterName);

    if (guide && guide.options && guide.options.length > 0) {
        let guideHTML = `<h2>${characterName}</h2>`;
        guide.options.forEach((option, index) => {
            if (option && option.trim()) {
                guideHTML += `<p>選項${index + 1}：${option}</p>`;
            }
        });
        guideContent.innerHTML = guideHTML;
    } else {
        guideContent.innerHTML = `<h2>${characterName}</h2><p>該角色暫無攻略內容</p>`;
    }

    updateGuideCharacterImage(characterName);
}

function updateGuideCharacterImage(characterName) {
    const characterImages = {
        '朝武芳乃': 'picture/character_1.png',
        '常陸茉子': 'picture/character_2.png',
        '叢雨': 'picture/character_3.png',
        '蕾娜·列支敦瑙爾': 'picture/character_4.png',
        '鞍馬小春': 'picture/character_5.png',
        '馬庭蘆花': 'picture/character_6.png'
    };

    const imageElement = document.getElementById('characterimg');
    const imagePath = characterImages[characterName] || 'picture/character_1.png';
    imageElement.style.backgroundImage = `url('${imagePath}')`;
}

function backtoguidepage(){
    document.getElementById('guide').style.display = 'none';
    document.getElementById('guidepage').style.display = 'flex';
    document.body.style.backgroundImage = "url('picture/background.jpg')";
}