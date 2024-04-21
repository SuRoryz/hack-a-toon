from json import loads, dumps
import sqlite3
import random
import uuid
import time

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Boolean, event, func
from sqlalchemy.orm.session import sessionmaker
from sqlalchemy.types import Float
from sqlalchemy_events import listen_events, on
from sqlalchemy import or_, and_

from datetime import datetime

import more_itertools as mit

from flask_socketio import SocketIO, emit

class Base(DeclarativeBase):
  pass

db = SQLAlchemy(model_class=Base)

class User(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default='user', nullable=False)

    cover: Mapped[str] = mapped_column(String, nullable=True, default='placeholder_user.jpg')

    bio: Mapped[str] = mapped_column(String, nullable=True)
    stack: Mapped[str] = mapped_column(String, nullable=True)

    email: Mapped[str] = mapped_column(String, nullable=False)
    telegram: Mapped[str] = mapped_column(String, nullable=True)

    team_id: Mapped[int] = db.Column(db.Integer, db.ForeignKey('team.id'))

class AuthToken(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    user_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)
    user: Mapped['User'] = db.relationship('User')

class Invite(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    team_id: Mapped[int] = db.Column(Integer, db.ForeignKey('team.id'), nullable=False)
    user_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)

    owner_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Team(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    cap: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=True)
    users: Mapped[list['User']] = db.relationship('User', backref='team', foreign_keys='User.team_id')

    design_score: Mapped[int] = mapped_column(Float, default=0.0)
    usable_score: Mapped[int] = mapped_column(Float, default=0.0)
    imposition_score: Mapped[int] = mapped_column(Float, default=0.0)
    realization_score: Mapped[int] = mapped_column(Float, default=0.0)

    total_score = db.Column(Float, default=0.0)
    solution = db.Column(String, nullable=True)

    cover: Mapped[str] = mapped_column(String, nullable=True, default='placeholder_team.jpg')

    def addUser(self, user=None, user_id=None):
        if not user:
            user = User.query.get(user_id)

        user.team_id = self.id
        db.session.commit()
    
    def removeUser(self, user=None, user_id=None):
        if not user:
            user = User.query.get(user_id)
        
        user.team_id = None
        Question.query.filter_by(user_id=user.id).delete()

        db.session.commit()

class Question(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    text: Mapped[str] = mapped_column(String, nullable=False)
    answer: Mapped[str] = mapped_column(String, nullable=True)

    owner_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)
    owner_FIO: Mapped[str] = mapped_column(String, nullable=False)

    team_id: Mapped[int] = db.Column(Integer, db.ForeignKey('team.id'), nullable=False)
    user_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=True)

    answered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Rate(db.Model):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = db.Column(Integer, db.ForeignKey('user.id'), nullable=False)
    team_id: Mapped[int] = db.Column(Integer, db.ForeignKey('team.id'), nullable=False)

    design_score: Mapped[int] = mapped_column(Integer, nullable=False)
    usable_score: Mapped[int] = mapped_column(Integer, nullable=False)
    imposition_score: Mapped[int] = mapped_column(Integer, nullable=False)
    realization_score: Mapped[int] = mapped_column(Integer, nullable=False)

    total_score: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

@event.listens_for(Rate, "after_insert")
def updateRate(mapper, connection, target):
    object = target

    session = sessionmaker(bind=connection)()

    session.query(Rate).filter(Rate.id==object.id).update({'total_score': object.design_score + object.usable_score + object.imposition_score + object.realization_score})
    
    session.query(Team).filter(Team.id==int(object.team_id)).update({'total_score': Team.total_score + object.total_score})

    print(object.design_score + object.usable_score + object.imposition_score + object.realization_score, session.query(Team).filter(Team.id==int(object.team_id)).first().total_score)

    session.query(Team).filter(Team.id==int(object.team_id)).update({'design_score': Team.design_score + object.design_score})
    session.query(Team).filter(Team.id==int(object.team_id)).update({'usable_score': Team.usable_score + object.usable_score})
    session.query(Team).filter(Team.id==int(object.team_id)).update({'imposition_score': Team.imposition_score + object.imposition_score})
    session.query(Team).filter(Team.id==int(object.team_id)).update({'realization_score': Team.realization_score + object.realization_score})

    session.commit()


