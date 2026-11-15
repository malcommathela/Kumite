export type AlignDirection = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export type DistributeAxis = 'horizontal' | 'vertical';

export interface ParentLayout {
    display: string;
    flexDirection: string;
    flexWrap: string;
    direction: string;
}

export type LayoutKind = 'flex' | 'grid' | 'block' | 'inline' | 'contents';

export type LayoutPlan =
    | { target: 'parent'; styles: Record<string, string> }
    | { target: 'elements'; styles: Record<string, string> }
    | { target: 'unsupported'; reason: string };

type Edge = 'left' | 'right' | 'top' | 'bottom';
type Axis = 'horizontal' | 'vertical';
type EdgePosition = 'start' | 'end' | 'center';

interface AlignmentAxes {
    mainAxis: Axis;
    mainStart: Edge;
    crossStart: Edge;
}

export function getLayoutKind(display: string): LayoutKind {
    const value = (display || 'block').trim().toLowerCase();
    if (value === 'flex' || value === 'inline-flex') {
        return 'flex';
    }
    if (value === 'grid' || value === 'inline-grid') {
        return 'grid';
    }
    if (value === 'contents') {
        return 'contents';
    }
    if (value === 'inline') {
        return 'inline';
    }
    return 'block';
}

/** Margins do not position non-replaced inline boxes. */
export function isInlineLevel(display: string): boolean {
    const value = (display || '').trim().toLowerCase();
    return value === 'inline' || value === 'inline flow' || value === 'inline flow-root';
}

export function getAlignPlan(
    direction: AlignDirection,
    layout: ParentLayout,
    options: { count: number; allBlockLevel: boolean },
): LayoutPlan {
    const kind = getLayoutKind(layout.display);

    if (kind === 'contents') {
        return unsupported(
            'This element is inside a display: contents wrapper. Align the flex or grid container instead.',
        );
    }
    if (kind === 'inline') {
        return unsupported(
            'Alignment is not supported inside an inline parent. Use a block, flex, or grid parent.',
        );
    }

    if (kind === 'block') {
        if (axisOf(direction) === 'horizontal' && !options.allBlockLevel) {
            return unsupported(
                'Inline elements cannot be positioned with margins. Set the element display to block or inline-block first.',
            );
        }
        const styles = getBlockAlignStyles(direction);
        return styles
            ? { target: 'elements', styles }
            : unsupported('Vertical alignment needs a flex or grid parent.');
    }

    if (kind === 'flex') {
        const axes = getFlexAxes(layout);
        const position = edgeOf(direction, axes);
        if (axisOf(direction) === axes.mainAxis) {
            // A flex main axis has no per-item alignment property. Auto margins
            // position one item; several items are aligned through the parent.
            if (options.count > 1) {
                return {
                    target: 'parent',
                    styles: { justifyContent: flexAlignment(position) },
                };
            }
            return { target: 'elements', styles: getAutoMarginStyles(position, axes) };
        }
        return { target: 'elements', styles: { alignSelf: flexAlignment(position) } };
    }

    const axes = getGridAxes(layout);
    const position = edgeOf(direction, axes);
    if (axisOf(direction) === 'horizontal') {
        return { target: 'elements', styles: { justifySelf: selfAlignment(position) } };
    }
    return { target: 'elements', styles: { alignSelf: flexAlignment(position) } };
}

export function getDistributePlan(axis: DistributeAxis, layout: ParentLayout): LayoutPlan {
    const kind = getLayoutKind(layout.display);

    if (kind === 'contents') {
        return unsupported(
            'This element is inside a display: contents wrapper. Distribute the flex or grid container instead.',
        );
    }
    if (kind === 'inline' || kind === 'block') {
        return unsupported('Distribute needs a flex or grid parent.');
    }

    if (kind === 'flex') {
        const axes = getFlexAxes(layout);
        if (axis === axes.mainAxis) {
            return { target: 'parent', styles: { justifyContent: 'space-between' } };
        }
        if (!isWrapping(layout.flexWrap)) {
            return unsupported(
                'A single-line flex container has no free cross-axis space. Enable flex-wrap on the parent first.',
            );
        }
        return { target: 'parent', styles: { alignContent: 'space-between' } };
    }

    return {
        target: 'parent',
        styles:
            axis === 'horizontal'
                ? { justifyContent: 'space-between' }
                : { alignContent: 'space-between' },
    };
}

