// static/js/script.js

// 獲取 DOM 元素
const sendButton = document.getElementById('send');
const clearButton = document.getElementById('clear');
const messageInput = document.getElementById('message');
const chatWindow = document.getElementById('chat-window');
const changeIconButton = document.getElementById('change-icon');
const currentIconImg = document.getElementById('current-icon');

// 新增：獲取 LISTEN 輸入按鈕和 THINK 按鈕
const listenInputButton = document.getElementById('listen-input-button');
const thinkButton = document.getElementById('think-button');

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

// 初始化 SpeechRecognition
let recognition;
let isListening = false;

// 初始化語音識別實例
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW'; // 設置語言為繁體中文
    recognition.interimResults = false; // 只獲取最終結果
    recognition.maxAlternatives = 1; // 只獲取一個結果

    // 當語音識別開始
    recognition.onstart = () => {
        isListening = true;
        console.log('Speech recognition started.');
        // 添加正在聆聽的樣式
        const editingMessageDiv = chatWindow.querySelector('.editing');
        if (editingMessageDiv) {
            editingMessageDiv.classList.add('listening');
        }
    };

    // 當語音識別結束
    recognition.onend = () => {
        isListening = false;
        console.log('Speech recognition ended.');
        // 移除正在聆聽的樣式
        const editingMessageDiv = chatWindow.querySelector('.editing');
        if (editingMessageDiv) {
            editingMessageDiv.classList.remove('listening');
        }
        // 移除輸入區域的聆聽樣式
        document.getElementById('input-area').classList.remove('listening-input');
    };

    // 當有識別結果時
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log(`Speech recognition result: ${transcript}`);

        // 將識別出的文字插入到編輯輸入框
        const editingMessageDiv = chatWindow.querySelector('.editing');
        if (editingMessageDiv) {
            const input = editingMessageDiv.querySelector('.edit-input');
            if (input) {
                input.value = transcript;
                console.log('Speech recognition: 已將結果填入編輯輸入框');
                // 不自動提交編輯，允許使用者進一步修改
            }
        } else {
            // 如果不是在編輯模式，將文字填入輸入框
            messageInput.value = transcript;
            console.log('Speech recognition: 已將結果填入主輸入框');
            // 自動聚焦輸入框
            messageInput.focus();
        }
    };

    // 當發生錯誤時
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        alert('語音識別發生錯誤：' + event.error);
        isListening = false;
        // 移除正在聆聽的樣式
        const editingMessageDiv = chatWindow.querySelector('.editing');
        if (editingMessageDiv) {
            editingMessageDiv.classList.remove('listening');
        }
        // 移除輸入區域的聆聽樣式
        document.getElementById('input-area').classList.remove('listening-input');
    };
} else {
    console.warn('SpeechRecognition API is not supported in this browser.');
}

// 初始化訊息索引
let messageIndex = 0;

