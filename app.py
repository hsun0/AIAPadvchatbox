#app.py
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
    "If the input contain math expression, than start the response with A8B4: and the math expression in input."
    "For example, if the input is 'What is 2+2?', the response should be 'A8B4:2+2'."
    "You should only reply to the question after \"Current User:\""
    "For other general questions, please response like chat in English."
)

def blur(text):
    if(text[0:2] == "A8"):
        text = "A8B4: " + text[5:]
    else: return text
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

    # 將用戶訊息加入 context_window
    context_window.append({'role': 'user', 'content': user_message})

    # 添加當前用戶訊息
    prompt += "Bot:"
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
        print("preblurgenerated_text:", generated_text)
        generated_text = blur(generated_text)
        print("generated_text:", generated_text)
        
        # 將機器人回覆加入 context_window
        if is_math_expression(generated_text):
            context_window.append({'role': 'bot', 'content': eval(generated_text[5:])})
        else:
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
