// static/js/script.js

// 獲取 DOM 元素
const sendButton = document.getElementById('send');
const clearButton = document.getElementById('clear');
const messageInput = document.getElementById('message');
const chatWindow = document.getElementById('chat-window');
const changeIconButton = document.getElementById('change-icon');
const currentIconImg = document.getElementById('current-icon');
const listenButton = document.getElementById('listen-button');
const thinkButton = document.getElementById('think-button');

// 獲取模態窗口元素
const modal = document.getElementById('codeModal');
const closeModal = document.getElementsByClassName('close')[0];
const codeContent = document.getElementById('codeContent');
const codeResult = document.getElementById('codeResult');

// 定義使用者圖示陣列
const userIcons = [
    '/static/images/iconE.png',
    '/static/images/iconF.png',
    '/static/images/iconM.png'
];
let currentIconIndex = 0;

// 定義功能按鈕的圖示路徑
const actionIcons = {
    listen: {
        normal: '/static/images/LISTEN.png',
        clicked: '/static/images/LISTENclicked.png'
    },
    think: {
        normal: '/static/images/THINK.png',
        clicked: '/static/images/THINKclicked.png'
    }
};

// 定義語音朗讀函數
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        // 可選：設置語言、語調等屬性
        utterance.lang = 'zh-TW'; // 根據需要設置語言
        utterance.pitch = 1;
        utterance.rate = 1;
        speechSynthesis.speak(utterance);
    } else {
        alert('抱歉，您的瀏覽器不支持語音合成功能。');
    }
}

// 初始化訊息索引
let messageIndex = 0;

// 在頁面加載時，從 localStorage 讀取 currentIconIndex
document.addEventListener('DOMContentLoaded', () => {
    const storedIndex = localStorage.getItem('currentIconIndex');
    if (storedIndex !== null && !isNaN(storedIndex)) {
        currentIconIndex = parseInt(storedIndex, 10);
        currentIconImg.src = userIcons[currentIconIndex];
    }
});

// 事件監聽器
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
clearButton.addEventListener('click', clearConversation);
changeIconButton.addEventListener('click', changeUserIcon);

// 添加事件監聽器到新增的功能按鈕
listenButton.addEventListener('mousedown', () => {
    listenButton.querySelector('img').src = actionIcons.listen.clicked;
});

listenButton.addEventListener('mouseup', () => {
    listenButton.querySelector('img').src = actionIcons.listen.normal;
});

listenButton.addEventListener('mouseleave', () => {
    listenButton.querySelector('img').src = actionIcons.listen.normal;
});

thinkButton.addEventListener('mousedown', () => {
    thinkButton.querySelector('img').src = actionIcons.think.clicked;
});

thinkButton.addEventListener('mouseup', () => {
    thinkButton.querySelector('img').src = actionIcons.think.normal;
});

thinkButton.addEventListener('mouseleave', () => {
    thinkButton.querySelector('img').src = actionIcons.think.normal;
});

// 发送訊息函數
function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '') return;

    appendMessage('user', message, null);
    messageInput.value = '';

    fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
        if (data.response.startsWith('A8B4')) {
            const calcuText = data.response.substring(5);
            const result = String(eval(calcuText));
            appendMessage('bot', result, calcuText);
        } else {
            appendMessage('bot', data.response, null);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage('bot', '抱歉，發生錯誤。', null);
    });
}

