import './styles/main.css';
import { AppController } from './ui/appController';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element #app not found in document.');
    return;
  }

  const app = new AppController(root);
  app.init();
});
