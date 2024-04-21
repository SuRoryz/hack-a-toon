import { useEffect, useState, useRef } from 'react'
import { Container, Content, Header, Panel, Sidebar, Nav, Dropdown, Button, Modal, CheckPicker, Form, Input, Message, useToaster, AvatarGroup, Avatar, IconButton, Uploader, toaster } from "rsuite";
import FormGroup from "rsuite/esm/FormGroup";
import SpinnerIcon from '@rsuite/icons/legacy/Spinner';
import React from 'react';
import { YMaps, Map, Circle, ObjectManager, RoutePanel, Placemark } from '@pbe/react-yandex-maps';
import ExpandOutlineIcon from '@rsuite/icons/ExpandOutline';
import UserBadgeIcon from '@rsuite/icons/UserBadge';

import DocViewer, { DocViewerRenderers,  } from "@cyntler/react-doc-viewer";

type ActiveKey = "home" | "parts" | "history";

export default function Main({currentUser, currentTeam, signal}) {

    const [invited, setInvited] = useState([]);
    const [solution, setSolution] = useState({});

    const statusToType = {
        1: 'success',
        0: 'error',
        2: 'warning',
      }
    
    const CustomDropdown = ({ ...props }) => (
        <Dropdown {...props}>
        <Dropdown.Item>
            <Uploader onSuccess={(data) => {
                toaster.push(
                    <Message showIcon type={statusToType[data.status]}>
                        {data.message}
                    </Message>,
                    { placement: 'bottomEnd'}
                );
                getSolution();
                
            }} withCredentials fileListVisible={false}  action={'https://benzovoz-team.ru/api/team/solution/upload/' + currentUser.team_id}>
                <span>Загрузить презентацию</span>
            </Uploader>
        </Dropdown.Item>
        <Dropdown.Item onClick={handleSolutionOpen}>Посмотреть презентацию</Dropdown.Item>
        </Dropdown>
    );

    const [solutionOpen, setSolutionOpen] = useState(false);
    const handleSolutionOpen = () => setSolutionOpen(true);
    const handleSolutionClose = () => setSolutionOpen(false);

    const getSolution = () => {
        fetch('https://benzovoz-team.ru/api/teams/solution/get/' + currentUser.team_id, {credentials: "include"}).then(data => data.text()).then(data => {
            console.log(data)
            if (!data) return;
            setSolution(data);
        })
    }

    const deleteInvite = (id) => {
        fetch('https://benzovoz-team.ru/api/team/invite/delete/' + id, {credentials: "include", method: "POST"}).then(data => data.json()).then(data => {
            if (!data) return;
            getInvited();
        })
    }

    const getInvited = () => {
        fetch('https://benzovoz-team.ru/api/team/invite/get/' + currentUser.team_id, {credentials: "include"}).then(data => data.json()).then(data => {
            if (!data) return;
            setInvited(data);
        })
    }

    useEffect(() => {
        if (currentTeam.id && currentTeam.id && currentUser.team_id == currentTeam.id) {
            getInvited();
        }
    }, [currentUser, currentTeam, signal]);

    useEffect(() => {
        
    }, [solution])

    useEffect(() => {
        if (currentTeam && currentTeam.id) {
            getSolution();   
        }
    }, [currentTeam])

    return (
        <Sidebar className="sidenav">
            <div style={{display: "none"}}>{signal}</div>
            { currentUser.team_id == currentTeam.id ?
            <CustomDropdown icon={<UserBadgeIcon />} block title="Наше решение" trigger="hover" placement="bottomEnd" />
            :
            <IconButton icon={<UserBadgeIcon />} onClick={handleSolutionOpen} appearance='subtle'>Наше решение</IconButton>
            }
            {
                currentUser.team_id == currentTeam.id &&
                <Panel collapsible bodyFill className="sidenav-item" header={<span className="sidenav-item__title">Отправленные приглашения</span>}>
                    <div className="sidenav-item__content">
                        {
                            invited.length == 0 ?
                            <div className="sidenav-item__content__empty">
                                <span>У вас нет приглашений</span>
                            </div>
                            :
                            <div>
                                {
                                    invited.map((user, index) => {
                                        return (
                                            <div className="sidenav-item__content__item" key={index}>
                                                <div className="sidenav-item__content__item__info">
                                                    <Avatar size="lg" src={"https://benzovoz-team.ru/" + user.user.cover} />
                                                    <div className="sidenav-item__content__item__info__text">
                                                        <span>{user.created_at}</span>
                                                        <span>{user.user.username}</span>
                                                    </div>
                                                </div>
                                                {   currentUser.id == currentTeam.cap &&
                                                    <Button appearance="subtle" color="blue" block onClick={() => {
                                                        deleteInvite(user.id)
                                                    }}>Удалить приглашение</Button>
                                                }
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        }
                    </div>
                </Panel>
            }
            <Modal size="lg" overflow={false} backdrop={true} keyboard={true} open={solutionOpen} onClose={handleSolutionClose}>
                <Modal.Header>
                    <Modal.Title>Просмотр презентации</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>
                    {   solutionOpen && solution &&
                        <DocViewer style={{height: "30rem"}} documents={[
                            {
                                uri: "https://benzovoz-team.ru/" + solution,
                            }
                        ]} pluginRenderers={DocViewerRenderers} />
                    }
                    </div>
                </Modal.Body>
            </Modal>
        </Sidebar>
    )
}
