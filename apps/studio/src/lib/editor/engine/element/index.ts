import type { RemoveElementAction } from '@kumite/models/actions';
import type { CoreElementType, DomElement, DynamicType } from '@kumite/models/element';
import { toast } from '@kumite/ui/use-toast';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { adaptRectToCanvas } from '../overlay/utils';

export class ElementManager {
    private hoveredElement: DomElement | undefined;
    private selectedElements: DomElement[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this, {});
    }

    get hovered() {
        return this.hoveredElement;
    }

    get selected() {
        return this.selectedElements;
    }

    set selected(elements: DomElement[]) {
        this.selectedElements = elements;
    }

    mouseover(domEl: DomElement, webview: Electron.WebviewTag) {
        if (!domEl) {
            this.editorEngine.overlay.state.updateHoverRect(null);
            this.clearHoveredElement();
            return;
        }
        if (this.hoveredElement && this.hoveredElement.domId === domEl.domId) {
            return;
        }

        const webviewEl: DomElement = {
            ...domEl,
            webviewId: webview.id,
        };
        const adjustedRect = adaptRectToCanvas(webviewEl.rect, webview);
        const isComponent = !!domEl.instanceId;
        this.editorEngine.overlay.state.updateHoverRect(adjustedRect, isComponent);
        this.setHoveredElement(webviewEl);
    }

    showMeasurement() {
        this.editorEngine.overlay.removeMeasurement();
        if (!this.selected.length || !this.hovered) {
            return;
        }

        const selectedEl = this.selected[0];
        const hoverEl = this.hovered;

        const webViewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webViewId);
        if (!webview) {
            return;
        }

        const selectedRect = adaptRectToCanvas(selectedEl.rect, webview);
        const hoverRect = adaptRectToCanvas(hoverEl.rect, webview);

        this.editorEngine.overlay.updateMeasurement(selectedRect, hoverRect);
    }

    shiftClick(domEl: DomElement, webview: Electron.WebviewTag) {
        const selectedEls = this.selected;
        const isAlreadySelected = selectedEls.some((el) => el.domId === domEl.domId);
        let newSelectedEls: DomElement[] = [];
        if (isAlreadySelected) {
            newSelectedEls = selectedEls.filter((el) => el.domId !== domEl.domId);
        } else {
            newSelectedEls = [...selectedEls, domEl];
        }
        this.click(newSelectedEls, webview);
    }

    click(domEls: DomElement[], webview: Electron.WebviewTag) {
        this.editorEngine.canvas.activeFrameId = webview.id;
        this.editorEngine.overlay.state.removeClickRects();
        this.clearSelectedElements();

        for (const domEl of domEls) {
            const adjustedRect = adaptRectToCanvas(domEl.rect, webview);
            const isComponent = !!domEl.instanceId;
            this.editorEngine.overlay.state.addClickRect(adjustedRect, domEl.styles, isComponent);
            this.addSelectedElement(domEl);
        }
    }

    async refreshSelectedElements(webview: Electron.WebviewTag) {
        // Only refresh when this webview owns the current selection. A resize of an
        // unrelated frame must not re-anchor the selection (or the active frame) to it.
        const selectedForWebview = this.selected.filter((el) => el.webviewId === webview.id);
        if (selectedForWebview.length === 0) {
            return;
        }

        const newSelected: DomElement[] = [];
        for (const el of selectedForWebview) {
            const newEl: DomElement | null = await webview.executeJavaScript(
                `window.api?.getDomElementByDomId('${el.domId}', true)`,
            );
            if (!newEl) {
                // The element is transiently missing (re-render, HMR). Keep the
                // existing selection instead of clearing it or targeting another node.
                console.error('Element not found');
                return;
            }
            if (newEl.oid !== el.oid || newEl.instanceId !== el.instanceId) {
                // The DOM id now resolves to a different source node. Keeping the
                // selection would silently retarget the next edit.
                console.error('Selected element changed identity; clearing selection');
                this.clearSelectedElements();
                toast({
                    title: 'Selection cleared',
                    description: 'The page changed and the selected element no longer exists. Select it again.',
                });
                return;
            }
            newSelected.push(newEl);
        }
        this.click(newSelected, webview);
    }

    setHoveredElement(element: DomElement) {
        this.hoveredElement = element;
    }

    clearHoveredElement() {
        this.hoveredElement = undefined;
    }

    addSelectedElement(element: DomElement) {
        this.selectedElements.push(element);
    }

    clear() {
        this.clearHoveredElement();
        this.clearSelectedElements();
    }

    private clearSelectedElements() {
        this.selectedElements = [];
    }

    async delete() {
        const selected = this.selected;
        if (selected.length === 0) {
            return;
        }

        for (const selectedEl of selected) {
            const webviewId = selectedEl.webviewId;
            const webview = this.editorEngine.webviews.getWebview(webviewId);
            if (!webview) {
                return;
            }

            const { shouldDelete, error } = await this.shouldDelete(selectedEl, webview);

            if (!shouldDelete) {
                toast({
                    title: 'Cannot delete element',
                    description: error,
                    variant: 'destructive',
                });
                return;
            }

            const removeAction = (await webview.executeJavaScript(
                `window.api?.getRemoveActionFromDomId('${selectedEl.domId}', '${webviewId}')`,
            )) as RemoveElementAction | null;
            if (!removeAction) {
                console.error('Remove action not found');
                toast({
                    title: 'Cannot delete element',
                    description: 'Remove action not found. Try refreshing the page.',
                    variant: 'destructive',
                });
                return;
            }
            const oid = selectedEl.instanceId || selectedEl.oid;
            const codeBlock = await this.editorEngine.code.getCodeBlock(oid);
            if (!codeBlock) {
                toast({
                    title: 'Cannot delete element',
                    description: 'Code block not found. Try refreshing the page.',
                    variant: 'destructive',
                });
                return;
            }

            removeAction.codeBlock = codeBlock;
            this.editorEngine.action.run(removeAction);
        }
    }

    private async shouldDelete(
        selectedEl: DomElement,
        webview: Electron.WebviewTag,
    ): Promise<{
        shouldDelete: boolean;
        error?: string;
    }> {
        const instanceId = selectedEl.instanceId;

        if (!instanceId) {
            const {
                dynamicType,
                coreType,
            }: {
                dynamicType: DynamicType;
                coreType: CoreElementType;
            } = await webview.executeJavaScript(
                `window.api?.getElementType('${selectedEl.domId}')`,
            );

            if (coreType) {
                const CORE_ELEMENTS_MAP: Record<CoreElementType, string> = {
                    'component-root': 'Component Root',
                    'body-tag': 'Body Tag',
                };

                return {
                    shouldDelete: false,
                    error: `This is a ${CORE_ELEMENTS_MAP[coreType]} and cannot be deleted`,
                };
            }

            if (dynamicType) {
                const DYNAMIC_TYPES_MAP: Record<DynamicType, string> = {
                    array: 'Array',
                    conditional: 'Conditional',
                    unknown: 'Unknown',
                };

                return {
                    shouldDelete: false,
                    error: `This element is a(n) ${DYNAMIC_TYPES_MAP[dynamicType]} and cannot be deleted`,
                };
            }
        }

        return {
            shouldDelete: true,
        };
    }
}
