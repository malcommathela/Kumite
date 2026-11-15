import { getTailwindClasses } from '@/lib/editor/engine/code/helpers';
import {
    getAlignPlan,
    getDistributePlan,
    getLayoutKind,
    type ParentLayout,
} from '@kumite/models/element';
import { StyleChangeType } from '@kumite/models/style';
import { describe, expect, it } from 'bun:test';

function layout(overrides: Partial<ParentLayout> = {}): ParentLayout {
    return {
        display: 'block',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        direction: 'ltr',
        ...overrides,
    };
}

const single = { count: 1, allBlockLevel: true };

describe('getLayoutKind', () => {
    it('normalizes inline flex and grid', () => {
        expect(getLayoutKind('inline-flex')).toBe('flex');
        expect(getLayoutKind('inline-grid')).toBe('grid');
        expect(getLayoutKind('inline-block')).toBe('block');
        expect(getLayoutKind('contents')).toBe('contents');
    });
});

describe('getAlignPlan', () => {
    it('aligns block children with auto margins', () => {
        expect(getAlignPlan('left', layout(), single)).toEqual({
            target: 'elements',
            styles: { marginLeft: '0', marginRight: 'auto' },
        });
        expect(getAlignPlan('center', layout(), single)).toEqual({
            target: 'elements',
            styles: { marginLeft: 'auto', marginRight: 'auto' },
        });
        expect(getAlignPlan('right', layout(), single)).toEqual({
            target: 'elements',
            styles: { marginLeft: 'auto', marginRight: '0' },
        });
    });

    it('refuses vertical alignment in flow layout', () => {
        const plan = getAlignPlan('top', layout(), single);
        expect(plan.target).toBe('unsupported');
        expect(plan.target === 'unsupported' && plan.reason).toMatch(/flex or grid/);
    });

    it('refuses block alignment for inline boxes', () => {
        const plan = getAlignPlan('center', layout(), { count: 1, allBlockLevel: false });
        expect(plan.target).toBe('unsupported');
    });

    it('uses auto margins for a single flex item on the main axis', () => {
        expect(getAlignPlan('right', layout({ display: 'flex' }), single)).toEqual({
            target: 'elements',
            styles: { marginLeft: 'auto', marginRight: '0' },
        });
        expect(
            getAlignPlan('top', layout({ display: 'flex', flexDirection: 'column' }), single),
        ).toEqual({
            target: 'elements',
            styles: { marginTop: '0', marginBottom: 'auto' },
        });
    });

    it('aligns several flex items through the parent on the main axis', () => {
        expect(
            getAlignPlan('center', layout({ display: 'flex' }), { ...single, count: 2 }),
        ).toEqual({
            target: 'parent',
            styles: { justifyContent: 'center' },
        });
    });

    it('aligns flex items individually on the cross axis', () => {
        expect(
            getAlignPlan('bottom', layout({ display: 'flex' }), { ...single, count: 3 }),
        ).toEqual({
            target: 'elements',
            styles: { alignSelf: 'flex-end' },
        });
        expect(
            getAlignPlan('left', layout({ display: 'flex', flexDirection: 'column' }), {
                ...single,
                count: 3,
            }),
        ).toEqual({
            target: 'elements',
            styles: { alignSelf: 'flex-start' },
        });
    });

    it('maps physical edges for reversed and rtl flex rows', () => {
        expect(
            getAlignPlan('left', layout({ display: 'flex', flexDirection: 'row-reverse' }), single),
        ).toEqual({
            target: 'elements',
            styles: { marginLeft: '0', marginRight: 'auto' },
        });
        expect(getAlignPlan('left', layout({ display: 'flex', direction: 'rtl' }), single)).toEqual(
            {
                target: 'elements',
                styles: { marginLeft: '0', marginRight: 'auto' },
            },
        );
    });

    it('uses grid self alignment', () => {
        expect(getAlignPlan('right', layout({ display: 'grid' }), single)).toEqual({
            target: 'elements',
            styles: { justifySelf: 'end' },
        });
        expect(getAlignPlan('middle', layout({ display: 'grid' }), single)).toEqual({
            target: 'elements',
            styles: { alignSelf: 'center' },
        });
    });

    it('refuses display: contents parents', () => {
        const plan = getAlignPlan('left', layout({ display: 'contents' }), single);
        expect(plan.target).toBe('unsupported');
    });
});

describe('getDistributePlan', () => {
    it('distributes flex items on the main axis', () => {
        expect(getDistributePlan('horizontal', layout({ display: 'flex' }))).toEqual({
            target: 'parent',
            styles: { justifyContent: 'space-between' },
        });
    });

    it('refuses cross-axis distribution for a single-line flex container', () => {
        const plan = getDistributePlan('vertical', layout({ display: 'flex' }));
        expect(plan.target).toBe('unsupported');
        expect(plan.target === 'unsupported' && plan.reason).toMatch(/flex-wrap/);
    });

    it('distributes wrapped flex lines', () => {
        expect(
            getDistributePlan('vertical', layout({ display: 'flex', flexWrap: 'wrap' })),
        ).toEqual({
            target: 'parent',
            styles: { alignContent: 'space-between' },
        });
    });

    it('distributes grid tracks', () => {
        expect(getDistributePlan('vertical', layout({ display: 'grid' }))).toEqual({
            target: 'parent',
            styles: { alignContent: 'space-between' },
        });
    });

    it('refuses flow layout', () => {
        expect(getDistributePlan('horizontal', layout()).target).toBe('unsupported');
    });
});

describe('layout styles translate to minimal Tailwind classes', () => {
    const style = (value: string) => ({ value, type: StyleChangeType.Value });

    it('emits alignment utilities instead of pixel offsets', () => {
        expect(
            getTailwindClasses('oid', {
                marginLeft: style('auto'),
                marginRight: style('0'),
                alignSelf: style('flex-end'),
                justifySelf: style('center'),
                justifyContent: style('space-between'),
                alignContent: style('space-between'),
            }),
        ).toEqual(['ml-auto mr-0 self-end justify-self-center justify-between content-between']);
    });
});