// 在頁面加載時，從 localStorage 讀取 currentIconIndex
document.addEventListener('DOMContentLoaded', () => {
    const storedIndex = localStorage.getItem('currentIconIndex');
    if (storedIndex !== null && !isNaN(storedIndex)) {
        currentIconIndex = parseInt(storedIndex, 10);
        currentIconImg.src = userIcons[currentIconIndex];
        console.log(`頁面加載: 使用者圖示索引設為 ${currentIconIndex}`);
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

// 為 LISTEN 輸入按鈕添加事件監聽器
if (listenInputButton) {
    listenInputButton.addEventListener('click', () => {
        if (recognition && !isListening) {
            // 清空輸入框
            messageInput.value = '';
            console.log('LISTEN: 清空輸入框');
            // 啟動語音識別
            recognition.start();
            // 添加正在聆聽的樣式到輸入區域
            document.getElementById('input-area').classList.add('listening-input');
            console.log('LISTEN: 啟動語音識別並添加聆聽樣式');
        }
    });
}

// 為 THINK 按鈕添加事件監聽器
if (thinkButton) {
    thinkButton.addEventListener('click', thinkHandler);
}

// 定義 THINK 按鈕的處理函數
function thinkHandler() {
    const message = messageInput.value.trim();
    if (message === '') {
        alert('請輸入您的訊息後再使用 THINK 功能。');
        return;
    }

    // Step 1: 發送訊息到 /api/think
    console.log('THINK Step 1: 發送訊息到 /api/think');
    
    // 禁用按鈕以防止重複點擊
    thinkButton.disabled = true;
    thinkButton.querySelector('img').src = '/static/images/THINKclicked.png'; // 更換圖示表示正在處理
    console.log('THINK Step 1: THINK 按鈕已禁用並更換圖示');

    // 移除輸入框中的訊息並新增到 context_window
    appendMessage('user', message, null);
    console.log(`THINK Step 1: 使用者訊息 "${message}" 已新增到聊天窗口`);
    messageInput.value = '';

    // 添加正在思考的樣式到輸入區域
    const inputArea = document.getElementById('input-area');
    inputArea.classList.add('thinking');
    console.log('THINK Step 1: 已添加正在思考的樣式到輸入區域');

    // 發送 POST 請求到 /api/think
    console.log('THINK Step 2: 發送 POST 請求到 /api/think');
    fetch('/api/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
        // Step 3: 接收並處理合成的回應
        console.log('THINK Step 3: 接收到合成的回應', data);
        if (data.response) {
            appendMessage('bot', data.response, data.view_prompt, data.view_response);
            console.log('THINK Step 3: 合成的回應已顯示在聊天窗口');
        } else if (data.error) {
            console.error('THINK Step 3: 後端回傳錯誤', data.error);
            alert(data.error);
        }
    })
    .catch(error => {
        console.error('THINK Step 3: 發生錯誤', error);
        alert('抱歉，發生錯誤。');
    })
    .finally(() => {
        // 恢復按鈕狀態
        thinkButton.disabled = false;
        thinkButton.querySelector('img').src = '/static/images/THINK.png'; // 恢復原圖示
        console.log('THINK Step 3: 已恢復 THINK 按鈕狀態');

        // 移除正在思考的樣式
        inputArea.classList.remove('thinking');
        console.log('THINK Step 3: 已移除正在思考的樣式');
    });
}

// 定義發送訊息到 API 的函數
async function sendMessageToAPI(message) {
    try {
        console.log(`發送訊息到 API: "${message}"`);
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`API 回應: "${data.response}"`);
            return data.response;
        } else {
            console.error('API Error:', data);
            return '抱歉，無法獲取回應。';
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        return '抱歉，發生錯誤。';
    }
}

// 发送訊息函數
function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '') return;

    appendMessage('user', message, null);
    console.log(`使用者發送訊息: "${message}"`);
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
                console.log(`計算結果: ${result}`);
            } catch (e) {
                result = '計算錯誤';
                console.error('Eval error:', e);
            }
            appendMessage('bot', result, data.prompt);
            console.log('機器人回應已顯示');
        } else {
            appendMessage('bot', data.response, data.prompt);
            console.log('機器人回應已顯示');
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        appendMessage('bot', '抱歉，發生錯誤。', null);
    });
}

