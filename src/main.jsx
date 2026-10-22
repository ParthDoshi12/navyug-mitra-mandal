import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './store';
import { I18nProvider } from './lib/i18n';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </I18nProvider>
  </React.StrictMode>,
);
