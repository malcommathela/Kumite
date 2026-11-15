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
            <div className="relative flex min-h-0 flex-1 flex-row select-none overflow-hidden">
                <Canvas>
                    <WebviewArea />
                </Canvas>

                <div className="fixed left-0 top-20 h-[calc(100%-5rem)] animate-layer-panel-in">
                    <LayersPanel />
                </div>

                <div className="fixed right-0 top-20 h-[calc(100%-5rem)] animate-edit-panel-in p-2">
                    <EditPanel />
                </div>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up">
                    <Toolbar />
                </div>

                <div className="absolute top-0 w-full">
                    <EditorTopBar />
                </div>
            </div>
            <HotkeysModal />
        </>
    );
}
