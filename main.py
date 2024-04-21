import math
import os
import re
import time
import uuid
from flask import Flask, redirect, render_template, jsonify, request, send_file, session
from flask_session import Session
from flask_cors import CORS, cross_origin
from flask_socketio import SocketIO, emit, disconnect, join_room, leave_room, rooms
from flasgger import Swagger
from sql import DBHelper, db, User, Invite
from sqlalchemy.sql import text
from sqlalchemy import or_, and_, not_
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message

app = Flask(__name__, static_folder='./build', static_url_path='/')
app.config['MAIL_SERVER'] = 'smtp.yandex.ru'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = '@yandex.ru'  # введите свой адрес электронной почты здесь
app.config['MAIL_DEFAULT_SENDER'] = '@yandex.ru'  # и здесь
app.config['MAIL_PASSWORD'] = ''  # введите пароль

# Свои данные я не оставлю

app.config['CORS_HEADERS'] = 'Content-Type'
app.config['SECRET_KEY'] = 'secret!'
app.config['SESSION_TYPE'] = 'filesystem'
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
app.config["UPLOAD_FOLDER"] = "./build/"
ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "ppt", "pptx"]

Session(app)
db.init_app(app)
swagger = Swagger(app)

cors = CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app=app, cors_allowed_origins="*")
mail = Mail(app)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index_(path):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def not_found(e):
    return app.send_static_file('index.html')

@app.route('/teams', methods=['GET'])
def teams():
    if DBHelper.authToken(session['token']):
        return app.send_static_file('index.html')
    return redirect('/login')

@app.route('/team/<id>', methods=['GET'])
def team(id):
    if DBHelper.authToken(session['token']):
        return app.send_static_file('index.html')
    return redirect('/login')

# ОПАСНО! ! !
@app.route('/api/upload_cover', methods=['POST'])
def upload_cover():
    file = request.files['file']
    
    if file and allowed_file(file.filename):
        filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        return jsonify({'message': 'Обложка загружена', 'status': 1, 'result': filename})


@app.route('/api/team/cover/upload/<team_id>', methods=['POST'])
def upload_team_cover(team_id):
    if user := DBHelper.authToken(session['token']):
        file = request.files['file']
        
        if file and allowed_file(file.filename):
            filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            
            if user.team_id == int(team_id):
                DBHelper.updateTeam(DBHelper.getTeam(int(team_id)), cover=filename)
                return jsonify({'message': 'Обложка загружена', 'status': 1, 'result': filename})
    
        return jsonify({'message': 'Не удалось загрузить обложку', 'status': 0})

    return jsonify({'message': 'Не авторизован', 'status': 0})

@app.route('/api/team/solution/upload/<team_id>', methods=['POST'])
def upload_team_solution(team_id):
    if user := DBHelper.authToken(session['token']):
        file = request.files['file']
        
        if file and allowed_file(file.filename):
            filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            if user.team_id == int(team_id):
                DBHelper.updateTeam(DBHelper.getTeam(int(team_id)), solution=filename)
                return jsonify({'message': 'Презентация загружена', 'status': 1, 'result': filename})
    
        return jsonify({'message': 'Не удалось загрузить презентацию', 'status': 0})

    return jsonify({'message': 'Не авторизован', 'status': 0})

@app.route('/api/user/cover/upload/<user_id>', methods=['POST'])
def upload_user_cover(user_id):
    if user := DBHelper.authToken(session['token']):
        file = request.files['file']
        
        if file and allowed_file(file.filename):
            filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            if user.id == int(user_id):
                DBHelper.updateUser(user, cover=filename)
                return jsonify({'message': 'Обложка загружена', 'status': 1, 'result': filename})
    
        return jsonify({'message': 'Не удалось загрузить обложку', 'status': 0})

    return jsonify({'message': 'Не авторизован', 'status': 0})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index(path):
    return app.send_static_file('index.html')

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def auth_ws(session):
    if 'token' in session:
        return DBHelper.authToken(session['token'])

def auth_post(session):
    if 'token' in session:
        print('S', session)
        print(session['token'])
        return DBHelper.authToken(session['token'])

    
