import { useNavigate } from "react-router-dom";
import { Container, Content, Header, Rate, Message, Button, ButtonGroup, useToaster, toaster, CheckPicker, Drawer, InputGroup, Input, Carousel, Table, Modal } from 'rsuite';
import { useEffect, useState } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import { socket } from '../socket_context/sockets'
import PlusIcon from '@rsuite/icons/Plus';
import SpinnerIcon from '@rsuite/icons/legacy/Spinner';
import SearchIcon from '@rsuite/icons/Search';

import { useMediaQuery } from 'rsuite';

import Navbar from "./navbar.tsx";
import Navside from "./sidenav.tsx";

export default function Teams() {
    const n = useNavigate();
    const { Column, HeaderCell, Cell } = Table;

    const [currentUser, setCurrentUser] = useState({});
    const [teams, setTeams] = useState([]);
    const [teamsTop, setTeamsTop] = useState([]);

    const [teamsLoading, setTeamsLoading] = useState(false);
    const [teamsTopLoading, setTeamsTopLoading] = useState(false);

    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const [isDark, isLandscape] = useMediaQuery([
        '(prefers-color-scheme: dark)',
        '(orientation:landscape)'
      ]);

    const [searchQuery, setSearchQuery] = useState("");

    const [formValue, setFormValue] = useState({
        team_id: 0,
        design_score: 3,
        usable_score: 3,
        imposition_score: 3,
        realization_score: 3,
    })
    const [hoverValue, setHoverValue] = useState({
        design_score: 3,
        usable_score: 3,
        imposition_score: 3,
        realization_score: 3,
    });

    const texts = {
        1: 'Плохо',
        2: 'Не очень',
        3: 'Пойдет',
        4: 'Хорошо',
        5: 'Отлично!'
      };

    const [carouselIndex, setCarouselIndex] = useState(0);
    
    const submitRate = () => {
        fetch('https://benzovoz-team.ru/api/team/rates/create/' + formValue.team_id, {credentials: "include", body: JSON.stringify({...formValue, total_score: formValue.design_score + formValue.usable_score + formValue.imposition_score + formValue.realization_score}), method: "POST", headers: {
            "Content-Type": "application/json",
        }}).then(data => data.status == 200 ? data.json() : null).then(
          data => {
            if ('status' in data && 'message' in data) {
              toaster.push(
                <Message showIcon>
                  {data.message}
                </Message>,
                { placement: 'bottomEnd'}
              );
              handleClose();
              getTeamsTop();
              getCurrentUser();
              getTeams();
            }
        })
    }

    const getCurrentUser = (data) => {
        fetch('https://benzovoz-team.ru/api/user/get').then(data => data.json()).then(data => {
            if (data) {
                setCurrentUser(data);
            }
        })
    }

    const getTeams = (data) => {
        setTeamsLoading(true);
        fetch('https://benzovoz-team.ru/api/teams/get').then(data => data.json()).then(data => {
            setTeamsLoading(false);
            setTeams(data)
        })
    }

    const getTeamsTop = (query) => {
        setTeamsTopLoading(true);
        fetch('https://benzovoz-team.ru/api/teams/top?query=' + searchQuery).then(data => data.json()).then(data => {
            setTeamsTopLoading(false);
            setTeamsTop(data)
        })
    }
    

    useEffect(() => {
        getCurrentUser();
        getTeams();
        getTeamsTop();
    }, [])

    useEffect(() => {
        
    }, [currentUser])

    useEffect(() => {
        getTeamsTop();
    }, [searchQuery])

    return (
        <Container className="main-main">
            <Header>
                <Navbar currentUser={currentUser}/>
            </Header>
            <Container className="main-wrapper">
                <Container className="main-container">
                    <Content className="main-content">
                        <div className="teams-header-wrapper">
                            <h2>Участники хакатона</h2>
                        </div>
                        <Carousel className="carousel-teams" activeIndex={carouselIndex} onSelect={setCarouselIndex}>
                            {
                                teams.map((team) => (
                                    <div className="team" onClick={() => n('/team/' + team.id)} key={team.id}>
                                        <h3 className="team-name">{team.name}</h3>
                                        <img className="team-cover" src={"https://benzovoz-team.ru/" + team.cover}/>
                                        {
                                            currentUser && currentUser.ratedTeamsIds && !currentUser.ratedTeamsIds.includes(team.id) &&
                                            team.id !== currentUser.team_id &&
                                            <Button onClick={(e) => {e.stopPropagation(); handleOpen(); setFormValue({...formValue, team_id: team.id})}} appearance="primary" className="team-rate">Оценить команду</Button>
                                        }
                                    </div>
                                ))
                            }
                        </Carousel>
                        <div className="top-header-wrapper">
                            <h3>Топ команд</h3>
                            <InputGroup className="search-input" inside>
                                <Input onChange={(e) => setSearchQuery(e)} placeholder={"Поиск команды"} />
                                <InputGroup.Button>
                                <SearchIcon />
                                </InputGroup.Button>
                            </InputGroup>
                        </div>
                        <div>
                            <Table loading={teamsTopLoading} fluid virtualized height={400} data={teamsTop}>
                                <Column flexGrow={1} align="center" fixed>
                                    <HeaderCell>Место</HeaderCell>
                                    <Cell dataKey="index"/>
                                </Column>

                                <Column resizable flexGrow={4} align="center" fixed>
                                    <HeaderCell>Команда</HeaderCell>
                                    <Cell dataKey="name" style={{ cursor: 'pointer' }}>
                                        {rowData => <a onClick={() => n('/team/' + rowData.id)}>{rowData.name}</a>}
                                    </Cell>
                                </Column>

                                <Column>
                                    <HeaderCell>Дизайн</HeaderCell>
                                    <Cell dataKey="design_score">
                                    {rowData =>
                                            rowData.design_score === 0 ? <span>0</span> :
                                            Array.from({ length: Math.round(rowData.design_score / rowData.votedByTimes) }).map((_, i) => <span className="star" key={i}>⭐️</span>)
                                        }
                                    </Cell>
                                </Column>

                                <Column>
                                    <HeaderCell>Юзабилити</HeaderCell>
                                    <Cell dataKey="usable_score">
                                        {rowData =>
                                            rowData.usable_score === 0 ? <span>0</span> :
                                            Array.from({ length: Math.round(rowData.usable_score / rowData.votedByTimes) }).map((_, i) => <span className="star" key={i}>⭐️</span>)
                                        }
                                    </Cell>
                                </Column>

                                <Column>
                                    <HeaderCell>Верстка</HeaderCell>
                                    <Cell dataKey="imposition_score">
                                        {rowData =>
                                            rowData.imposition_score === 0 ? <span>0</span> :
                                            Array.from({ length: Math.round(rowData.imposition_score / rowData.votedByTimes) }).map((_, i) => <span className="star" key={i}>⭐️</span>)
                                        }
                                    </ Cell>
                                </Column>

                                <Column>
                                    <HeaderCell>Реализация</HeaderCell>
                                    <Cell dataKey="realization_score">
                                        {rowData =>
                                            rowData.realization_score === 0 ? <span>0</span> :
                                            Array.from({ length: Math.round(rowData.realization_score / rowData.votedByTimes) }).map((_, i) => <span className="star" key={i}>⭐️</span>)
                                        }
                                    </Cell>
                                </Column>

                                <Column flexGrow={1}>
                                    <HeaderCell>Общая оценка</HeaderCell>
                                    <Cell dataKey="total_score"/>
                                </Column>
                            </Table>
                        </div>

                        <Modal size={isLandscape ? "md" : "full"} className="team-rate-modal" overflow={false} backdrop={true} keyboard={true} open={open} onClose={handleClose}>
                            <Modal.Header>
                                <Modal.Title>Оценить команду</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <div className="team-rate-row">
                                    <span className="team-rate-title">Дизайн</span>
                                    <div style={{display: "flex", alignItems: "center"}}>
                                        <Rate defaultValue={3} onChangeActive={(e) => setHoverValue({...hoverValue, design_score: e})} onChange={(e) => setFormValue({...formValue, design_score: e})} />{' '}
                                        <span className="team-rate-value">{texts[hoverValue.design_score]}</span>
                                    </div> 
                                </div>
                                <div className="team-rate-row">
                                    <span className="team-rate-title">Юзабилити</span>
                                    <div style={{display: "flex", alignItems: "center"}}>
                                        <Rate defaultValue={3} onChangeActive={(e) => setHoverValue({...hoverValue, usable_score: e})} onChange={(e) => setFormValue({...formValue, usable_score: e})} />{' '}
                                        <span className="team-rate-value">{texts[hoverValue.usable_score]}</span>
                                    </div> 
                                </div>
                                <div className="team-rate-row">
                                    <span className="team-rate-title">Верстка</span>
                                    <div style={{display: "flex", alignItems: "center"}}>
                                        <Rate defaultValue={3} onChangeActive={(e) => setHoverValue({...hoverValue, imposition_score: e})} onChange={(e) => setFormValue({...formValue, imposition_score: e})} />{' '}
                                        <span className="team-rate-value">{texts[hoverValue.imposition_score]}</span>
                                    </div> 
                                </div>
                                <div className="team-rate-row">
                                    <span className="team-rate-title">Реализация</span>
                                    <div style={{display: "flex", alignItems: "center"}}>
                                        <Rate defaultValue={3} onChangeActive={(e) => setHoverValue({...hoverValue, realization_score: e})} onChange={(e) => setFormValue({...formValue, realization_score: e})} />{' '}
                                        <span className="team-rate-value">{texts[hoverValue.realization_score]}</span>
                                    </div> 
                                </div>

                            </Modal.Body>
                            <Modal.Footer>
                                <Button appearance="primary" onClick={submitRate}>Оценить</Button>
                                <Button onClick={handleClose}>Отмена</Button>
                            </Modal.Footer>
                        </Modal>
                    </Content>
                </Container>
            </Container>
        </Container>
    )
}