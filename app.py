# app.py
import os
import shutil
import json
import concurrent.futures
from flask import Flask, request, jsonify, render_template, session
from API_KEY import KEY
import requests
from flask_session import Session

app = Flask(__name__)

# 設定密鑰，用於加密 session 資料
app.secret_key = 'your_secret_key_here'  # 替換為您的秘密密鑰

# 使用 Flask-Session 來管理 session
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = './flask_session'  # 指定 session 文件目錄
Session(app)

# 定義 Session 文件目錄
session_folder = app.config['SESSION_FILE_DIR']

# 如果 session 文件夾存在，刪除並重新建立
if os.path.exists(session_folder):
    shutil.rmtree(session_folder)
os.makedirs(session_folder)

COHERE_API_KEY = KEY
COHERE_API_URL = 'https://api.cohere.ai/v1/generate'

# 定義最大對話數量
MAX_CONTEXT = 10

# 定義 default_prompt
DEFAULT_PROMPT = (
    "The definition of a math expression is a combination of numbers and operator which like +, -, *, / or ()."
    "If the input contain math expression, than start the response with A8B4: and the math expression in input."
    "For example, if the input is 'What is 2+2?', the response should be 'A8B4:2+2'."
    "You should only reply to the question after \"Current User:\""
    "For other general questions, please response like chat in English."
)

def blur(text):
    if(text[0:4] == "A8B4"):
        text = "A8B4: " + text[5:]
    else:
        return text
    flag = False
    for c in text[5:]:
        if c in "0123456789":
            flag = True
    if flag == False:
        return text[5:]
    return text

def is_math_expression(text):
    # 檢查是否有數學表達式
    if(text[0:4] != "A8B4"):
        return False
    flag = False
    for c in text[5:]:
        if c in "0123456789":
            flag = True
    return flag

@app.route('/')
def index():
    return render_template('index.html')

# 主要處理訊息的地方
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message')
    print("user_message:", user_message)

    if 'context_window' not in session:
        session['context_window'] = []

    context_window = session['context_window']

    # 構建 prompt，包含 default_prompt 和所有的對話歷史
    prompt = DEFAULT_PROMPT + "\n\nbackground:{"
    for exchange in context_window:
        if exchange['role'] == 'user':
            prompt += f"User: {exchange['content']}\n"
        elif exchange['role'] == 'bot':
            prompt += f"Bot: {exchange['content']}\n"
    prompt += "}\n"
    prompt += "Current user:" + user_message + "\n"
    prompt += "Bot:"

    # 將用戶訊息加入 context_window
    context_window.append({'role': 'user', 'content': user_message})

    print("prompt:", prompt)

    headers = {
        'Authorization': f'Bearer {COHERE_API_KEY}',
        'Content-Type': 'application/json',
    }

    payload = {
        'model': 'command-r-plus-08-2024',
        'prompt': prompt,
        'max_tokens': 150,
        'temperature': 0.7,
    }

    response = requests.post(COHERE_API_URL, headers=headers, json=payload)

    if response.status_code == 200:
        generated_text = response.json()['generations'][0]['text'].strip()
        print("user:", user_message)
        print("preblurgenerated_text:", generated_text)
        generated_text = blur(generated_text)
        print("generated_text:", generated_text)
        
        context_window.append({'role': 'bot', 'content': generated_text})

        # 限制 context_window 的大小
        if len(context_window) > MAX_CONTEXT * 2:
            # 移除最早的一組對話
            context_window = context_window[-MAX_CONTEXT * 2:]
            session['context_window'] = context_window
        else:
            session['context_window'] = context_window

        return jsonify({'response': generated_text, 'index': len(context_window)-1})
    else:
        return jsonify({'response': '抱歉，我無法處理您的請求。'}), 500