// 添加訊息函數
function appendMessage(sender, text, prompt, spetext = null) {
    // console.log(`Appending message: sender=${sender}, text="${text}", prompt="${prompt}"`);
    
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
                    handleViewButtonClick(text, prompt, spetext);
                });
            }

            // 特別為 SPEAK 按鈕添加點擊事件
            if (action.name === 'speak') {
                button.addEventListener('click', () => {
                    speakText(text);
                    console.log('SPEAK: 已讀出訊息');
                });
            }

            // 特別為 REDO 按鈕添加點擊事件
            if (action.name === 'redo') {
                button.addEventListener('click', () => {
                    if (messageDiv.classList.contains('editing')) {
                        const input = messageDiv.querySelector('.edit-input');
                        if (input) {
                            submitEdit(sender, messageDiv, input.value);
                            console.log('REDO: 提交編輯');
                        }
                    } else {
                        redoMessage(sender, messageDiv.getAttribute('data-index'), text);
                        console.log('REDO: 重新生成回應');
                    }
                });
            }

            // 特別為 EDIT 按鈕添加點擊事件
            if (action.name === 'edit') {
                button.addEventListener('click', () => {
                    editMessage(sender, messageDiv, text);
                    console.log('EDIT: 進入編輯模式或取消編輯');
                });
            }

            // 特別為 LISTEN 按鈕添加點擊事件
            if (action.name === 'listen') {
                button.addEventListener('click', () => {
                    const editingMessageDiv = chatWindow.querySelector('.editing');
                    if (editingMessageDiv) {
                        // 如果已在編輯模式，開始語音識別
                        if (recognition && !isListening) {
                            recognition.start();
                            console.log('LISTEN: 開始語音識別');
                        }
                    } else {
                        // 如果未在編輯模式，切換到編輯模式並開始語音識別
                        // 假設您希望點擊 LISTEN 按鈕時自動進入編輯模式
                        const actionButtons = messageDiv.querySelector('.action-buttons');
                        const editButton = actionButtons.querySelector('button[data-action="edit"]');
                        if (editButton) {
                            editButton.click(); // 進入編輯模式
                            console.log('LISTEN: 自動進入編輯模式');
                            // 等待一點時間以確保編輯模式已啟動
                            setTimeout(() => {
                                if (recognition && !isListening) {
                                    recognition.start();
                                    console.log('LISTEN: 開始語音識別');
                                }
                            }, 100);
                        }
                    }
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

    // 如果有 prompt，儲存於 data-prompt 屬性
    if (sender === 'bot' && prompt) {
        messageDiv.setAttribute('data-prompt', prompt);
    }

    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // console.log(`Message appended with index: ${messageIndex}`);
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
        console.log(`Message index ${messageDiv.getAttribute('data-index')} 進入編輯模式`);

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
        console.log(`Message index ${messageDiv.getAttribute('data-index')} 已創建編輯輸入框`);

        // 更改 Edit 按鈕的圖示為取消編輯
        editButtonImg.src = '/static/images/CANCEL.png'; // 確保此圖示存在

        // 添加鍵盤事件監聽器
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitEdit(sender, messageDiv, input.value);
                console.log(`Message index ${messageDiv.getAttribute('data-index')} 提交編輯`);
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
                console.log(`Message index ${messageDiv.getAttribute('data-index')} 取消編輯`);
                document.removeEventListener('click', handler);
            }
        }, { once: true });

    } else {
        // 取消編輯模式
        cancelEdit(sender, messageDiv);
        console.log(`Message index ${messageDiv.getAttribute('data-index')} 取消編輯`);
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
    textDiv.innerHTML = '';
    textDiv.textContent = originalText;
    textDiv.appendChild(timeStamp);

    // 移除保存的原始文本屬性
    messageDiv.removeAttribute('data-original-text');

    // 恢復 Edit 按鈕的圖示
    editButtonImg.src = '/static/images/EDIT.png'; // 確保此圖示存在
    console.log(`Message index ${messageDiv.getAttribute('data-index')} 已恢復原始文字並退出編輯模式`);
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
    textDiv.innerHTML = '';
    textDiv.textContent = newText;
    textDiv.appendChild(timeStamp);
    console.log(`Message index ${index} 已更新為 "${newText}"`);

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
            console.log('Redo: 新的機器人回應已顯示');
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
function handleViewButtonClick(response, prompt, spetext) {
    // 填充模態窗口內容
    console.log('VIEW: 填充模態窗口內容');
    console.log('VIEW: response:', response);
    console.log('VIEW: prompt:', prompt);
    console.log('VIEW: spetext:', spetext);
    if(spetext === null){
        document.getElementById('codeContent').textContent = prompt;
        document.getElementById('codeResult').textContent = response;
    }else{
        document.getElementById('codeContent').textContent = prompt;
        document.getElementById('codeResult').textContent = spetext;
    }

    // 顯示模態窗口
    document.getElementById('codeModal').style.display = "block";
    console.log('VIEW: 顯示模態窗口');
}

// 當用戶點擊 <span> (x)，關閉模態窗口
document.querySelector('.close').onclick = function() {
    document.getElementById('codeModal').style.display = "none";
    console.log('VIEW: 關閉模態窗口');
}

// 當用戶在模態窗口外點擊，關閉模態窗口
window.onclick = function(event) {
    if (event.target == document.getElementById('codeModal')) {
        document.getElementById('codeModal').style.display = "none";
        console.log('VIEW: 關閉模態窗口 by clicking outside');
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
            console.log('清除對話並重置 messageIndex');
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
    console.log(`Saved currentIconIndex (${currentIconIndex}) to localStorage`);
}

// 新增：處理輸入欄位的語音識別結果
// 因為我們有兩個不同的 LISTEN 按鈕，這裡將簡化為僅使用一個語音識別實例
// 如果需要區分不同的按鈕，可以考慮使用不同的識別實例

// 為輸入欄位的 LISTEN 按鈕添加事件處理器
if (listenInputButton) {
    listenInputButton.addEventListener('click', () => {
        if (recognition && !isListening) {
            // 清空輸入框
            messageInput.value = '';
            // 啟動語音識別
            recognition.start();
            // 添加正在聆聽的樣式到輸入區域
            document.getElementById('input-area').classList.add('listening-input');
        }
    });
}

// 修改語音識別結束時，移除輸入區域的聆聽樣式
recognition.onend = () => {
    isListening = false;
    console.log('Speech recognition ended.');
    // 移除正在聆聽的樣式
    const editingMessageDiv = chatWindow.querySelector('.editing');
    if (editingMessageDiv) {
        editingMessageDiv.classList.remove('listening');
    }
    // 移除輸入區域的聆聽樣式
    document.getElementById('input-area').classList.remove('listening-input');
};

// 修改語音識別結果處理，將文字填入輸入框
recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log(`Speech recognition result: ${transcript}`);

    // 將識別出的文字插入到編輯輸入框（如果在編輯模式下）
    const editingMessageDiv = chatWindow.querySelector('.editing');
    if (editingMessageDiv) {
        const input = editingMessageDiv.querySelector('.edit-input');
        if (input) {
            input.value = transcript;
            // 不自動提交編輯，允許使用者進一步修改
        }
    } else {
        // 如果不是在編輯模式，將文字填入輸入框
        messageInput.value = transcript;
        // 可以選擇自動聚焦輸入框，讓使用者立即可以修改
        messageInput.focus();
    }
};