@app.route('/api/logout', methods=['POST'])
def logout() -> None :
    if user := DBHelper.authToken(session['token']):
        session['token'] = None
        DBHelper.deleteToken(user)

    return redirect('/login')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json

    if not('username' in data and 'password' in data):
        return jsonify({'message': 'Укажите логин и пароль', 'status': 0})

    username = data['username']
    password = data['password']

    print(username)
    
    token, _ = DBHelper.authUser(username, password)

    if token:
        session['token'] = token
        res = jsonify({'message': 'Успешный вход', 'status': 1, 'token': token})
        res.headers.add('Access-Control-Allow-Origin', '*')
        return res
    
    return jsonify({'message': 'Ошибка входа', 'status': 0})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json

    if not('username' in data and 'password' in data and 'role' in data and 'email' in data) or (
        len(data['username']) < 4 or len(data['password']) < 4 or data['role'] not in ['org', 'user']):
        return jsonify({'message': 'Укажите логин и пароль', 'status': 0})

    username = data['username']
    password = data['password']
    role = data['role']
    email = data['email']

    user = None

    if role == 'org':
        try:
            user = DBHelper.createUser(password, username, role, None, None, data['bio'], data['stack'], email)
            team = DBHelper.createTeam(data['team_name'], user, data['team_cover'])

            return jsonify({'message': 'Успешная регистрация', 'status': 1, 'team_id': team.id})
        except Exception as e:
            if user:
                DBHelper.deleteUser(user)

            return jsonify({'message': 'Ошибка регистрации', 'status': 0})

    else:
        user = DBHelper.createUser(password, username, role, None, None, data['bio'], data['stack'], email)

    if user:
        return jsonify({'message': 'Успешная регистрация', 'status': 1})
    else:
        return jsonify({'message': 'Ошибка регистрации', 'status': 0})

# API route to get all teams
@app.route('/api/teams/get', methods=['GET', 'POST'])
def get_teams():
    return jsonify(DBHelper.getDetailedTeams(DBHelper.getTeams()))

@app.route('/api/teams/get/<team_id>', methods=['GET', 'POST'])
def get_team(team_id):
    return jsonify(DBHelper.getDetailedTeam(DBHelper.getTeam(int(team_id))))

@app.route('/api/user/get', methods=['GET', 'POST'])
def get_user():
    try:
        if user := DBHelper.authToken(session['token']):
            return jsonify(DBHelper.getDetailedUser(user))
    except Exception as e:
        return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/user/get/<user_id>', methods=['GET', 'POST'])
def get_user_by_id(user_id):
    user = DBHelper.getUser(user_id)

    if user:
        return jsonify({'user': DBHelper.getDetailedUser(user), 'status': 1, 'message': 'Пользователь найден'})

    return jsonify({'message': 'Пользователь не найден', 'status': 0})

@app.route('/api/user/edit', methods=['POST'])
def edit_user():
    if user := DBHelper.authToken(session['token']):
        data = request.json

        if not('bio' in data or 'stack' in data or 'cover' in data):
            return jsonify({'message': 'Укажите хотя бы один параметр', 'status': 0})
        
        if 'bio' in data:
            DBHelper.updateUser(user, bio=data['bio'])
        
        if 'stack' in data:
            DBHelper.updateUser(user, stack=data['stack'])
        
        if 'cover' in data:
            DBHelper.updateUser(user, cover=data['cover'])

        return jsonify({'message': 'Успешное изменение', 'status': 1})
    
    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/kick/<user_id>', methods=['GET', 'POST'])
def delete_team(user_id):
    if user := DBHelper.authToken(session['token']):
        team = DBHelper.getTeam(user.team_id)

        if not team:
            return jsonify({'message': 'Команда не найдена', 'status': 0})
        
        if team.cap != user.id:
            return jsonify({'message': 'Вы не капитан команды', 'status': 0})

        if user.id == user_id:
            return jsonify({'message': 'Вы не можете кикнуть себя!!!!!!!', 'status': 0})
        
        DBHelper.removeFromTeam(team.id, DBHelper.getUser(user_id))
    
        return jsonify({'message': 'Пользователь был удалён из команды', 'status': 1})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/exit/', methods=['GET', 'POST'])
def exit_team():
    if user := DBHelper.authToken(session['token']):
        team = DBHelper.getTeam(user.team_id)

        if not team:
            return jsonify({'message': 'Вы не в команде', 'status': 0})
        
        DBHelper.removeFromTeam(team.id,  user)
    
        return jsonify({'message': 'Вы вышли из команды', 'status': 1})

    return jsonify({'message': 'Неавторизован', 'status': 0})


