import { useNavigate, useParams } from "react-router-dom";
import { Container, Content, Header, Tabs, Modal, Button, Schema, useToaster, toaster, Message, Tooltip, CheckPicker, Input, Form, InlineEdit, Panel, IconButton, Whisper, Uploader } from 'rsuite';
import { useEffect, useState, createRef, forwardRef } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import { socket } from '../socket_context/sockets'
import PlusIcon from '@rsuite/icons/Plus';
import SpinnerIcon from '@rsuite/icons/legacy/Spinner';
import SearchIcon from '@rsuite/icons/Search';
import ArrowRightIcon from '@rsuite/icons/ArrowRight';

import { useMediaQuery } from 'rsuite';

import Navbar from "./navbar.tsx";
import Navside from "./sidenav.tsx";
import Tab from "rsuite/esm/Tabs/Tab";


import ExitIcon from '@rsuite/icons/Exit';

export default function Team() {
    const n = useNavigate();

    const statusToType = {
        1: 'success',
        0: 'error',
        2: 'warning',
      }

    const [isDark, isLandscape] = useMediaQuery([
    '(prefers-color-scheme: dark)',
    '(orientation:landscape)'
    ]);

    const toaster = useToaster();
    const params = useParams();

    const [currentUser, setCurrentUser] = useState({});
    const [team, setTeam] = useState([]);
    const [questions, setQuestions] = useState([]);

    const [teamLoading, setTeamLoading] = useState(false);
    const [questionsLoading, setQuestionsLoading] = useState(false);

    const [activeTab, setActiveTab] = useState(0);

    const [formQuestion, setFormQuestion] = useState({
        FIO: "",
        text: "",
        user_id: "",
    })
    const [formAnswer, setFormAnswer] = useState({
        text: "",
    })

    const formRef = createRef();
    const formAnswerRef = createRef();

    const { StringType } = Schema.Types;
    const model = Schema.Model({
        FIO: StringType().isRequired('Это поле обязательно').minLength(3, 'Минимальная длина 3 символа').maxLength(30, 'Максимальная длина 30 символов'),
        text: StringType().isRequired('Это поле обязательно').maxLength(300, 'Максимальная длина 300 символов'),
      });

    const modelAnswer = Schema.Model({
        text: StringType().isRequired('Это поле обязательно').maxLength(300, 'Максимальная длина 300 символов'),
    })

    const [formMe, setFormMe] = useState({
        bio: "",
        cover: "",
        stack: ""
    });

    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const [answerOpen, setAnswerOpen] = useState(false);
    const handleAnswerOpen = () => setAnswerOpen(true);
    const handleAnswerClose = () => setAnswerOpen(false);

    const [inviteOpen, setInviteOpen] = useState(false);
    const handleInviteOpen = () => setInviteOpen(true);
    const handleInviteClose = () => setInviteOpen(false);

    const [inviteUsers, setInviteUsers] = useState([]);
    const [inviteUsersLoading, setInviteUsersLoading] = useState(false);
    const [inviteUserQuery, setInviteUserQuery] = useState("")
    const [userToCover, setUserToCover] = useState({});

    const [inviteForm, setInviteForm] = useState({
        users: []
    })

    const [signal, setSignal] = useState(0);

    const updateMe = () => {
        fetch('https://benzovoz-team.ru/api/user/edit', {credentials: "include", method: "POST", body: JSON.stringify(formMe), headers: {"Content-Type": "application/json"}}).then(data => data.json()).then(data => {
            getCurrentUser();
        })
    }

    const exitTeam = () => {
        fetch('https://benzovoz-team.ru/api/team/exit', {credentials: "include", method: "POST"}).then(data => data.json()).then(data => {
            if ('status' in data && 'message' in data) {
                toaster.push(
                    <Message showIcon type={statusToType[data.status]}>
                        {data.message}
                    </Message>,
                    { placement: 'bottomEnd'}
                )
                n('/');
            }
        })
    }

    const kickUser = (id) => {
        fetch('https://benzovoz-team.ru/api/team/kick/' + id, {credentials: "include", method: "POST"}).then(data => data.json()).then(data => {
            if ('status' in data && 'message' in data) {
                toaster.push(
                    <Message showIcon type={statusToType[data.status]}>
                        {data.message}
                    </Message>,
                    { placement: 'bottomEnd'}
                )
                getTeam();
                setActiveTab(0);
            }
        })
    }

    const sendInvite = () => {
        fetch('https://benzovoz-team.ru/api/team/invite_many', {
            body: JSON.stringify(inviteForm),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST"
        }).then(data => data.status == 200 ? data.json() : null).then(
            data => {
                if ('status' in data && 'message' in data) {
                    toaster.push(
                        <Message showIcon type={statusToType[data.status]}>
                            {data.message}
                        </Message>,
                        { placement: 'bottomEnd'}
                    );
                    setSignal(1);
                }
            }
        )
    }

    const updateData = () => {
        setInviteUsersLoading(true);

        fetch('https://benzovoz-team.ru/api/users/getForInvites?query=' + inviteUserQuery, {credentials: "include"}).then(data => data.json()).then(data => {
            setInviteUsers(data.map(user => ({value: user.id, label: user.username})));
            
            let b = {};
            data.map(user => b[user.username] = user.cover);
            console.log(b)

            setUserToCover(b);
            setInviteUsersLoading(false);
        })
    };

    const getCurrentUser = (data) => {
        fetch('https://benzovoz-team.ru/api/user/get').then(data => data.json()).then(data => {
            if (data) {
                setCurrentUser(data);
                setFormMe({
                    bio: data.bio ? data.bio : "",
                    cover: data.cover,
                    stack: data.stack ? data.stack : ""
                })
            }
        })
    }

    const getQuestions = (data) => {
        setQuestionsLoading(true);
        fetch('https://benzovoz-team.ru/api/team/questions/get/' + params.id).then(data => data.json()).then(data => {
            setQuestionsLoading(false);
            setQuestions(data)
        })
    }

    const askQuestion = () => {
        fetch('https://benzovoz-team.ru/api/team/questions/create/' + params.id, {
            credentials: 'include',
            body: JSON.stringify(formQuestion),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST"
        }).then(data => data.status == 200 ? data.json() : null).then(
            data => {
                if ('status' in data && 'message' in data) {
                    toaster.push(
                        <Message showIcon type={statusToType[data.status]}>
                            {data.message}
                        </Message>,
                        { placement: 'bottomEnd'}
                    );
                    getQuestions();
                }
            }
        )
    }

    const answerQuestion = () => {
        fetch('https://benzovoz-team.ru/api/team/questions/answer/' + formAnswer.id, {
            credentials: 'include',
            body: JSON.stringify(formAnswer),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST"
        }).then(data => data.status == 200 ? data.json() : null).then(
            data => {
                if ('status' in data && 'message' in data) {
                    toaster.push(
                        <Message showIcon type={statusToType[data.status]}>
                            {data.message}
                        </Message>,
                        { placement: 'bottomEnd'}
                    );
                    getQuestions();
                }
            }
        )
    }

    const getTeam = (data) => {
        setTeamLoading(true);
        fetch('https://benzovoz-team.ru/api/teams/get/' + params.id).then(data => data.json()).then(data => {
            setTeamLoading(false);
            setTeam(data);
        })
    }

    const renderMenu = menu => {
        if (inviteUsersLoading) {
        return (
            <p style={{ padding: 4, color: '#999', textAlign: 'center' }}>
            <SpinnerIcon spin /> Загрузка...
            </p>
        );
        }

        return menu
    };

    const renderMenuItem = item => {
        console.log(item, userToCover, userToCover[item]);
        return (
        <div>
            <span><img style={{width: "1.5rem", height: "1.5rem", marginRight: "0.5rem", borderRadius: "50%"}} src={"https://benzovoz-team.ru/" + userToCover[item]}/> {item}</span>
        </div>
        );
    }

    useEffect(() => {
        getCurrentUser();
        getTeam();
        getQuestions();
    }, [])

    useEffect(() => {
        
    }, [currentUser])

    return (
        <Container>
            <Header>
                <Navbar currentUser={currentUser} currentTeam={team} signal={signal}/>
            </Header>
            <Container className="main-wrapper">
                <Container className="main-container">
                    {   isLandscape  &&
                        <Navside currentTeam={team} currentUser={currentUser} signal={signal}/>
                    }
                    <Content className="main-content">
                        <div className="profile-team-banner">
                            {
                                currentUser.team_id == params.id ?
                            <Uploader onSuccess={() => getTeam()} className="profile-team-banner-img" withCredentials fileListVisible={false} draggable action={"https://benzovoz-team.ru/api/team/cover/upload/" + params.id}>
                                <img className="profile-team-banner-img-img" src={"https://benzovoz-team.ru/" + (team.cover ? team.cover : "default_cover.png")} alt=""/>
                            </Uploader>
                            :   <img className="profile-team-banner-img" src={"https://benzovoz-team.ru/" + (team.cover ? team.cover : "default_cover.png")} alt=""/>

                            }
                        </div>
                        <Panel bodyFill className="profile-team" header={<div className="profile-team-title">
                            <span>Профиль команды</span>
                            <span className="profile-team-title-name">{team.name}</span>
                        </div>}>
                            { teamLoading ? <SpinnerIcon spin /> :
                            <Tabs activeKey={activeTab} onSelect={(e) => {
                                if (e < 9999) {
                                    setActiveTab(e);
                                } else if (e == 9999) {
                                    setActiveTab(activeTab);
                                    handleInviteOpen();
                                } else {
                                    exitTeam()
                                }
                            }} appearance="subtle">
                                {
                                    team &&
                                    team.users && team.users.map((t, i) => {
                                        return (<Tabs.Tab eventKey={i} sele title={t.username}>
                                                    <div className="profile-team-user-wrapper">
                                                        <div className="profile-team-user-cover">
                                                            {t.id == currentUser.id ?
                                                            <Uploader onSuccess={() => getTeam()} className="profile-team-user-cover-img" withCredentials fileListVisible={false} draggable action={"https://benzovoz-team.ru/api/user/cover/upload/" + t.id}>
                                                                <img className="profile-team-user-cover-img-img" src={"https://benzovoz-team.ru/" + (t.cover ? t.cover : "default_cover.png")} alt=""/>
                                                            </Uploader>
                                                            :
                                                            <img className="profile-team-user-cover-img" src={"https://benzovoz-team.ru/" + (t.cover ? t.cover : "default_cover.png")} alt=""/>
                                                            }
                                                        </div>
                                                        <div className="profile-team-user-info">
                                                            <span className="profile-team-user-label">Роль <span style={{padding: "7px 11px"}} className="profile-team-user-value">{t.role == "org" ? "Капитан" : "Участник"}</span></span>
                                                            <span className="profile-team-user-label">О себе <span className="profile-team-user-value">{t.id == currentUser.id ?
                                                                <InlineEdit defaultValue={formMe.bio} onChange={(e) => {console.log(e); setFormMe({ ...formMe, bio: e }) }} onSave={() => updateMe()} placeholder={formMe.bio ? formMe.bio : "Нажмите, чтобы редактировать"} style={{ width: "100%"}}>
                                                                    <Input value={formMe.bio}  as="textarea" rows={5} />
                                                                </InlineEdit>
                                                                : t.bio}</span>
                                                            </span>
                                                            <span className="profile-team-user-label">Стэк <span className="profile-team-user-value">{t.id == currentUser.id ?
                                                                <InlineEdit defaultValue={formMe.stack} onSave={() => updateMe()} onChange={(e) => setFormMe({ ...formMe, stack: e })} placeholder={formMe.stack ? formMe.stack : "Нажмите, чтобы редактировать"} style={{ width: "100%"}}>
                                                                    <Input value={formMe.stack}/>
                                                                </InlineEdit>
                                                                : t.stack}</span>
                                                            </span>
                                                            {
                                                                params.id != currentUser.team_id && currentUser.id &&
                                                                <Button appearance="subtle" color="blue" block onClick={() => {
                                                                    handleOpen()
                                                                    setFormQuestion({
                                                                        ...formQuestion,
                                                                        user_id: t.id,
                                                                    });
                                                                }}>Задать вопрос</Button>
                                                            }
                                                            {
                                                                team.id == currentUser.team_id && team.cap == currentUser.id && t.id != currentUser.id &&
                                                                <Button onClick={() => kickUser(t.id)} appearance="ghost" color="red" block>
                                                                    Кикнуть участника
                                                                </Button>
                                                            }
                                                        </div>
                                                    </div>
                                                </Tabs.Tab>)
                                    })
                                }
                                {   
                                    
                                        team && team.users && team.users.length < 5 && team.cap == currentUser.id &&
                                        <Tabs.Tab icon={<Whisper placement="top" trigger="hover" speaker={<Tooltip>Пригласить участников</Tooltip>}><PlusIcon /></Whisper>} eventKey={9999}>
                                        </Tabs.Tab>
                                   
                                }
                                {
                                        team && team.cap != currentUser.id && currentUser.team_id == team.id &&
                                        <Tabs.Tab icon={<Whisper placement="top" trigger="hover" speaker={<Tooltip>Выйти из команды</Tooltip>}><ExitIcon /></Whisper>} eventKey={10000}>
                                        </Tabs.Tab>
                                }
                            </Tabs>}
                        </Panel>
                        {
                            !isLandscape &&
                            <Navside currentTeam={team} currentUser={currentUser} signal={signal}/>
                        }
                        <div className="profile-team-questions">
                            <span>Вопросы</span>
                        </div>
                        <div className="profile-team-questions-wrapper">
                            {
                                questionsLoading ? <SpinnerIcon spin /> :
                                questions && questions.length > 0 && questions.map((q, i) => {
                                    return (
                                        <div className="profile-team-question-answer-wrapper">
                                            <div className="profile-team-question-wrapper">
                                                <div className="profile-team-question">
                                                    <div style={{width: "100%"}}>
                                                        <div className="profile-team-question-title">
                                                            <div className="profile-team-question-title-text-wrapper">
                                                                <span className="profile-team-question-title-text">От <span className="profile-team-question-title-username">{q.owner_FIO}</span> для <span  className="profile-team-question-title-username">{q.user.username}</span></span>
                                                            </div>
                                                            <span className="profile-team-question-title-date">{q.created_at}</span>
                                                        </div>
                                                        <div className="profile-team-question-body">
                                                            <span className="profile-team-question-body-text">Вопрос: {q.text}</span>
                                                        </div>
                                                    </div>
                                                    { !q.answer && q.user.team_id == currentUser.team_id &&
                                                    <Whisper placement="bottom" trigger="hover" speaker={<Tooltip>Ответить</Tooltip>}>
                                                        <IconButton onClick={() => {handleAnswerOpen(); setFormAnswer({ ...formAnswer, id: q.id })}} appearance="subtle" color="blue" className="profile-team-question-answer" icon={<ArrowRightIcon />}/>
                                                    </Whisper>
                                                    }
                                                </div>
                                            </div>
                                            {
                                                q.answer &&
                                                <div className="profile-team-answer-wrapper">
                                                    <div className="profile-team-answer">
                                                        {q.answer}
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                    )
                                })
                            }
                        </div>

                        <Modal size={isLandscape ? "md" : "full"} overflow={false} backdrop={true} keyboard={true} open={open} onClose={handleClose}>
                            <Modal.Header>
                                <Modal.Title>Задать вопрос к </Modal.Title>
                            </Modal.Header>

                            <Modal.Body>
                                <Form model={model} fluid layout='vertical' style={{width: "100%", height: "20rem", display: 'flex', flexDirection: 'column', justifyContent: "space-between"}}
                                formValue={formQuestion} ref={formRef} onSubmit={() => {if (formRef.current.check()) { askQuestion(formQuestion); handleClose()} }}
                                onChange={fm => {console.log(fm); setFormQuestion({...formQuestion, ...fm})}}>
                                    <div className="form-wrapper">
                                        <Form.Group className="form-group" controlId="FIO">
                                            <Form.ControlLabel className="mg-lf-1">Ваше ФИО</Form.ControlLabel>
                                            <Form.Control autoComplete="off" name="FIO" />
                                            <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                                        </Form.Group>
                                        <Form.Group className="form-group" controlId="text">
                                            <Form.ControlLabel className="mg-lf-1">Ваш вопрос</Form.ControlLabel>
                                            <Form.Control autoComplete="off" name="text" />
                                            <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                                        </Form.Group>
                                    </div>
                                    <Modal.Footer>
                                        <Button type="submit" appearance="primary">
                                            Отправить
                                        </Button>
                                        <Button onClick={handleClose} appearance="subtle">
                                            Отмена
                                        </Button>
                                    </Modal.Footer>
                                </Form>
                            </Modal.Body>
                        </Modal>

                        <Modal size={isLandscape ? "md" : "full"} overflow={false} backdrop={true} keyboard={true} open={answerOpen} onClose={handleAnswerClose}>
                            <Modal.Header>
                                <Modal.Title>Ответить на вопрос</Modal.Title>
                            </Modal.Header>

                            <Modal.Body>
                                <Form model={modelAnswer} fluid layout='vertical' style={{width: "100%", height: "20rem", display: 'flex', flexDirection: 'column', justifyContent: "space-between"}}
                                formValue={formAnswer} ref={formAnswerRef} onSubmit={() => {if (formAnswerRef.current.check()) { answerQuestion(formAnswer); handleAnswerClose()} }}
                                onChange={fm => {console.log(fm); setFormAnswer({...formAnswer, ...fm})}}>
                                    <div className="form-wrapper">
                                        <Form.Group className="form-group" controlId="text">
                                            <Form.ControlLabel className="mg-lf-1">Ваш ответ</Form.ControlLabel>
                                            <Form.Control autoComplete="off" name="text" />
                                            <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                                        </Form.Group>
                                    </div>
                                    <Modal.Footer>
                                        <Button type="submit" appearance="primary">
                                            Отправить
                                        </Button>
                                        <Button onClick={handleAnswerClose} appearance="subtle">
                                            Отмена
                                        </Button>
                                    </Modal.Footer>
                                </Form>
                            </Modal.Body>
                        </Modal>

                        <Modal size={isLandscape ? "md" : "full"} overflow={false} backdrop={true} keyboard={true} open={inviteOpen} onClose={handleInviteClose}>
                            <Modal.Header>
                                <Modal.Title>Пригласить участников</Modal.Title>
                            </Modal.Header>

                            <Modal.Body>
                                <Form fluid layout='vertical' style={{width: "100%", display: 'flex', flexDirection: 'column'}}>
                                    <FormGroup style={{width: "100%", display: "flex", justifyContent: "space-between", flexDirection: "column"}}>
                                        <label className="form-label">Добавить участников</label>
                                        <CheckPicker virtualized name="users" data={inviteUsers} onChange={fm => setInviteForm({...inviteForm, users: fm})}
                                            renderMenuItem={renderMenuItem}
                                            onOpen={updateData}
                                            onSearch={updateData}
                                            renderMenu={renderMenu}/>
                                    </FormGroup>
                                </Form>
                            </Modal.Body>

                            <Modal.Footer>
                                <Button onClick={() => {sendInvite(); handleInviteClose()}} appearance="primary">
                                    Пригласить
                                </Button>
                                <Button onClick={handleInviteClose} appearance="subtle">
                                    Отмена
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    </Content>
                </Container>
            </Container>
        </Container>
    )
}