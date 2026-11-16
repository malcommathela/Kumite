import { Toaster } from '@kumite/ui/toaster';
import { TooltipProvider } from '@kumite/ui/tooltip';
import { I18nextProvider } from 'react-i18next';
import { AppBar } from './components/AppBar';
import { Modals } from './components/Modals';
import { ThemeProvider } from './components/ThemeProvider';
import i18n from './i18n';
import '@fontsource-variable/inter';
import '@fontsource/instrument-serif';
import { Routes } from './routes';

function App() {
    return (
        <I18nextProvider i18n={i18n}>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <TooltipProvider>
                    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
                        <AppBar />
                        <Routes />
                        <Modals />
                        <Toaster />
                    </div>
                </TooltipProvider>
            </ThemeProvider>
        </I18nextProvider>
    );
}

export default App;