class DBHelper:
    db = db

    ### Deatiled getters ###

    @classmethod
    def getDetailedUser(cls, user, user_id=None):
        if not user or type(user) == int:
            if user_id:
                user = cls.db.session.query(User).filter_by(id=user_id).first()
            else:
                user = cls.db.session.query(User).filter_by(id=user).first()

        if not user:
            return {}
        
        return {"username": user.username, 'bio': user.bio, 'stack': user.stack, 'team_id': user.team_id, "role": user.role, "cover": user.cover, "id": user.id, 'ratedTeamsIds': [r.team_id for r in Rate.query.filter_by(user_id=user.id).with_entities(Rate.team_id).all()]}

    @classmethod
    def getDetailedUsers(cls, user):
        return [cls.getDetailedUser(u) for u in user]
    
    @classmethod
    def getDetailedTeam(cls, team, team_id=None, with_index=False):
        if not team or type(team) == int:
            if team_id:
                team = cls.db.session.query(Team).filter_by(id=team_id).first()
            else:
                team = cls.db.session.query(Team).filter_by(id=team).first()

        if not team:
            return {}
        
        return {"index": team.index if with_index else None, "name": team.name, "cap": team.cap, "id": team.id, "cover": team.cover, "users": cls.getDetailedUsers(team.users) if not with_index else [], 'votedByTimes': Rate.query.filter_by(team_id=team.id).count(),
                "total_score": team.total_score, "design_score": team.design_score, "usable_score": team.usable_score, "imposition_score": team.imposition_score, "realization_score": team.realization_score}
    
    @classmethod
    def getDetailedTeams(cls, teams, with_index=False):
        return [cls.getDetailedTeam(t, with_index=with_index) for t in teams]
    
    @classmethod
    def getDetailedQuestion(cls, question, question_id=None):
        if not question or type(question) == int:
            if question_id:
                question = cls.db.session.query(Question).filter_by(id=question_id).first()
            else:
                question = cls.db.session.query(Question).filter_by(id=question).first()

        return {"id": question.id, 'answer': question.answer, 'answered': question.answered, 'owner_FIO': question.owner_FIO, "text": question.text, "answer": question.answer, "created_at": question.created_at.strftime("%Y-%m-%d %H:%M:%S"), 'owner': cls.getDetailedUser(question.owner_id), 'user': cls.getDetailedUser(question.user_id)}
    
    @classmethod
    def getDetailedQuestions(cls, questions):
        return [cls.getDetailedQuestion(question) for question in questions] 
    
    @classmethod
    def getDetailedInvite(cls, invite, invite_id=None):
        if not invite or type(invite) == int:
            if invite_id:
                invite = cls.db.session.query(Invite).filter_by(id=invite_id).first()
            else:
                invite = cls.db.session.query(Invite).filter_by(id=invite).first()

        if not invite:
            return {}
        
        return {"id": invite.id, "team_id": invite.team_id, 'created_at': invite.created_at.strftime("%H:%M:%S"), "user_id": invite.user_id, "user": cls.getDetailedUser(invite.user_id), "team": cls.getDetailedTeam(invite.team_id)}
    
    @classmethod
    def getDetailedInvites(cls, invites):
        return [cls.getDetailedInvite(i) for i in invites]

    @classmethod
    def getDetailedRate(cls, rate, rate_id=None):
        if not rate or type(rate) == int:
            rate = cls.db.session.query(Rate).filter_by(id=rate_id).first()

        if not rate:
            return {}
        
        return {"team_id": rate.team_id, "user_id": rate.user_id, "design_score": rate.design_score, "usable_score": rate.usable_score, "imposition_score": rate.imposition_score, "realization_score": rate.realization_score, "total_score": rate.total_score}
    
    @classmethod
    def getDetailedRates(cls, rates):
        return [cls.getDetailedRate(r) for r in rates]

    # Auth
    @classmethod
    def authToken(cls, token):
        token = cls.db.session.query(AuthToken).filter_by(token=token).first()

        if not token:
            return False
        
        if datetime.timestamp(token.created_at) + 3600 > int(time.time()):
            db.session.delete(token)
            db.session.commit()
            return None
        
        return token.user
    
    @classmethod
    def deleteToken(cls, user):
        cls.db.session.query(AuthToken).filter_by(user_id=user.id).delete()
        cls.db.session.commit()

        return True

    @classmethod
    def authUser(cls, username, password):
        user = User.query.filter(func.lower(User.username) == username.lower()).first()

        print(user.password, password)

        if user and user.password == password:
            token = str(uuid.uuid4())
            cls.db.session.add(AuthToken(token=token, user_id=user.id))
            cls.db.session.commit()
            return token, user.id
        
        return None, None
    
    # User

    @classmethod
    def createUser(cls, password, username, role, cover, team_id=None, bio=None, stack=None, email=None):
        try:
            user = User(username=username, password=password, role=role, cover=cover, team_id=team_id, bio=bio, stack=stack, email=email)

            cls.db.session.add(user)
            cls.db.session.commit()
        except Exception as e:
            print(e)
            return False

        return user
    
    @classmethod
    def deleteUser(cls, user, user_id=None):
        if not user or type(user) == int:
            user = cls.db.session.query(User).filter_by(id=user_id).first()
        
        cls.db.session.query(User).filter_by(id=user.id).delete()
        cls.db.session.commit()

        return True
    
    @classmethod
    def getUser(cls, user_id):
        return cls.db.session.query(User).filter_by(id=user_id).first()
    
    @classmethod
    def updateUser(cls, user, **kwargs):
        for k, v in kwargs.items():
            print(k, v)
            setattr(user, k, v)

        cls.db.session.commit()

        return user
    
    # Team

    @classmethod
    def createTeam(cls, name, cap, cover):
        try:
            team = Team(name=name, cap=cap.id, cover=cover)
            cap.team_id = team.id

            team.users.append(cap)

            cls.db.session.add(team)
            cls.db.session.commit()
        except:
            return False

        return team
    
    @classmethod
    def deleteTeam(cls, team):
        User.query.filter_by(team_id=team.id).update({User.team_id: None})
        Question.query.filter_by(team_id=team.id).delete()
        Rate.query.filter_by(team_id=team.id).delete()

        cls.db.session.query(Team).filter_by(id=team.id).delete()
        cls.db.session.commit()

        return team
    
    @classmethod
    def addToTeam(cls, team, user):
        team = cls.db.session.query(Team).filter_by(id=team).first()

        if type(user) == list:
            for u in user:
                if u != team.cap and u not in team.users:
                    team.addUser(User.query.filter_by(id=u).first())
        else:
            if user.id != team.cap and User.query.filter(Team.users.any(id=user.id)).first() is None:
                team.addUser(user)
            
        return True
    
    @classmethod
    def removeFromTeam(cls, team, user):
        team = cls.db.session.query(Team).filter_by(id=team).first()

        if type(user) == list:
            for u in user:
                if u in team.users:
                    team.removeUser(User.query.filter_by(id=u).first())
        else:
            if user in team.users:
                team.removeUser(user)
        
        return True
    
    @classmethod
    def getTeam(cls, team, team_id=None):
        if type(team) != int:
            team_id = team.id
        else:
            team_id = team

        return cls.db.session.query(Team).filter_by(id=team_id).first()

    @classmethod
    def getTeams(cls):
        return cls.db.session.query(Team).all()

    @classmethod
    def updateTeam(cls, team, **kwargs):
        cls.__updateTeam(team, **kwargs)
    
    @classmethod
    def __updateTeam(cls, team, **kwargs):
        for k, v in kwargs.items():
            setattr(team, k, v)
        
        cls.db.session.commit()

        return team
    
    # Invite
    
    @classmethod
    def createInvite(cls, team, user):
        Invite.query.filter_by(team_id=team, user_id=user).delete()

        invite = Invite(team_id=team, user_id=user, owner_id=user)
        cls.db.session.add(invite)
        cls.db.session.commit()

        return invite
    
    @classmethod
    def deleteInvite(cls, invite, invite_id=None):
        print(invite, invite_id)
        if not invite or type(invite) == int:
            if invite_id:
                invite = Invite.query.filter(Invite.id.in_((invite_id, str(invite_id)))).first()
            else:
                invite = Invite.query.filter(Invite.id.in_((invite, str(invite)))).first()
        
        db.session.delete(invite)
        cls.db.session.commit()

        return True
    
    @classmethod
    def getInvites(cls, user, user_id=None):
        if not user or type(user) == int:
            if user_id:
                user = cls.db.session.query(User).filter_by(id=user_id).first()
            else:
                user = cls.db.session.query(User).filter_by(id=user).first()

        return cls.db.session.query(Invite).filter_by(user_id=user.id).all()
    
    @classmethod
    def getInvitesTeam(cls, team, team_id=None):
        if not team or type(team) == int:
            if team_id:
                user = cls.db.session.query(User).filter_by(id=team_id).first()
            else:
                team = cls.db.session.query(User).filter_by(id=team).first()

        return cls.db.session.query(Invite).filter_by(team_id=team.id).all()
    
    @classmethod
    def getInvite(cls, invite_id):
        invite = cls.db.session.query(Invite).filter_by(id=invite_id).first()
        
        return invite
    
    @classmethod
    def acceptInvite(cls, invite, invite_id=None):
        if not invite or type(invite) == int:
            if invite_id:
                invite = cls.db.session.query(Invite).filter_by(id=invite_id).first()
            else:
                invite = cls.db.session.query(Invite).filter_by(id=invite).first()

        User.query.filter_by(id=invite.user_id).update({User.team_id: invite.team_id})

        cls.deleteInvite(invite)
        cls.db.session.commit()

        return True

    # Question

    @classmethod
    def createQuestion(cls, text, team, owner, user, FIO):
        question = Question(text=text, team_id=team, owner_id=owner, user_id=user, owner_FIO=FIO)
        cls.db.session.add(question)
        cls.db.session.commit()

        return question
    
    @classmethod
    def answerQuestion(cls, question, answer, question_id=None):
        if not question or type(question) == int:
            question = cls.db.session.query(Question).filter_by(id=question_id).first()
        
        question.answer = answer
        question.answered = True

        cls.db.session.commit()

        return True
    
    @classmethod
    def deleteQuestion(cls, question, question_id=None):
        if not question or type(question) == int:
            question = cls.db.session.query(Question).filter_by(id=question_id).first()
        
        question.delete()
        cls.db.session.commit()

        return True

    @classmethod
    def getQuestions(cls, team_id):
        return cls.db.session.query(Question).filter_by(team_id=team_id).all()

    @classmethod
    def getQuestion(cls, question_id):
        question = cls.db.session.query(Question).filter_by(id=question_id).first()
        
        return question

    # Rate

    @classmethod
    def createRate(cls, team_id, user_id, **kwargs):
        rate = Rate(team_id=team_id, user_id=user_id, **kwargs)
        cls.db.session.add(rate)
        cls.db.session.commit()

        return rate
    
    @classmethod
    def getRates(cls, team, team_id=None):
        if not team or type(team) == int:
            team = cls.db.session.query(Team).filter_by(id=team_id).first()

        return cls.db.session.query(Rate).filter_by(team_id=team.id).all()
    
    def getRate(cls, rate_id):
        rate = cls.db.session.query(Rate).filter_by(id=rate_id).first()
        
        return rate
    
    @classmethod
    def getTeamTopByRate(cls, query=""):
        if not query:
            query = ""

        rank_subquery = (
            db.session.query(
                func.rank().over(order_by=Team.total_score.desc()).label('index'),
                Team.id
            )
            .subquery()
        )

        teams = (
                db.session.query(Team, rank_subquery.c.index)
                .outerjoin(rank_subquery, Team.id == rank_subquery.c.id)
                .filter(Team.name.contains(query))
                .order_by(Team.total_score.desc())
            ).add_columns(
                    Team.id, Team.name, Team.total_score, Team.usable_score,
                    Team.design_score, Team.imposition_score, Team.realization_score, Team.cap,
                    Team.cover
            ).all()

        return teams
    
    @classmethod
    def getUsersForInvite(cls, query=""):
        return cls.db.session.query(User).filter(and_(User.team_id == None, User.username.contains(query))).all()

    @classmethod
    def getTeamSolutions(cls, team):
        return cls.getTeam(team).solution
    


    
    
    


    
            