import { invokeMainChannel } from '@/lib/utils';
import { EditorAttributes, MainChannels } from '@kumite/models/constants';
import type { LayerNode, TemplateNode } from '@kumite/models/element';
import type { WebviewTag } from 'electron';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { LayersManager } from './layers';

type TemplateNodeChildLookup =
    | { ok: true; instanceId: string; component: string }
    | { ok: false; reason: string; message: string };

export class AstManager {
    private layersManager: LayersManager;

    constructor(private editorEngine: EditorEngine) {
        this.layersManager = new LayersManager(editorEngine);
        makeAutoObservable(this);
    }

    get mappings() {
        return this.layersManager;
    }

    setMapRoot(
        webviewId: string,
        root: Element,
        rootNode: LayerNode,
        layerMap: Map<string, LayerNode>,
    ) {
        this.mappings.setMetadata(webviewId, root.ownerDocument, rootNode, layerMap);
        this.processNode(webviewId, rootNode);
    }

    updateMap(webviewId: string, newMap: Map<string, LayerNode>, domId: string | null) {
        this.mappings.addNewMapping(webviewId, newMap);
        const node = domId ? this.mappings.getLayerNode(webviewId, domId) : null;
        if (!node) {
            console.warn('Failed to replaceElement: Node not found');
            return;
        }
        this.processNode(webviewId, node);
    }

    processNode(webviewId: string, node: LayerNode) {
        this.dfs(webviewId, node, (n) => {
            this.processNodeForMap(webviewId, n);
        });
    }

    dfs(webviewId: string, root: LayerNode, callback: (node: LayerNode) => void) {
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (!node) {
                continue;
            }
            callback(node);
            if (node.children) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    const childLayerNode = this.mappings.getLayerNode(webviewId, node.children[i]);
                    if (childLayerNode) {
                        stack.push(childLayerNode);
                    }
                }
            }
        }
    }

    private async processNodeForMap(webviewId: string, node: LayerNode) {
        if (!node.oid) {
            console.warn('Failed to processNodeForMap: No oid found');
            return;
        }
        const templateNode = await this.getTemplateNodeById(node.oid);
        if (!templateNode) {
            console.warn('Failed to processNodeForMap: Template node not found');
            return;
        }

        // Check if node needs type assignment
        const hasSpecialType = templateNode.dynamicType || templateNode.coreElementType;
        if (!hasSpecialType) {
            this.findNodeInstance(webviewId, node, node, templateNode);
            return;
        }

        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.warn('Failed: Webview not found');
            return;
        }

        if (templateNode.dynamicType) {
            node.dynamicType = templateNode.dynamicType;
        }

        if (templateNode.coreElementType) {
            node.coreElementType = templateNode.coreElementType;
        }

        webview.executeJavaScript(
            `window.api?.setElementType(
            '${node.domId}', 
            ${templateNode.dynamicType ? `'${templateNode.dynamicType}'` : 'undefined'}, 
            ${templateNode.coreElementType ? `'${templateNode.coreElementType}'` : 'undefined'}
        )`,
        );
        this.findNodeInstance(webviewId, node, node, templateNode);
    }

    private async findNodeInstance(
        webviewId: string,
        originalNode: LayerNode,
        node: LayerNode,
        templateNode: TemplateNode,
    ) {
        if (node.tagName.toLocaleLowerCase() === 'body') {
            return;
        }
        if (!node.parent) {
            console.warn('Failed to findNodeInstance: Parent id not found');
            return;
        }

        const parent = this.mappings.getLayerNode(webviewId, node.parent);
        if (!parent) {
            console.warn('Failed to findNodeInstance: Parent not found in layer map');
            return;
        }

        if (!parent.oid) {
            console.warn('Failed to findNodeInstance: Parent has no oid');
            return;
        }
        const parentTemplateNode = await this.getTemplateNodeById(parent.oid);
        if (!parentTemplateNode) {
            console.warn('Failed to findNodeInstance: Parent template node not found');
            return;
        }

        if (parentTemplateNode.component !== templateNode.component) {
            const htmlParent = this.getElementFromDomId(parent.domId, webviewId);
            if (!htmlParent) {
                console.warn('Failed to findNodeInstance: Parent node not found');
                return;
            }
            const children = htmlParent.querySelectorAll(
                `[${EditorAttributes.DATA_KUMITE_ID}='${originalNode.oid}']`,
            );
            const htmlOriginalNode = this.getElementFromDomId(originalNode.domId, webviewId);
            if (!htmlOriginalNode) {
                console.warn('Failed to findNodeInstance: Original node not found');
                return;
            }
            const index = Array.from(children).indexOf(htmlOriginalNode);
            const res = await invokeMainChannel<unknown, TemplateNodeChildLookup>(
                MainChannels.GET_TEMPLATE_NODE_CHILD,
                {
                    parent: parentTemplateNode,
                    child: templateNode,
                    index,
                },
            );
            if (res?.ok) {
                originalNode.instanceId = res.instanceId;
                originalNode.component = res.component;
                this.updateElementInstance(
                    webviewId,
                    originalNode.domId,
                    res.instanceId,
                    res.component,
                );
                return;
            }
            if (res?.reason === 'ambiguous-candidate' || res?.reason === 'unsupported-component-name') {
                // Do not guess an instance boundary; leave the element without one.
                console.warn(`Instance boundary not resolved: ${res.message}`);
                return;
            }
            await this.findNodeInstance(webviewId, originalNode, parent, templateNode);

        }
    }

    getElementFromDomId(domId: string, webviewId: string): HTMLElement | null {
        const doc = this.mappings.getMetadata(webviewId)?.document;
        if (!doc) {
            console.warn('Failed to getNodeFromDomId: Document not found');
            return null;
        }
        return doc.querySelector(`[${EditorAttributes.DATA_KUMITE_DOM_ID}='${domId}']`) || null;
    }

    async getTemplateNodeById(oid: string | null): Promise<TemplateNode | null> {
        if (!oid) {
            console.warn('Failed to getTemplateNodeById: No oid found');
            return null;
        }
        return invokeMainChannel(MainChannels.GET_TEMPLATE_NODE, { id: oid });
    }

    updateElementInstance(webviewId: string, domId: string, instanceId: string, component: string) {
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.warn('Failed to updateElementInstanceId: Webview not found');
            return;
        }
        webview.executeJavaScript(
            `window.api?.updateElementInstance('${domId}', '${instanceId}', '${component}')`,
        );
    }

    clear() {
        this.layersManager.clear();
    }

    async refreshAstDoc(webview: WebviewTag) {
        const root = await this.getBodyFromWebview(webview);
        this.mappings.updateDocument(webview.id, root.ownerDocument);
    }

    async getBodyFromWebview(webview: WebviewTag) {
        const htmlString = await webview.executeJavaScript('document.documentElement.outerHTML');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        return doc.body;
    }
}
