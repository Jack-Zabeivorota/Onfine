import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './view/App';

import './index.css';
import './styles/scroll.css';
import './styles/ui_btn.css';
import './styles/ui_chip.css';
import './styles/ui_close_btn.css';
import './styles/ui_icon_btn.css';
import './styles/ui_link.css';
import './styles/ui_actions.css';

const root = createRoot(document.getElementById('root'));

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
