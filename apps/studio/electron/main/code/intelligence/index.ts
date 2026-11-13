import type * as t from '@babel/types';
import type { TemplateNode } from '@kumite/models/element';
import {
    getCapabilities,
    type ComponentCapabilities,
} from './capabilities';
import {
    describeCallSite,
    resolveOwnership,
    type CallSiteComposition,
    type OwnershipResolution,
} from './composition';
import {
    buildDefinitionRegistry,
    type ComponentDefinition,
    type DefinitionRegistry,
    type IndexedFile,
} from './definitions';
import { extractContent, type NodeContent } from './content';
import { COMPONENT_ADAPTERS } from './adapters';
import {
    FingerprintStore,
    type FingerprintCheck,
    type NodeFingerprint,
    type WatchEvent,
} from './fingerprints';
import type { Lookup } from './types';

export * from './types';
export * from './definitions';
export * from './composition';
export * from './capabilities';
export * from './content';
export * from './adapters';
export * from './fingerprints';

/**
 * One engine for every installable component.
 *
 * It is built from the files the run manager already mapped, so definition
 * identities, composition and capabilities describe the same source an edit
 * can reach. There is no per-component implementation: a new shadcn component
 * is measured by the same AST rules as the five in the catalog.
 *
 * The engine is read-only. `fingerprints` records what an edit observed, and
 * Stage 3 decides whether a write is allowed; this class never writes files.
 */
export class ComponentIntelligence {
    readonly registry: DefinitionRegistry;
    readonly fingerprints: FingerprintStore;

    constructor(files: IndexedFile[], fingerprints: FingerprintStore = new FingerprintStore()) {
        this.registry = buildDefinitionRegistry(files);
        this.fingerprints = fingerprints;
    }

    definition(path: string, name: string): Lookup<ComponentDefinition> {
        const definition = this.registry.definition(path, name);
        if (!definition) {
            return {
                ok: false,
                reason: 'component-not-found',
                message: `${name} is not a top-level definition in ${path}.`,
            };
        }
        return { ok: true, value: definition };
    }

    /** Re-verifies the definition/part identity a mapping recorded on a node. */
    ownership(node: TemplateNode): OwnershipResolution {
        return resolveOwnership(this.registry, node);
    }

    /** Resolves what a JSX element renders, with the evidence that proved it. */
    callSite(fromPath: string, element: t.JSXElement | string): CallSiteComposition {
        return describeCallSite(this.registry, fromPath, element);
    }

    /** Measures one definition's editable surface from the AST. */
    capabilities(path: string, name: string): Lookup<ComponentCapabilities> {
        return getCapabilities(this.registry, path, name);
    }

    /** Extracts the text, attribute and data fields a node can edit as content. */
    content(node: TemplateNode): Lookup<NodeContent> {
        const file = this.registry.get(node.path);
        if (!file) {
            return {
                ok: false,
                reason: 'file-not-indexed',
                message: `The mapped file is not part of this engine index (${node.path}).`,
            };
        }
        return extractContent(file.ast, node, COMPONENT_ADAPTERS);
    }

    recordFile(path: string, content: string) {
        return this.fingerprints.recordFile(path, content);
    }

    recordNode(node: TemplateNode, content: string): NodeFingerprint | null {
        return this.fingerprints.recordNode(node, content);
    }

    verifyNode(node: TemplateNode, content: string | null): FingerprintCheck {
        return this.fingerprints.verifyNode(node, content);
    }

    /** Drops the fingerprints of a file the watcher reports as changed. */
    handleFileEvent(event: WatchEvent): void {
        this.fingerprints.handleFileEvent(event);
    }
}
