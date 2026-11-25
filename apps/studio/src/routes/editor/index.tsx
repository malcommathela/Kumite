import { Canvas } from './Canvas';
import { EditPanel } from './EditPanel';
import { HotkeysModal } from './HotkeysModal';
import { LayersPanel } from './LayersPanel';
import { Toolbar } from './Toolbar';
import { EditorTopBar } from './TopBar';
import { WebviewArea } from './WebviewArea';

export function ProjectEditor() {
    return (
        <>
            <div className="relative flex min-h-0 flex-1 flex-row select-none overflow-hidden bg-background">
                <LayersPanel />

                <div className="relative flex min-w-0 flex-1 flex-col">
                    <EditorTopBar />
                    <div className="relative flex min-h-0 flex-1">
                        <Canvas>
                            <WebviewArea />
                        </Canvas>
                        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 animate-toolbar-up">
                            <Toolbar />
                        </div>
                    </div>
                </div>

                <EditPanel />
            </div>
            <HotkeysModal />
        </>
    );
}