@app.route('/api/team/edit', methods=['POST'])
def edit_team():
    if user := DBHelper.authToken(session['token']):
        data = request.json

        if not('name' in data or 'cover' in data):
            return jsonify({'message': 'Укажите хотя бы один параметр', 'status': 0})
        
        status = True
        
        if 'name' in data:
            status = status & DBHelper.updateTeam(user, name=data['name'])
        
        if 'cover' in data:
            status = status & DBHelper.updateTeam(user, cover=data['cover'])

        if status:
            return jsonify({'message': 'Успешное изменение', 'status': 1})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/users/getForInvites', methods=['GET', 'POST'])
def get_users_for_invites():
    if user := DBHelper.authToken(session['token']):
        query = ""

        if request.method == 'GET':
            data = request.args
            query = data.get('query')

        if request.method == 'POST':
            data = request.json
            query = data['query']

        return jsonify(DBHelper.getDetailedUsers(DBHelper.getUsersForInvite(query)))

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/invite_many/', methods=['POST'])
def invites():
    if user := DBHelper.authToken(session['token']):
        if not user.team_id:
            return jsonify({'message': 'Вы не в команде', 'status': 0})
        
        team = DBHelper.getTeam(user.team_id)
        
        if not team or team.cap != user.id:
            return jsonify({'message': 'Вы не капитан команды', 'status': 0})
        
        if len(team.users) > 5:
            return jsonify({'message': 'Команда заполнена', 'status': 0})
        
        data = request.json

        if not 'users' in data:
            return jsonify({'message': 'Передайте список пользователей', 'status': 0})

        for user_id in data['users']:
            user = DBHelper.getUser(user_id)

            if user:
                if user.team_id:
                    return jsonify({'message': 'Пользователь уже в команде', 'status': 0})
                
                DBHelper.createInvite(team.id, user_id)
            
                return jsonify({'message': 'Успешное приглашение', 'status': 1})

        return jsonify({'message': 'Пользователи не найдены', 'status': 0})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/invite/<user_id>', methods=['POST'])
def invite(user_id):
    if user := DBHelper.authToken(session['token']):
        if not user.team_id:
            return jsonify({'message': 'Вы не в команде', 'status': 0})
        
        team = DBHelper.getTeam(user.team_id)
        
        if not team or team.cap != user.id:
            return jsonify({'message': 'Вы не капитан команды', 'status': 0})
        
        if len(team.users) > 5:
            return jsonify({'message': 'Команда заполнена', 'status': 0})
        
        user = DBHelper.getUser(user_id)

        if user:
            if user.team_id:
                return jsonify({'message': 'Пользователь уже в команде', 'status': 0})
            
            DBHelper.createInvite(team.id, user_id)
        
            return jsonify({'message': 'Успешное приглашение', 'status': 1})

        return jsonify({'message': 'Пользователь не найден', 'status': 0})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/invite/accept/<invite_id>', methods=['POST'])
def accept_invite(invite_id):
    if user := DBHelper.authToken(session['token']):
        if user.team_id:
            return jsonify({'message': 'Вы уже в команде', 'status': 0})

        invite = DBHelper.getInvite(invite_id)
        print(invite.id, invite.user_id, user.id)

        if user.id == int(invite.user_id):
            DBHelper.acceptInvite(int(invite_id))
        
            return jsonify({'message': 'Успешное приглашение', 'status': 1})

        return jsonify({'message': 'Вы не можете принять приглашение', 'status': 0})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/invite/reject/<invite_id>', methods=['POST'])
def reject_invite(invite_id):
    if user := DBHelper.authToken(session['token']):
        if user.team_id:
            return jsonify({'message': 'Вы уже в команде', 'status': 0})
        
        invite = DBHelper.getInvite(invite_id)

        if not invite:
            return jsonify({'message': 'Приглашение не найдено', 'status': 0})

        if user.id == invite.user_id:
            DBHelper.deleteInvite(int(invite_id))

            return jsonify({'message': 'Приглашение отклонено', 'status': 1})

        return jsonify({'message': 'Вы не можете отклонить приглашение', 'status': 0})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/user/invite/get', methods=['GET', 'POST'])
