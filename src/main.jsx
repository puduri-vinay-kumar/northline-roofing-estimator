import React from 'react';
import { createRoot } from 'react-dom/client';
import { Estimator } from './public/Estimator.jsx';
import { OwnerPanel } from './owner/OwnerPanel.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>{location.pathname.startsWith('/owner') ? <OwnerPanel /> : <Estimator />}</React.StrictMode>
);
