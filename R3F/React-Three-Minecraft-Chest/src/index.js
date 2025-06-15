import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const suppressedWarnings = ['Failed to parse source map from'];

const originalWarn = console.warn;
console.warn = function (...args) {
	if (suppressedWarnings.some((entry) => args[0] && args[0].includes(entry))) {
		return;
	}
	originalWarn.apply(console, args);
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
