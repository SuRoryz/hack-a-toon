import { Navbar, Nav, Toggle, IconButton, Modal, Button, Sidenav } from 'rsuite';
import HomeIcon from '@rsuite/icons/legacy/Home';
import React from 'react';
import ExitIcon from '@rsuite/icons/Exit';
import MenuIcon from '@rsuite/icons/Menu';

import Cookies from 'universal-cookie';
import { useNavigate } from 'react-router-dom';

import SpinnerIcon from '@rsuite/icons/legacy/Spinner';
import { useMediaQuery } from 'rsuite';

import Navside from "./sidenav.tsx";


export default function Main({currentUser, currentTeam, signal}) {
    const cookies = new Cookies();

    const n = useNavigate();

    const [invites, setInvites] = React.useState([]);
    const [inviteLoading, setInviteLoading] = React.useState(false);

    const [isDark, isLandscape] = useMediaQuery([
        '(prefers-color-scheme: dark)',
        '(orientation:landscape)'
      ]);

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => {
        getInvites();
        setOpen(true)
    };
    const handleClose = () => setOpen(false);

    const [collapsed, setCollapsed] = React.useState(true);

    const acceptInvite = (id) => {
        fetch('https://benzovoz-team.ru/api/team/invite/accept/' + id, {credentials: "include", method: "POST"}).then(data => data.json()).then(data => {
            if (!data) return;
            handleClose();
            window.location.reload();
        })
    }

    const declineInvite = (id) => {
        fetch('https://benzovoz-team.ru/api/team/invite/decline/' + id, {credentials: "include", method: "POST"}).then(data => data.json()).then(data => {
            if (!data) return;
            handleClose();
            getInvites();
        })
    }

    const getInvites = () => {
        setInviteLoading(true);
        fetch('https://benzovoz-team.ru/api/user/invite/get', {credentials: "include", method: "GET"}).then(data => data.json()).then(data => {
            if (!data) return;
            setInvites(data);
            setInviteLoading(false);
        })
    }

    return (
        <Navbar className='navbar'>
            <Navbar.Brand style={{fontFamily: "Century Gothic", fontWeight: "bold", fontSize: "1rem"}} href="#">HACK-A-TOON</Navbar.Brand>

            {
                isLandscape ?
                <>
                <Nav>
                    <Nav.Item onClick={() => n(`/`)} icon={<HomeIcon />}>Главная</Nav.Item>
                </Nav>
                {   
                    currentUser && currentUser.team_id &&
                    <Nav>
                        <Nav.Item onClick={() => {n(`/team/${currentUser.team_id}`); window.location.reload()}}>Моя команда</Nav.Item>
                    </Nav>
                }
                <Nav pullRight>
                {
                    currentUser && !currentUser.team_id && currentUser.id &&
                    <Nav.Item onClick={() => {handleOpen()}}>Ваши приглашения</Nav.Item>
                }
                {
                    currentUser ?
                    <Nav.Item><IconButton onClick={() => {
                        fetch('/logout', {
                            
                        });
                        localStorage.clear(); cookies.remove('session', { path: '/' }); window.location.replace("/login")
                    }} style={{backgroundColor: "transparent"}} icon={<ExitIcon />}></IconButton></Nav.Item>
                    :
                    <Nav.Item onClick={() => {n(`/login`)}}>Войти</Nav.Item>
                }
                </Nav> 
                </>
                :
                <>
                <Nav pullRight>
                    <Nav.Item onClick={() => setCollapsed(!collapsed)} icon={<MenuIcon />}></Nav.Item>
                </Nav>
                <Sidenav className={'navbar-sidenav' + (collapsed ? ' collapsed' : '')} expanded={collapsed} defaultOpenKeys={['1']}>
                    <Sidenav.Body>
                        <Nav style={{width: "100%", display: "flex", flexDirection: "column", alignItems: "center"}}>
                            <Nav.Item style={{width: "100%"}} onClick={() => n(`/`)} icon={<HomeIcon />}>Главная</Nav.Item>
                            {   
                                currentUser && currentUser.team_id &&
                                <Nav.Item style={{width: "100%"}} onClick={() => {n(`/team/${currentUser.team_id}`); window.location.reload()}}>Моя команда</Nav.Item>
                            }
                            {
                                currentUser && !currentUser.team_id && currentUser.id &&
                                <Nav.Item style={{width: "100%"}} onClick={() => {handleOpen()}}>Ваши приглашения</Nav.Item>
                            }
                            {
                                currentUser ?
                                <Nav.Item><IconButton onClick={() => {
                                    fetch('/logout', {
                                        
                                    });
                                    localStorage.clear(); cookies.remove('session', { path: '/' }); window.location.replace("/login")
                                }} style={{backgroundColor: "transparent"}} icon={<ExitIcon />}></IconButton></Nav.Item>
                                :
                                <Nav.Item onClick={() => {n(`/login`)}}>Войти</Nav.Item>
                            }
                            </Nav>
                    </Sidenav.Body>
                </Sidenav>
                </>
            }


            <Modal open={open} size={isLandscape ? "md" : "full"} backdrop={true} onClose={handleClose}>
                <Modal.Header>
                    <Modal.Title>Список приглашений</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {
                        inviteLoading ? <SpinnerIcon spin /> :
                        invites.length == 0 ? <p>У вас нет приглашений</p> :
                        invites.map((invite, index) => {
                            return (
                                <div className='invite'>
                                    <div className='invite-info'>
                                        <img className='invite-img' src={'https://benzovoz-team.ru/' + invite.team.cover} />
                                        <p>Приглашение в команду <span className='invite-team-name'>{invite.team.name}</span></p>
                                    </div>
                                    
                                    <div className='invite-actions'>
                                        <div className='invite-date'>{invite.created_at}</div>
                                        <div>
                                            <Button style={{marginRight: "0.5rem"}} appearance="primary" color="blue" onClick={() => {acceptInvite(invite.id)}}>Принять</Button>
                                            <Button appearance="ghost" color="red" onClick={() => {declineInvite(invite.id)}}>Отклонить</Button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    }
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={handleClose}>Закрыть</Button>
                </Modal.Footer>
            </Modal>
        </Navbar>
    )
};