import logo from './logo.svg';
import './App.css';
import { Routes, Route, BrowserRouter } from "react-router-dom";
import Login from './routes/login'
import Register from './routes/register'
import { CookiesProvider } from 'react-cookie';

import Teams from './routes/teams'
import Team from './routes/team'

function App() {

  return (
    <div className='App'>
      <CookiesProvider defaultSetOptions={{ path: '/' }}>
        <div className='AppWrapper'>
          <BrowserRouter >
            <Routes>
              <Route path="/" element={
                <Teams/> }>  
              </Route>
              <Route path="team/:id" element={
                <Team/> }>  
              </Route>
              <Route path="/login" element={
                <Login/> }>
              </Route>
              <Route path="/register" element={
                <Register/>
                  }>
              </Route>
            </Routes>
          </BrowserRouter>
        </div>
      </CookiesProvider>
    </div>
  );
}

export default App;