# 新增 redo 路由
@app.route('/api/redo', methods=['POST'])
def redo():
    data = request.get_json()
    sender = data.get('sender')  # 'user' 或 'bot'
    index = data.get('index')    # 整數，對應 context_window 的索引

    if sender not in ['user', 'bot'] or index is None:
        return jsonify({'error': 'Invalid data'}), 400

    context_window = session.get('context_window', [])

    if sender == 'user':
        # 使用者訊息位於 context_window 的偶數索引（0, 2, 4, ...）
        user_message_index = index
        if user_message_index >= len(context_window) or context_window[user_message_index]['role'] != 'user':
            return jsonify({'error': 'Invalid user message index'}), 400

        # 截斷 context_window，移除 redo 訊息之後的所有內容
        context_window = context_window[:user_message_index + 1]

    elif sender == 'bot':
        # 機器人訊息位於 context_window 的奇數索引（1, 3, 5, ...）
        bot_message_index = index
        if bot_message_index >= len(context_window) or context_window[bot_message_index]['role'] != 'bot':
            return jsonify({'error': 'Invalid bot message index'}), 400

        # 尋找對應的使用者訊息
        user_message_index = bot_message_index - 1
        if user_message_index < 0 or context_window[user_message_index]['role'] != 'user':
            return jsonify({'error': 'Corresponding user message not found'}), 400

        # 截斷 context_window，移除 redo 訊息之後的所有內容
        context_window = context_window[:user_message_index + 1]

    # 更新 session
    session['context_window'] = context_window

    # 取得需要重新生成的使用者訊息
    user_message = context_window[user_message_index]['content']

    # 構建 prompt
    prompt = DEFAULT_PROMPT + "\n\nbackground:{"
    for exchange in context_window:
        if exchange['role'] == 'user':
            prompt += f"User: {exchange['content']}\n"
        elif exchange['role'] == 'bot':
            prompt += f"Bot: {exchange['content']}\n"
    prompt += "}\n"
    prompt += "Current user:" + user_message + "\n"
    prompt += "Bot:"

    headers = {
        'Authorization': f'Bearer {COHERE_API_KEY}',
        'Content-Type': 'application/json',
    }

    payload = {
        'model': 'command-r-plus-08-2024',
        'prompt': prompt,
        'max_tokens': 150,
        'temperature': 0.7,
    }

    response = requests.post(COHERE_API_URL, headers=headers, json=payload)

    if response.status_code == 200:
        generated_text = response.json()['generations'][0]['text'].strip()
        generated_text = blur(generated_text)
        print("redo_generated_text:", generated_text)
        
        # 將新生成的機器人回覆加入 context_window
        context_window.append({'role': 'bot', 'content': generated_text})

        # 限制 context_window 的大小
        if len(context_window) > MAX_CONTEXT * 2:
            context_window = context_window[-MAX_CONTEXT * 2:]
        session['context_window'] = context_window

        # 返回新生成的回應和其在 context_window 中的索引
        new_bot_index = len(context_window) - 1
        return jsonify({'response': generated_text, 'index': new_bot_index})
    else:
        return jsonify({'response': '抱歉，我無法處理您的請求。'}), 500

# 新增 edit 路由
@app.route('/api/edit', methods=['POST'])
def edit():
    data = request.get_json()
    sender = data.get('sender')  # 'user' 或 'bot'
    index = data.get('index')    # 整數，對應 context_window 的索引
    new_text = data.get('new_text')  # 編輯後的文字

    if sender not in ['user', 'bot'] or index is None or new_text is None:
        return jsonify({'error': 'Invalid data'}), 400

    context_window = session.get('context_window', [])

    if sender == 'user':
        # 確認該索引對應的訊息是 User 的訊息
        if index >= len(context_window) or context_window[index]['role'] != 'user':
            return jsonify({'error': 'Invalid user message index'}), 400

        # 截斷 context_window，移除 redo 訊息之後的所有內容
        context_window = context_window[:index + 1]

        # 替換 User 訊息為編輯後的內容
        context_window[index]['content'] = new_text

        # 將編輯後的 User 訊息發送到後端以生成新的 Bot 回應
        user_message = new_text

        # 構建 prompt
        prompt = DEFAULT_PROMPT + "\n\nbackground:{"
        for exchange in context_window:
            if exchange['role'] == 'user':
                prompt += f"User: {exchange['content']}\n"
            elif exchange['role'] == 'bot':
                prompt += f"Bot: {exchange['content']}\n"
        prompt += "}\n"
        prompt += "Current user:" + user_message + "\n"
        prompt += "Bot:"

        headers = {
            'Authorization': f'Bearer {COHERE_API_KEY}',
            'Content-Type': 'application/json',
        }

        payload = {
            'model': 'command-r-plus-08-2024',
            'prompt': prompt,
            'max_tokens': 150,
            'temperature': 0.7,
        }

        response = requests.post(COHERE_API_URL, headers=headers, json=payload)

        if response.status_code == 200:
            generated_text = response.json()['generations'][0]['text'].strip()
            generated_text = blur(generated_text)
            print("edit_generated_text:", generated_text)
            
            # 將新的 Bot 回應加入 context_window
            context_window.append({'role': 'bot', 'content': generated_text})

            # 限制 context_window 的大小
            if len(context_window) > MAX_CONTEXT * 2:
                context_window = context_window[-MAX_CONTEXT * 2:]
            session['context_window'] = context_window

            # 返回新的 Bot 回應和其在 context_window 中的索引
            new_bot_index = len(context_window) - 1
            return jsonify({'response': generated_text, 'index': new_bot_index})
        else:
            return jsonify({'response': '抱歉，我無法處理您的請求。'}), 500

    elif sender == 'bot':
        # 確認該索引對應的訊息是 Bot 的訊息
        if index >= len(context_window) or context_window[index]['role'] != 'bot':
            return jsonify({'error': 'Invalid bot message index'}), 400

        # 截斷 context_window，移除該 Bot 訊息及其後的所有內容
        context_window = context_window[:index]

        # 將編輯後的 Bot 訊息新增到 context_window
        context_window.append({'role': 'bot', 'content': new_text})

        # 更新 session
        session['context_window'] = context_window

        return jsonify({'response': new_text, 'index': len(context_window)-1})

