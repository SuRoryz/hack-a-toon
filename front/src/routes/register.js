import { useNavigate } from "react-router-dom";
import { Container, Content, Form, Panel, Radio, RadioGroup, Button, Message, useToaster, Input, Schema, Uploader } from 'rsuite';
import { useState, forwardRef, useRef } from 'react'
import FormGroup from 'rsuite/esm/FormGroup';
import { socket } from '../socket_context/sockets'


export default function Register() {
    const [formValue, setFormValue] = useState({
        username: "",
        password: "",
        team_name: "",
        bio: "",
        stack: "",
        cover: "",
        team_cover: "",
        role: "user"
      });

    const formRef = useRef();

    const n = useNavigate();
    const toaster = useToaster();

    const Textarea = forwardRef((props, ref) => <Input {...props} as="textarea" ref={ref} />);

    const { StringType } = Schema.Types;

    const teamNameRule = Schema.Types.StringType().isRequired('Это поле обязательно').minLength(3, 'Минимальная длина 3 символа').maxLength(30, 'Максимальная длина 30 символов');
    const model = Schema.Model({
      username: StringType().isRequired('Это поле обязательно').minLength(3, 'Минимальная длина 3 символа').maxLength(30, 'Максимальная длина 30 символов'),
      password: StringType().isRequired('Это поле обязательно').minLength(3, 'Минимальная длина 3 символа').maxLength(30, 'Максимальная длина 30 символов'),
      email: StringType().isEmail('Введите валидный Email адрес').isRequired('Это поле обязательно'),
    });

    const statusToType = {
      1: 'success',
      0: 'error',
      2: 'warning',
    }

    const navigator = (data) => {
      socket.emit("unsub_all")
      socket.emit("listen_for", {room: data})
      n(data)
  }
  function sendFormRegister(form) {
    console.log(form)
      fetch(`https://benzovoz-team.ru/api/register`, {
        body: JSON.stringify(form),
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
            )
          }

          if (data.status) {
            navigator('/login')
          }
        }
      )
    }

    return (
            <Container>
                <Content>
                  <Panel className="main-form-wrapper" bordered style={{width: "25rem", height: "40rem",
                  left: "calc(50vw - 12.5rem)", top: "calc(50vh - 20rem)", position: "absolute" }}>
                    <Form model={model} fluid layout='vertical' style={{width: "100%", height: "100%", display: 'flex', flexDirection: 'column', justifyContent: "space-between"}}
                    formValue={formValue} ref={formRef} onSubmit={() => {if (formRef.current.check()) { sendFormRegister(formValue)} }}
                    onChange={fm => {console.log(fm); setFormValue(fm)}}>
                      <div className="form-wrapper">
                        <Form.Group className="form-group" controlId="username">
                          <Form.ControlLabel className="mg-lf-1">Имя</Form.ControlLabel>
                          <Form.Control autoComplete="off" name="username" />
                          <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                        </Form.Group>
                        <Form.Group className="form-group" controlId="password">
                          <Form.ControlLabel className="mg-lf-1">Пароль</Form.ControlLabel>
                          <Form.Control type="password" autoComplete="off" name="password" />
                          <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                        </Form.Group>
                        <Form.Group className="form-group" controlId="email">
                          <Form.ControlLabel className="mg-lf-1">Email</Form.ControlLabel>
                          <Form.Control autoComplete="off" name="email" />
                          <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                        </Form.Group>
                        <FormGroup className="form-group" controlId="stack">
                          <Form.ControlLabel className="mg-lf-1">Стек технологий</Form.ControlLabel>
                          <Form.Control
                            name="stack"
                            rows={3}
                          />
                        </FormGroup>
                        <FormGroup className="form-group" controlId="bio">
                          <Form.ControlLabel className="mg-lf-1">О себе</Form.ControlLabel>
                          <Form.Control
                            accepter={Textarea}
                            name="bio"
                            rows={3}
                          />
                        </FormGroup>
                        <Form.Group className="form-group" controlId="role">
                          <RadioGroup style={{width: "100%", display: "flex", justifyContent: "space-between"}} name="role" inline appearance="picker" defaultValue="user" onChange={(e) => {setFormValue({...formValue, role: e})}}>
                            <span style={{padding: '7px 2px 7px 12px',display: 'inline-block',verticalAlign: 'middle'}}>Выберите роль: </span>
                            <div>
                              <Radio value="user">Участник</Radio>
                              <Radio value="org">Капитан</Radio>
                            </div>
                          </RadioGroup>
                        </Form.Group>
                        {
                          formValue.role == "org" &&
                          <div>
                            <Form.Group className="form-group" controlId="team_name">
                              <Form.ControlLabel className="mg-lf-1">Название команды</Form.ControlLabel>
                              <Form.Control rule={teamNameRule} autoComplete="off" name="team_name"/>
                              <Form.HelpText className="mg-lf-1">Это поле обязательно</Form.HelpText>
                            </Form.Group>
                            <Form.Group className="form-group" controlId="team_cover">
                              <Uploader action="https://benzovoz-team.ru/api/upload_cover" draggable onSuccess={data => setFormValue({...formValue, team_cover: data.result})}>
                                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span>Кликните или перенестите сюда баннер команды</span>
                                </div>
                              </Uploader>
                            </Form.Group>
                          </div>
                        }
                      </div>
                      <div style={{height: "20%", display: "flex", flexDirection: "column", justifyContent: "end", alignItems: "center"}}>
                        <span style={{marginBottom: "1rem"}}>Уже зарегестрированы? <a onClick={() => navigator('/')}>Войти</a></span>
                        <FormGroup style={{display: 'flex', width: "100%", justifyContent: "space-around"}}>
                            <Button style={{width: "40%"}} appearance="primary" type="submit">Регистрация</Button>
                        </FormGroup>
                      </div>
                    </Form>
                  </Panel>
                </Content>
              </Container>
    )
}