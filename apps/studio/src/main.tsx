import { createRoot } from 'react-dom/client';
import App from './App';
import '@kumite/ui/globals.css';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
