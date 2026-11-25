import { Canvas } from './Canvas';
import { EditPanel } from './EditPanel';
import { HotkeysModal } from './HotkeysModal';
import { LayersPanel } from './LayersPanel';
import { Toolbar } from './Toolbar';
import { WebviewArea } from './WebviewArea';

export function ProjectEditor() {
    return (
        <>
            <div className="relative flex min-h-0 flex-1 flex-row select-none overflow-hidden bg-background">
                <LayersPanel />

                <main className="relative flex min-w-0 flex-1 flex-col bg-background">
                    <section aria-label="Canvas workspace" className="relative flex min-h-0 flex-1">
                        <Canvas>
                            <WebviewArea />
                        </Canvas>
                        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 animate-toolbar-up">
                            <Toolbar />
                        </div>
                    </section>
                </main>

                <EditPanel />
            </div>
            <HotkeysModal />
        </>
    );
}
