import type {
    AlignDirection,
    DistributeAxis,
    DomElement,
    LayoutPlan,
    ParentLayout,
} from '@kumite/models/element';
import { getAlignPlan, getDistributePlan, isInlineLevel } from '@kumite/models/element';
import { toast } from '@kumite/ui/use-toast';
import type { EditorEngine } from '..';

interface LayoutContext {
    parent: DomElement;
    layout: ParentLayout;
}

export class LayoutManager {
    constructor(private editorEngine: EditorEngine) {}

    canAlign(): boolean {
        return this.getParentTarget() !== null;
    }

    canDistribute(): boolean {
        return this.editorEngine.elements.selected.length >= 3 && this.getParentTarget() !== null;
    }

    async align(direction: AlignDirection) {
        const context = await this.getContext();
        if (!context) {
            return;
        }
        const selected = this.editorEngine.elements.selected;
        const plan = getAlignPlan(direction, context.layout, {
            count: selected.length,
            allBlockLevel: selected.every(
                (el) => !isInlineLevel(el.styles?.computed?.display ?? ''),
            ),
        });
        this.runPlan(plan, context.parent);
    }

    async distribute(axis: DistributeAxis) {
        if (this.editorEngine.elements.selected.length < 3) {
            this.refuse('Select at least three elements to distribute.');
            return;
        }
        const context = await this.getContext();
        if (!context) {
            return;
        }
        this.runPlan(getDistributePlan(axis, context.layout), context.parent);
    }

    private runPlan(plan: LayoutPlan, parent: DomElement) {
        if (plan.target === 'unsupported') {
            this.refuse(plan.reason);
            return;
        }
        if (plan.target === 'parent') {
            this.editorEngine.style.updateElement(parent, plan.styles);
            return;
        }
        this.editorEngine.style.updateMultiple(plan.styles);
    }

    private refuse(description: string) {
        toast({
            title: 'Layout action unavailable',
            description,
            variant: 'destructive',
        });
    }

    private getParentTarget() {
        return this.editorEngine.group.getGroupParentId(this.editorEngine.elements.selected, false);
    }

    private async getContext(): Promise<LayoutContext | null> {
        const target = this.getParentTarget();
        if (!target) {
            this.refuse('Select elements that share one parent in the same frame.');
            return null;
        }
        const webview = this.editorEngine.webviews.getWebview(target.webviewId);
        if (!webview) {
            return null;
        }
        const parent: DomElement | null = await webview.executeJavaScript(
            `window.api?.getDomElementByDomId('${target.parentDomId}', true)`,
        );
        if (!parent) {
            this.refuse(
                'The parent element is no longer available. Refresh the page and try again.',
            );
            return null;
        }
        const computed = parent.styles?.computed ?? {};
        return {
            parent,
            layout: {
                display: computed.display ?? 'block',
                flexDirection: computed.flexDirection ?? 'row',
                flexWrap: computed.flexWrap ?? 'nowrap',
                direction: computed.direction ?? 'ltr',
            },
        };
    }

    dispose() {
        this.editorEngine = null as any;
    }
}
