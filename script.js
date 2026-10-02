function openhomepage2(){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'block';
    document.getElementById('story').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('guide').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';
    document.body.style.backgroundImage = "url('picture/homepage2.jpg')";
    updateFileNameList();
}

window.onload = function() {
    document.getElementById("homepage2").style.display = "none";
    document.getElementById("story").style.display = "none";
    document.getElementById("character").style.display = "none";
    document.getElementById("choosepage").style.display = "none";
    document.getElementById('guide').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';
    updateFileNameList();
}

function gotolink(){
    window.open("https://hikarifield.co.jp/senren/");
}

function gotocharacter(){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'flex';   // ← flex
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
    document.getElementById('story').style.display = 'flex';        // ← flex
    document.getElementById('guidepage').style.display = 'none';
    document.getElementById('guide').style.display = 'none';
    document.body.style.backgroundImage = "url('picture/background.jpg')";
}

///-----------------------------角色介紹------------------------------

let characterManager;  // 保存角色管理器實例

function opencharacter(selectedCharacter){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'flex';    // ← flex
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('story').style.display = 'none';
    document.getElementById('guide').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';

    // 初始化角色管理器
    characterManager = new CharacterManager();

    // 設置第一個按鈕為活躍狀態
    const buttons = document.querySelectorAll('.characterbutton button');
    if(buttons.length > 0) {
        buttons.forEach(btn => btn.classList.remove('active'));
        buttons[0].classList.add('active');
        document.getElementById('content').textContent = '請選擇需要查詢的資料';
    }

    // 綁定點擊事件，傳入正確的角色名稱
    bindButtonEvents(selectedCharacter);

    // 同時更新角色圖片
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
    document.getElementById('choosepage').style.display = 'flex';    // ← flex
    document.getElementById('character').style.display = 'none';
}

function bindButtonEvents(characterName) {
    const characterButtons = document.querySelectorAll('.characterbutton button');

    // 清除之前的事件監聽器
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

// 顯示角色資訊
function displayCharacterInfo(infoType, characterName) {
    if(!characterManager) {
        console.error('CharacterManager not initialized');
        return;
    }

    const character = characterManager.get_character(characterName);
    if(!character) {
        document.getElementById('content').textContent = '找不到角色資料';
        return;
    }

    let infoText = '';
    switch(infoType) {
        case 'name':
            infoText = `姓名: ${character.name}`;
            break;
        case 'age':
            infoText = `年齡: ${character.age}`;
            break;
        case 'height':
            infoText = `身高: ${character.height}`;
            break;
        case 'body_type':
            infoText = `體型: ${character.body_type}`;
            break;
        case 'personality':
            infoText = `性格: ${character.personality}`;
            break;
        case 'identity':
            infoText = `身份: ${character.identity}`;
            break;
        case 'likes':
            infoText = `喜好: ${character.likes.join(', ')}`;
            break;
        case 'dislikes':
            infoText = `討厭: ${character.dislikes.join(', ')}`;
            break;
        case 'clothes':
            infoText = `服裝: ${character.clothes.join(', ')}`;
            break;
        default:
            infoText = `${infoType}: ${character[infoType] || '未知'}`;
    }

    document.getElementById('content').textContent = infoText;
}

///---------------------攻略-------------------------

function gotoguidepage(){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('story').style.display = 'none';
    document.getElementById('guidepage').style.display = 'flex';    // ← flex
    document.getElementById('guide').style.display = 'none';
    document.body.style.backgroundImage = "url('picture/background.jpg')";
}

function openguide(selectedCharacter){
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('homepage2').style.display = 'none';
    document.getElementById('character').style.display = 'none';
    document.getElementById('choosepage').style.display = 'none';
    document.getElementById('story').style.display = 'none';
    document.getElementById('guidepage').style.display = 'none';
    document.getElementById('guide').style.display = 'flex';        // ← flex
    document.body.style.backgroundImage = "url('picture/background.jpg')";

    // 顯示攻略內容
    displayGuideContent(selectedCharacter);
}

function displayGuideContent(characterName) {
    const characterManager = new CharacterManager();
    const guide = characterManager.get_guide(characterName);

    if(guide) {
        const options = guide.getAllOptions();
        let guideHTML = `<h2>${characterName}</h2>`;

        if(options.length > 0) {
            options.forEach((option, index) => {
                if(option.trim()) {
                    guideHTML += `<p>選項${index + 1}：${option}</p>`;
                }
            });
        } else {
            guideHTML += `<p>該角色暫無攻略內容</p>`;
        }

        document.getElementById('guide_content').innerHTML = guideHTML;
    } else {
        document.getElementById('guide_content').innerHTML = '<p>該角色暫無攻略內容</p>';
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
    document.getElementById('guidepage').style.display = 'flex';    // ← flex
    document.body.style.backgroundImage = "url('picture/background.jpg')";
}