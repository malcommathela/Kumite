import { z } from 'zod';
import { CoreElementTypeEnum, DynamicTypeEnum } from './layers';

export const TemplateTagPositionSchema = z.object({
    line: z.number(),
    column: z.number(),
});

export const TemplateTagSchema = z.object({
    start: TemplateTagPositionSchema,
    end: TemplateTagPositionSchema,
});

/**
 * How a definition leaves its module, proven from the AST at mapping time.
 *
 * - `named`: `export function X`, `export const X`, or `export { X }`
 * - `default`: `export default X` / `export default function X`
 * - `none`: declared in the file but never exported
 *
 * This is deliberately three values and not a free string: a definition that
 * is not exported cannot be imported by a user project, so claiming otherwise
 * would let the engine resolve an identity that no consumer can reach.
 */
export const DefinitionExportKindEnum = z.enum(['named', 'default', 'none']);

/** The exported definition that owns a mapped node. */
export const TemplateNodeDefinitionSchema = z.object({
    name: z.string(),
    path: z.string(),
    exportKind: DefinitionExportKindEnum,
});

/**
 * The enclosing part of a definition, when it differs from the definition
 * itself. `Button` renders through a local `Comp` alias, so its root element is
 * stored as `{ owner: 'Button', name: 'Comp' }`; a node directly inside the
 * exported definition stores `null`.
 */
export const TemplateNodePartSchema = z.object({
    owner: z.string(),
    name: z.string(),
});

export const TemplateNodeSchema = z.object({
    path: z.string(),
    startTag: TemplateTagSchema,
    endTag: TemplateTagSchema.nullable(),
    component: z.string().nullable(),
    dynamicType: DynamicTypeEnum.nullable().optional(),
    coreElementType: CoreElementTypeEnum.nullable().optional(),
    /** Additive: mappings created before the component engine have neither field. */
    definition: TemplateNodeDefinitionSchema.nullable().optional(),
    part: TemplateNodePartSchema.nullable().optional(),
});

export type TemplateNode = z.infer<typeof TemplateNodeSchema>;
export type TemplateTag = z.infer<typeof TemplateTagSchema>;
export type TemplateTagPosition = z.infer<typeof TemplateTagPositionSchema>;
export type DefinitionExportKind = z.infer<typeof DefinitionExportKindEnum>;
export type TemplateNodeDefinition = z.infer<typeof TemplateNodeDefinitionSchema>;
export type TemplateNodePart = z.infer<typeof TemplateNodePartSchema>;