@app.route('/api/clear', methods=['POST'])
def clear():
    session.pop('context_window', None)
    return jsonify({'status': 'success'})

# 新增 think 路由
@app.route('/api/think', methods=['POST'])
def think():
    data = request.get_json()
    user_message = data.get('message')
    
    steps = []  # 用於存儲步驟資訊

    if not user_message:
        steps.append('Step 1: 未提供訊息。')
        return jsonify({'error': 'No message provided.', 'steps': steps}), 400

    steps.append(f'Step 1: 接收到使用者訊息: "{user_message}"')

    # Step 1: 將訊息分成三個部分
    split_prompt = (
        "請將以下訊息分成三個邏輯上獨立的部分，每部分用分號（;）隔開。\n"
        f"訊息：{user_message}\n"
        "分成三部分："
    )

    headers = {
        'Authorization': f'Bearer {COHERE_API_KEY}',
        'Content-Type': 'application/json',
    }

    split_payload = {
        'model': 'command-xlarge-nightly',  # 請根據您的模型選擇
        'prompt': split_prompt,
        'max_tokens': 100,
        'temperature': 0.5,
    }

    steps.append('Step 2: 發送分割請求到 Cohere API')
    split_response = requests.post(COHERE_API_URL, headers=headers, json=split_payload)

    if split_response.status_code != 200:
        steps.append('Step 2: Cohere API 分割請求失敗。')
        return jsonify({'error': 'Failed to split message.', 'steps': steps}), 500

    split_text = split_response.json()['generations'][0]['text'].strip()
    parts = [part.strip() for part in split_text.split(';') if part.strip()]

    # 確保有至少三部分
    while len(parts) < 3:
        parts.append(parts[-1])

    for i in range(3):
        if len(parts[i]) < 4:
            parts[i] = user_message

    steps.append(f'Step 2: Cohere API 分割結果: {parts}')

    if len(parts) < 3:
        steps.append('Step 2: 分割結果不足三部分。')
        return jsonify({'error': 'Failed to split message into three parts.', 'steps': steps}), 500

    # Step 3: 同時發送三個請求到 /api/chat
    def send_chat_request(part):
        chat_payload = {
            'message': part
        }
        steps.append(f'Step 3: 發送部分訊息到 /api/chat: "{part}"')
        chat_response = requests.post('http://localhost:8888/api/chat', headers={'Content-Type': 'application/json'}, data=json.dumps(chat_payload))
        if chat_response.status_code == 200:
            chat_data = chat_response.json()
            response = chat_data.get('response', '')
            steps.append(f'Step 3: 接收到 /api/chat 回應: "{response}"')
            return response
        else:
            steps.append(f'Step 3: /api/chat 回應錯誤: {chat_response.status_code}')
            return '抱歉，無法處理這部分的請求。'

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = [executor.submit(send_chat_request, part) for part in parts[:3]]
        responses = [future.result() for future in concurrent.futures.as_completed(futures)]

    steps.append(f'Step 3: 三個部分的回應: {responses}')

    # Step 4: 將三個回應合成一個最終答案
    synthesis_prompt = (
        "請將以下三個回應合成一個連貫且全面的回答。\n"
        f"回應1：{responses[0]}\n"
        f"回應2：{responses[1]}\n"
        f"回應3：{responses[2]}\n"
        "合成的回答："
    )

    synthesis_payload = {
        'model': 'command-xlarge-nightly',  # 請根據您的模型選擇
        'prompt': synthesis_prompt,
        'max_tokens': 150,
        'temperature': 0.7,
    }

    steps.append('Step 4: 發送合成請求到 Cohere API')
    synthesis_response = requests.post(COHERE_API_URL, headers=headers, json=synthesis_payload)

    if synthesis_response.status_code != 200:
        steps.append('Step 4: Cohere API 合成請求失敗。')
        return jsonify({'error': 'Failed to synthesize responses.', 'steps': steps}), 500

    synthesized_text = synthesis_response.json()['generations'][0]['text'].strip()
    steps.append(f'Step 4: 合成結果: "{synthesized_text}"')

    # Step 5: 將原始訊息和合成的回答新增到 context_window
    if 'context_window' not in session:
        session['context_window'] = []

    context_window = session['context_window']
    context_window.append({'role': 'user', 'content': user_message})
    context_window.append({'role': 'bot', 'content': synthesized_text})

    # 限制 context_window 的大小
    if len(context_window) > MAX_CONTEXT * 2:
        context_window = context_window[-MAX_CONTEXT * 2:]
    session['context_window'] = context_window

    steps.append('Step 5: 新增使用者訊息和合成回應到 context_window')

    # 回傳 synthesized_text、steps、index 和 prompt
    return jsonify({
        'response': synthesized_text,
        'steps': steps,
        'index': len(context_window)-1,
        'prompt': synthesis_prompt
    })

if __name__ == '__main__':
    app.run(debug=True, port=8888)
