// static/js/script.js

// 獲取 DOM 元素
const sendButton = document.getElementById('send');
const clearButton = document.getElementById('clear');
const messageInput = document.getElementById('message');
const chatWindow = document.getElementById('chat-window');
const changeIconButton = document.getElementById('change-icon');
const currentIconImg = document.getElementById('current-icon');

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
        console.log('Chat response from server:', data);
        if (data.response.startsWith('A8B4')) {
            const calcuText = data.response.substring(5);
            let result;
            try {
                result = String(eval(calcuText));
                console.log(`Calculated result: ${result}`);
            } catch (e) {
                result = '計算錯誤';
                console.error('Eval error:', e);
            }
            appendMessage('bot', result, calcuText);
        } else {
            appendMessage('bot', data.response, null);
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        appendMessage('bot', '抱歉，發生錯誤。', null);
    });
}

// 添加訊息函數
function appendMessage(sender, text, calcuText) {
    console.log(`Appending message: sender=${sender}, text="${text}", calcuText="${calcuText}"`);
    
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

    messageContentDiv.appendChild(iconDiv);
    messageContentDiv.appendChild(textDiv);

    // 如果是使用者或機器人訊息，添加功能按鈕
    let actionButtonsDiv;
    if (sender === 'user' || sender === 'bot') {
        actionButtonsDiv = document.createElement('div');
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
                    if (messageDiv.classList.contains('editing')) {
                        const input = messageDiv.querySelector('.edit-input');
                        if (input) {
                            submitEdit(sender, messageDiv, input.value);
                        }
                    } else {
                        redoMessage(sender, messageDiv.getAttribute('data-index'), text);
                    }
                });
            }

            // 特別為 EDIT 按鈕添加點擊事件
            if (action.name === 'edit') {
                button.addEventListener('click', () => {
                    editMessage(sender, messageDiv, text);
                });
            }
        });
    }

    // Append messageContentDiv to messageDiv
    messageDiv.appendChild(messageContentDiv);
    
    // Append actionButtonsDiv after messageContentDiv if exists
    if (actionButtonsDiv) {
        messageDiv.appendChild(actionButtonsDiv);
    }

    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    console.log(`Message appended with index: ${messageIndex}`);
    messageIndex++; // 增加訊息索引
}

// 處理 Edit 按鈕點擊事件
function editMessage(sender, messageDiv, originalText) {
    console.log(`Edit button clicked for message index: ${messageDiv.getAttribute('data-index')}`);
    const textDiv = messageDiv.querySelector('.text');
    const actionButtonsDiv = messageDiv.querySelector('.action-buttons');
    const editButtonImg = actionButtonsDiv.querySelector('button[data-action="edit"] img');

    // 檢查是否已經在編輯模式
    const isEditing = messageDiv.classList.contains('editing');

    if (!isEditing) {
        // 進入編輯模式
        messageDiv.classList.add('editing');

        // 創建輸入框
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText;
        input.className = 'edit-input';

        // 保存原始文本，以便取消編輯時恢復
        messageDiv.setAttribute('data-original-text', originalText);

        // 清空 textDiv（保留 timestamp）
        const timeStamp = textDiv.querySelector('.timestamp');
        textDiv.innerHTML = '';
        textDiv.appendChild(input);
        textDiv.appendChild(timeStamp);
        input.focus();

        // 更改 Edit 按鈕的圖示為取消編輯
        editButtonImg.src = '/static/images/CANCEL.png'; // 確保此圖示存在

        // 添加鍵盤事件監聽器
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitEdit(sender, messageDiv, input.value);
            }
        });

        // 阻止點擊事件冒泡，以防觸發外部的取消編輯
        input.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        // 添加點擊外部取消編輯的功能
        document.addEventListener('click', function handler(event) {
            if (!messageDiv.contains(event.target)) {
                cancelEdit(sender, messageDiv);
                document.removeEventListener('click', handler);
            }
        }, { once: true });

    } else {
        // 取消編輯模式
        cancelEdit(sender, messageDiv);
    }
}

// 取消編輯模式
function cancelEdit(sender, messageDiv) {
    console.log(`Cancelling edit for message index: ${messageDiv.getAttribute('data-index')}`);
    const textDiv = messageDiv.querySelector('.text');
    const actionButtonsDiv = messageDiv.querySelector('.action-buttons');
    const editButtonImg = actionButtonsDiv.querySelector('button[data-action="edit"] img');

    // 移除編輯模式標記
    messageDiv.classList.remove('editing');

    // 恢復原始文字（保留 timestamp）
    const originalText = messageDiv.getAttribute('data-original-text') || '';
    const timeStamp = textDiv.querySelector('.timestamp');
    textDiv.innerHTML = originalText;
    textDiv.appendChild(timeStamp);

    // 移除保存的原始文本屬性
    messageDiv.removeAttribute('data-original-text');

    // 恢復 Edit 按鈕的圖示
    editButtonImg.src = '/static/images/EDIT.png'; // 確保此圖示存在
}

