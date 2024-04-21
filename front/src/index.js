import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { CustomProvider } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <CustomProvider theme="light">
      <App />
  </CustomProvider>
);