// 添加訊息函數
function appendMessage(sender, text, calcuText) {
    const messageDiv = document.createElement('div');
    messageDiv.className = sender;
    messageDiv.setAttribute('data-index', messageIndex); // 設定訊息索引

    const messageContentDiv = document.createElement('div');
    messageContentDiv.className = 'message';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'icon';

    if (sender === 'user') {
        iconDiv.innerHTML = `<img src="${userIcons[currentIconIndex]}" alt="User Icon" class="user-icon">`;
    } else {
        iconDiv.innerHTML = '<img src="/static/images/iconR.png" alt="Bot Icon">';
    }

    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    textDiv.textContent = text;

    // 添加時間戳
    const timeStamp = document.createElement('div');
    timeStamp.className = 'timestamp';
    const now = new Date();
    timeStamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    textDiv.appendChild(timeStamp);

    // 如果是使用者或機器人訊息，添加功能按鈕
    if (sender === 'user' || sender === 'bot') {
        const actionButtonsDiv = document.createElement('div');
        actionButtonsDiv.className = 'action-buttons';

        // 定義功能按鈕及其圖示
        const actions = sender === 'user' ? [
            { name: 'redo', normal: '/static/images/REDO.png', clicked: '/static/images/REDOclicked.png' },
            { name: 'edit', normal: '/static/images/EDIT.png', clicked: '/static/images/EDITclicked.png' },
            { name: 'listen', normal: '/static/images/LISTEN.png', clicked: '/static/images/LISTENclicked.png' },
            { name: 'speak', normal: '/static/images/SPEAK.png', clicked: '/static/images/SPEAKclicked.png' },
            { name: 'think', normal: '/static/images/THINK.png', clicked: '/static/images/THINKclicked.png' }
        ] : [
            { name: 'redo', normal: '/static/images/REDO.png', clicked: '/static/images/REDOclicked.png' },
            { name: 'edit', normal: '/static/images/EDIT.png', clicked: '/static/images/EDITclicked.png' },
            { name: 'view', normal: '/static/images/VIEW.png', clicked: '/static/images/VIEWclicked.png' },
            { name: 'speak', normal: '/static/images/SPEAK.png', clicked: '/static/images/SPEAKclicked.png' },
            { name: 'think', normal: '/static/images/THINK.png', clicked: '/static/images/THINKclicked.png' },
        ];

        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'action-button';
            button.dataset.action = action.name; // 使用 data-action 屬性標識按鈕類型

            const img = document.createElement('img');
            img.src = action.normal;
            img.alt = `${action.name} icon`;

            button.appendChild(img);
            actionButtonsDiv.appendChild(button);

            // 添加事件監聽器
            button.addEventListener('mousedown', () => {
                img.src = action.clicked;
            });

            button.addEventListener('mouseup', () => {
                img.src = action.normal;
            });

            button.addEventListener('mouseleave', () => {
                img.src = action.normal;
            });

            // 特別為 VIEW 按鈕添加點擊事件
            if (action.name === 'view' && sender === 'bot') {
                button.addEventListener('click', () => {
                    handleViewButtonClick(text, calcuText);
                });
            }

            // 特別為 SPEAK 按鈕添加點擊事件
            if (action.name === 'speak') {
                button.addEventListener('click', () => {
                    speakText(text);
                });
            }

            // 特別為 REDO 按鈕添加點擊事件
            if (action.name === 'redo') {
                button.addEventListener('click', () => {
                    redoMessage(sender, messageDiv.getAttribute('data-index'), text);
                });
            }
        });

        textDiv.appendChild(actionButtonsDiv);
    }

    messageContentDiv.appendChild(iconDiv);
    messageContentDiv.appendChild(textDiv);
    messageDiv.appendChild(messageContentDiv);
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    messageIndex++; // 增加訊息索引
}

// 處理 VIEW 按鈕點擊事件
function handleViewButtonClick(text, calcuText) {
    if (calcuText) {
        // 假設 eval() 是在這行執行的
        const evalCode = `result = String(eval("${calcuText.trim()}"));`;
        const evalResult = text;
        codeContent.textContent = evalCode;
        codeResult.textContent = evalResult;

        // 顯示模態窗口
        modal.style.display = "block";
    } else {
        alert('這條訊息不是數學表達式，無法顯示代碼。');
    }
}

// 處理 REDO 按鈕點擊事件
function redoMessage(sender, index, text) {
    index = parseInt(index, 10);

    if (sender === 'bot') {
        // 移除 Bot 訊息本身
        const botMessage = chatWindow.querySelector(`[data-index="${index}"]`);
        if (botMessage) {
            chatWindow.removeChild(botMessage);
        }
    }

    // 移除所有 data-index 大於 index 的訊息
    const messages = chatWindow.querySelectorAll(`[data-index]`);
    messages.forEach(msg => {
        const msgIndex = parseInt(msg.getAttribute('data-index'), 10);
        if (msgIndex > index) {
            chatWindow.removeChild(msg);
        }
    });

    // 重置 messageIndex
    messageIndex = index + 1;

    // 發送 redo 請求到後端
    fetch('/api/redo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: sender, index: index })
    })
    .then(response => response.json())
    .then(data => {
        if (data.response) {
            if (data.response.startsWith('A8B4')) {
                const calcuText = data.response.substring(5);
                const result = String(eval(calcuText));
                appendMessage('bot', result, calcuText);
            } else {
                appendMessage('bot', data.response, null);
            }
        } else if (data.error) {
            alert(data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('抱歉，無法重新生成回應。');
    });
}

// 當用戶點擊 <span> (x)，關閉模態窗口
closeModal.onclick = function() {
    modal.style.display = "none";
}

// 當用戶在模態窗口外點擊，關閉模態窗口
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// 清除對話函數
function clearConversation() {
    fetch('/api/clear', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === 'success'){
            chatWindow.innerHTML = '';
            alert('對話已清除。');
            messageIndex = 0; // 重置訊息索引
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// 切換使用者圖示函數
function changeUserIcon() {
    // 增加索引並循環
    currentIconIndex = (currentIconIndex + 1) % userIcons.length;
    // 更新按鈕上的圖示
    currentIconImg.src = userIcons[currentIconIndex];
    // 更新所有使用者訊息中的圖示
    const userIconElements = document.querySelectorAll('.user-icon');
    userIconElements.forEach(img => {
        img.src = userIcons[currentIconIndex];
    });
    // 儲存當前圖示索引到 localStorage
    localStorage.setItem('currentIconIndex', currentIconIndex);
}