// 提交編輯
function submitEdit(sender, messageDiv, newText) {
    const index = parseInt(messageDiv.getAttribute('data-index'), 10);
    console.log(`Submitting edit: sender=${sender}, index=${index}, newText="${newText}"`);

    // 移除編輯模式標記
    messageDiv.classList.remove('editing');

    // 更新前端顯示（保留 timestamp）
    const textDiv = messageDiv.querySelector('.text');
    const timeStamp = textDiv.querySelector('.timestamp');
    textDiv.innerHTML = newText;
    textDiv.appendChild(timeStamp);

    // 恢復 Edit 按鈕的圖示
    const actionButtonsDiv = messageDiv.querySelector('.action-buttons');
    const editButtonImg = actionButtonsDiv.querySelector('button[data-action="edit"] img');
    editButtonImg.src = '/static/images/EDIT.png'; // 確保此圖示存在

    // 發送編輯請求到後端
    fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender: sender,
            index: index,
            new_text: newText
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Edit response from server:', data);
        if (data.response) {
            if (sender === 'user') {
                // 移除被編輯訊息之後的所有訊息
                removeMessagesAfter(index);
                console.log(`Removed messages after index: ${index}`);

                // 顯示新的機器人回應
                if (data.response.startsWith('A8B4')) {
                    const calcuText = data.response.substring(5);
                    let result;
                    try {
                        result = String(eval(calcuText));
                        console.log(`Calculated result: ${result}`);
                    } catch (e) {
                        result = '計算錯誤';
                        console.error('Eval error:', e);
                    }
                    appendMessage('bot', result, calcuText);
                    console.log('Appended new bot message.');
                } else {
                    appendMessage('bot', data.response, null);
                    console.log('Appended new bot message.');
                }
            } else if (sender === 'bot') {
                // 編輯 Bot 訊息後，移除該訊息之後的所有訊息（如果有）
                removeMessagesAfter(index);
                console.log(`Removed messages after bot index: ${index}`);

                // 已經更新前端顯示，不需要額外處理
            }
        } else if (data.error) {
            alert(data.error);
            console.error('Server error:', data.error);
            // 可以選擇恢復原始文字
            cancelEdit(sender, messageDiv);
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        alert('抱歉，無法提交編輯。');
        // 可以選擇恢復原始文字
        cancelEdit(sender, messageDiv);
    });
}

// 移除指定索引之後的所有訊息
function removeMessagesAfter(index) {
    console.log(`Removing messages after index: ${index}`);
    // 選取所有訊息
    const messages = chatWindow.querySelectorAll('[data-index]');
    messages.forEach(msg => {
        const msgIndex = parseInt(msg.getAttribute('data-index'), 10);
        if (msgIndex > index) {
            console.log(`Removing message with index: ${msgIndex}`);
            chatWindow.removeChild(msg);
        }
    });

    // 更新 messageIndex
    messageIndex = index + 1;
    console.log(`Updated messageIndex to: ${messageIndex}`);
}

// 處理 REDO 按鈕點擊事件
function redoMessage(sender, index, text) {
    index = parseInt(index, 10);
    console.log(`Redo message: sender=${sender}, index=${index}, text="${text}"`);

    if (sender === 'bot') {
        // 移除 Bot 訊息本身
        const botMessage = chatWindow.querySelector(`[data-index="${index}"]`);
        if (botMessage) {
            console.log(`Removing bot message with index: ${index}`);
            chatWindow.removeChild(botMessage);
        }
    }

    // 移除所有 data-index 大於 index 的訊息
    const messages = chatWindow.querySelectorAll(`[data-index]`);
    messages.forEach(msg => {
        const msgIndex = parseInt(msg.getAttribute('data-index'), 10);
        if (msgIndex > index) {
            console.log(`Removing message with index: ${msgIndex}`);
            chatWindow.removeChild(msg);
        }
    });

    // 重置 messageIndex
    messageIndex = index + 1;
    console.log(`Reset messageIndex to: ${messageIndex}`);

    // 發送 redo 請求到後端
    fetch('/api/redo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: sender, index: index })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Redo response from server:', data);
        if (data.response) {
            if (data.response.startsWith('A8B4')) {
                const calcuText = data.response.substring(5);
                let result;
                try {
                    result = String(eval(calcuText));
                    console.log(`Calculated result: ${result}`);
                } catch (e) {
                    result = '計算錯誤';
                    console.error('Eval error:', e);
                }
                appendMessage('bot', result, calcuText);
            } else {
                appendMessage('bot', data.response, null);
            }
        } else if (data.error) {
            alert(data.error);
            console.error('Server error:', data.error);
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        alert('抱歉，無法重新生成回應。');
    });
}

// 處理 VIEW 按鈕點擊事件
function handleViewButtonClick(text, calcuText) {
    if (calcuText) {
        // 假設 eval() 是在這行執行的
        const evalCode = `result = String(eval("${calcuText.trim()}"));`;
        const evalResult = text;
        document.getElementById('codeContent').textContent = evalCode;
        document.getElementById('codeResult').textContent = evalResult;

        // 顯示模態窗口
        document.getElementById('codeModal').style.display = "block";
        console.log('Displayed modal window.');
    } else {
        alert('這條訊息不是數學表達式，無法顯示代碼。');
    }
}

// 當用戶點擊 <span> (x)，關閉模態窗口
document.querySelector('.close').onclick = function() {
    document.getElementById('codeModal').style.display = "none";
    console.log('Closed modal window.');
}

// 當用戶在模態窗口外點擊，關閉模態窗口
window.onclick = function(event) {
    if (event.target == document.getElementById('codeModal')) {
        document.getElementById('codeModal').style.display = "none";
        console.log('Closed modal window by clicking outside.');
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
            console.log('Cleared conversation and reset messageIndex.');
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
    });
}

// 切換使用者圖示函數
function changeUserIcon() {
    // 增加索引並循環
    currentIconIndex = (currentIconIndex + 1) % userIcons.length;
    // 更新按鈕上的圖示
    currentIconImg.src = userIcons[currentIconIndex];
    console.log(`Changed user icon to index: ${currentIconIndex}`);
    // 更新所有使用者訊息中的圖示
    const userIconElements = document.querySelectorAll('.user-icon');
    userIconElements.forEach(img => {
        img.src = userIcons[currentIconIndex];
    });
    // 儲存當前圖示索引到 localStorage
    localStorage.setItem('currentIconIndex', currentIconIndex);
}
