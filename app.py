import os
import shutil
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
    "If the input contain math expression, than start the response with A8B4."
    "For example, if the input is 'What is 2+2?', the response should be 'A8B4The answer is 4.'"
    "For other questions, you can answer them directly with English."
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message')

    if 'context_window' not in session:
        session['context_window'] = []

    context_window = session['context_window']

    # 將用戶訊息加入 context_window
    context_window.append({'role': 'user', 'content': user_message})
    print("context_window:", context_window)

    # 構建 prompt，包含 default_prompt 和所有的對話歷史
    prompt = DEFAULT_PROMPT + "\n\n"
    for exchange in context_window:
        if exchange['role'] == 'user':
            prompt += f"用戶: {exchange['content']}\n"
        elif exchange['role'] == 'bot':
            prompt += f"機器人: {exchange['content']}\n"

    # 添加當前用戶訊息
    prompt += "機器人:"

    headers = {
        'Authorization': f'Bearer {COHERE_API_KEY}',
        'Content-Type': 'application/json',
    }

    payload = {
        'model': 'command-xlarge-nightly',
        'prompt': prompt,
        'max_tokens': 150,
        'temperature': 0.7,
    }

    response = requests.post(COHERE_API_URL, headers=headers, json=payload)

    if response.status_code == 200:
        generated_text = response.json()['generations'][0]['text'].strip()
        # 將機器人回覆加入 context_window
        context_window.append({'role': 'bot', 'content': generated_text})

        # 限制 context_window 的大小
        if len(context_window) > MAX_CONTEXT * 2:
            # 移除最早的一組對話
            context_window = context_window[-MAX_CONTEXT * 2:]
            session['context_window'] = context_window

        return jsonify({'response': generated_text})
    else:
        return jsonify({'response': '抱歉，我無法處理您的請求。'}), 500

@app.route('/api/clear', methods=['POST'])
def clear():
    session.pop('context_window', None)
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(debug=True, port=8888)
