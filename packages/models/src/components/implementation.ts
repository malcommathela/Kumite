import { z } from 'zod';

export const IMPLEMENTATION_PROVIDERS = ['shadcn', '21st-dev', 'magic-ui'] as const;
export const IMPLEMENTATION_KINDS = ['component', 'example', 'block'] as const;

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const ImplementationArtifactSchema = z.object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    provider: z.enum(IMPLEMENTATION_PROVIDERS),
    source: z.object({
        name: z.string().min(1),
        version: z.string().optional(),
        commit: z.string().optional(),
        registryUrl: z.string().url(),
        sourceUrl: z.string().url(),
        retrievedAt: z.string().datetime(),
        provenance: z.enum(['official', 'fallback']),
        registryItems: z.array(
            z.object({
                name: z.string().min(1),
                type: z.string().min(1),
                url: z.string().url(),
                sha256,
                description: z.string().optional(),
                categories: z.array(z.string()),
                dependencies: z.array(z.string()),
                registryDependencies: z.array(z.string()),
                files: z.array(z.string()),
            }),
        ),
    }),
    metadata: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(IMPLEMENTATION_KINDS),
        tags: z.array(z.string()),
    }),
    entryPoint: z.string().min(1),
    files: z.array(
        z.object({
            path: z.string().min(1),
            content: z.string(),
            role: z.enum([
                'entry',
                'component',
                'hook',
                'utility',
                'stylesheet',
                'demo-data',
                'configuration',
                'source',
            ]),
            sourceUrl: z.string().url(),
            sha256,
            registryType: z.string().optional(),
            target: z.string().optional(),
        }),
    ),
    dependencies: z.array(
        z.object({
            name: z.string().min(1),
            version: z.string().optional(),
        }),
    ),
    assets: z.array(
        z.object({
            path: z.string().min(1),
            source: z.string().url(),
            mediaType: z.string(),
            sha256: sha256.optional(),
            size: z.number().int().nonnegative().optional(),
            cachePath: z.string().optional(),
            external: z.boolean(),
            referencedBy: z.array(z.string()),
        }),
    ),
    graph: z.object({
        edges: z.array(
            z.object({
                from: z.string(),
                to: z.string(),
                kind: z.enum(['import', 'registry', 'asset']),
            }),
        ),
        cycles: z.array(z.array(z.string())),
    }),
    requirements: z.object({
        providers: z.array(z.string()),
        configuration: z.array(z.string()),
    }),
    demo: z.object({
        available: z.boolean(),
        preserved: z.boolean(),
        files: z.array(z.string()),
        editable: z.boolean(),
    }),
    integrity: z.object({
        sourceHash: sha256,
        artifactHash: sha256,
    }),
});

export type ImplementationArtifact = z.infer<typeof ImplementationArtifactSchema>;
export type ImplementationKind = (typeof IMPLEMENTATION_KINDS)[number];
export type ImplementationProvider = (typeof IMPLEMENTATION_PROVIDERS)[number];

export interface ImplementationRequest {
    provider: ImplementationProvider;
    kind: ImplementationKind;
    name: string;
    registryUrl?: string;
}

export function serializeImplementationArtifact(artifact: ImplementationArtifact): string {
    return `${JSON.stringify(ImplementationArtifactSchema.parse(artifact), null, 2)}\n`;
}

export function deserializeImplementationArtifact(serialized: string): ImplementationArtifact {
    return ImplementationArtifactSchema.parse(JSON.parse(serialized));
}
