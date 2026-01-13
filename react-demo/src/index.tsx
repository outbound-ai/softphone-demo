import "./index.css";
import React from 'react';
import ReactDOM from 'react-dom/client';
import Softphone from './softphone/Softphone';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Softphone />
  </React.StrictMode>
);