import { z } from 'zod';

const BaseActionLocationSchema = z.object({
    type: z.enum(['prepend', 'append']),
    targetDomId: z.string(),
    targetOid: z.string().nullable(),
});

export const IndexActionLocationSchema = BaseActionLocationSchema.extend({
    type: z.literal('index'),
    index: z.number(),
    originalIndex: z.number(),
    /**
     * Present when the element moved between parents. The target fields above
     * describe the new parent, so undo needs the old one to move it back.
     */
    originalParentDomId: z.string().optional(),
    originalParentOid: z.string().nullable().optional(),
});

export const ActionLocationSchema = z.discriminatedUnion('type', [
    IndexActionLocationSchema,
    BaseActionLocationSchema,
]);

export type ActionLocation = z.infer<typeof ActionLocationSchema>;
export type IndexActionLocation = z.infer<typeof IndexActionLocationSchema>;