function unsupported(reason: string): LayoutPlan {
    return { target: 'unsupported', reason };
}

function axisOf(direction: AlignDirection): Axis {
    return direction === 'left' || direction === 'center' || direction === 'right'
        ? 'horizontal'
        : 'vertical';
}

function edgeOf(direction: AlignDirection, axes: AlignmentAxes): EdgePosition {
    if (direction === 'center' || direction === 'middle') {
        return 'center';
    }
    const start = axisOf(direction) === axes.mainAxis ? axes.mainStart : axes.crossStart;
    return direction === start ? 'start' : 'end';
}

function opposite(edge: Edge): Edge {
    switch (edge) {
        case 'left':
            return 'right';
        case 'right':
            return 'left';
        case 'top':
            return 'bottom';
        case 'bottom':
            return 'top';
    }
}

function isRtl(layout: ParentLayout): boolean {
    return (layout.direction || 'ltr').trim().toLowerCase() === 'rtl';
}

function getFlexAxes(layout: ParentLayout): AlignmentAxes {
    const direction = (layout.flexDirection || 'row').trim().toLowerCase();
    const reverse = direction.endsWith('-reverse');
    const rtl = isRtl(layout);

    if (direction.startsWith('row')) {
        const mainStart: Edge = rtl !== reverse ? 'right' : 'left';
        return { mainAxis: 'horizontal', mainStart, crossStart: 'top' };
    }
    return {
        mainAxis: 'vertical',
        mainStart: reverse ? 'bottom' : 'top',
        crossStart: rtl ? 'right' : 'left',
    };
}

function getGridAxes(layout: ParentLayout): AlignmentAxes {
    return {
        mainAxis: 'horizontal',
        mainStart: isRtl(layout) ? 'right' : 'left',
        crossStart: 'top',
    };
}

function isWrapping(flexWrap: string): boolean {
    return (flexWrap || 'nowrap').trim().toLowerCase() !== 'nowrap';
}

function getBlockAlignStyles(direction: AlignDirection): Record<string, string> | null {
    switch (direction) {
        case 'left':
            return { marginLeft: '0', marginRight: 'auto' };
        case 'center':
            return { marginLeft: 'auto', marginRight: 'auto' };
        case 'right':
            return { marginLeft: 'auto', marginRight: '0' };
        default:
            return null;
    }
}

function getAutoMarginStyles(position: EdgePosition, axes: AlignmentAxes): Record<string, string> {
    const startKey = marginKey(axes.mainStart);
    const endKey = marginKey(opposite(axes.mainStart));
    if (position === 'center') {
        return { [startKey]: 'auto', [endKey]: 'auto' };
    }
    if (position === 'start') {
        return { [startKey]: '0', [endKey]: 'auto' };
    }
    return { [startKey]: 'auto', [endKey]: '0' };
}

function marginKey(edge: Edge): string {
    switch (edge) {
        case 'left':
            return 'marginLeft';
        case 'right':
            return 'marginRight';
        case 'top':
            return 'marginTop';
        case 'bottom':
            return 'marginBottom';
    }
}

function flexAlignment(position: EdgePosition): string {
    return position === 'center' ? 'center' : position === 'start' ? 'flex-start' : 'flex-end';
}

function selfAlignment(position: EdgePosition): string {
    return position === 'center' ? 'center' : position === 'start' ? 'start' : 'end';
}