def get_invites():
    if user := DBHelper.authToken(session['token']):
        return jsonify(DBHelper.getDetailedInvites(DBHelper.getInvites(user)))

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/invite/get/<team_id>', methods=['GET', 'POST'])
def get_invites_team(team_id):
    if user := DBHelper.authToken(session['token']):
        if not user.team_id or user.team_id != int(team_id):
            return jsonify({'message': 'Вы не в команде', 'status': 0})
        
        return jsonify(DBHelper.getDetailedInvites(DBHelper.getInvitesTeam(int(team_id))))

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/invite/delete/<invite_id>', methods=['POST'])
def delete_invite(invite_id):
    if user := DBHelper.authToken(session['token']):
        invite = DBHelper.getInvite(invite_id)

        if not invite:
            return jsonify({'message': 'Приглашение не найдено', 'status': 0})
        
        if user.team_id == invite.team_id and user.id == DBHelper.getTeam(invite.team_id).cap:
            DBHelper.deleteInvite(int(invite_id))

            return jsonify({'message': 'Приглашение удалено', 'status': 1})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/questions/get/<team_id>', methods=['GET', 'POST'])
def get_questions(team_id):
    return jsonify(DBHelper.getDetailedQuestions(DBHelper.getQuestions(int(team_id))))

@app.route('/api/team/questions/create/<team_id>', methods=['POST'])
def create_question(team_id):
    if user := DBHelper.authToken(session['token']):
        data = request.json

        if user.team_id == team_id:
            return jsonify({'message': 'Вы не можете создавать вопрос своей команде', 'status': 1})
        
        question = DBHelper.createQuestion(data['text'], team_id, user.id, data['user_id'], data['FIO'])

        if question:
            try:
                msg = Message("Вопрос на сайте хакатона", recipients=[DBHelper.getUser(question.user_id).email])
                msg.html = f"<h2>{question.owner_FIO} задал вам вопрос</h2>\n<p>{question.text}</p>"
                mail.send(msg)
            except Exception as e:
                print(e)
            finally:
                return jsonify({'message': 'Вопрос создан', 'status': 1})
        
        return jsonify({'message': 'Не удалось создать вопрос', 'status': 0})
    
    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/questions/delete/<question_id>', methods=['POST'])
def delete_question(question_id):
    if user := DBHelper.authToken(session['token']):
        question = DBHelper.getQuestion(question_id)

        if not question:
            return jsonify({'message': 'Вопрос не найден', 'status': 0})
        
        if user.id == question.owner_id:
            DBHelper.deleteQuestion(question_id)
        
            return jsonify({'message': 'Вопрос удален', 'status': 1})
        
        return jsonify({'message': 'Вы не можете удалить вопрос', 'status': 0})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/questions/answer/<question_id>', methods=['POST'])
def answer_question(question_id):
    if user := DBHelper.authToken(session['token']):
        data = request.json

        question = DBHelper.getQuestion(question_id)

        if not question:
            return jsonify({'message': 'Вопрос не найден', 'status': 0})
        
        if user.id == question.owner_id:
            return jsonify({'message': 'Вы не можете отвечать на свои вопросы', 'status': 0})
    
        DBHelper.answerQuestion(question, data['text'], question_id)

        return jsonify({'message': 'Ответ записан', 'status': 1})

    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/team/questions/get/<question_id>', methods=['GET', 'POST'])
def get_question(question_id):
    return jsonify(DBHelper.getDetailedQuestion(DBHelper.getQuestion(question_id)))

@app.route('/api/team/rates/get/<team_id>', methods=['GET', 'POST'])
def get_rates(team_id):
    return jsonify(DBHelper.getDetailedRates(DBHelper.getRates(team_id=team_id)))

@app.route('/api/team/rates/create/<team_id>', methods=['POST'])
def create_rate(team_id):
    if user := DBHelper.authToken(session['token']):
        data = request.json

        if user.team_id == team_id:
            return jsonify({'message': 'Вы не можете оценивать свою команду', 'status': 1})
        
        rate = DBHelper.createRate(user_id=user.id, **data)
    
        if rate:
            return jsonify({'message': 'Оценка создана', 'status': 1})
    
    return jsonify({'message': 'Неавторизован', 'status': 0})

@app.route('/api/teams/top/', methods=['GET', 'POST'])
def get_top():
    query = ""

    if request.method == 'GET':
        data = request.args
        query = data.get('query')

    if request.method == 'POST':
        data = request.json
        query = data['query']

    return jsonify(DBHelper.getDetailedTeams(DBHelper.getTeamTopByRate(query), with_index=True))

@app.route('/api/teams/solution/get/<team_id>', methods=['GET', 'POST'])
def get_team_solution(team_id):
    filename = DBHelper.getTeam(int(team_id)).solution
    return filename

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
    app.run(host="0.0.0.0", port=443, ssl_context=("./certificate.crt", "./privatkey.pem"))