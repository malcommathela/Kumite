import {
    SHADCN_BLOCKS,
    SHADCN_COMPONENTS,
    type ShadcnBlockDefinition,
    type ShadcnComponentDefinition,
} from '@kumite/models';
import { Button } from '@kumite/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@kumite/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { cn } from '@kumite/ui/utils';
import {
    ArrowUpRight,
    Blocks,
    Check,
    ChevronDown,
    Component,
    Copy,
    Package,
    Search,
    Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from './Home';

type CatalogKind = 'component' | 'block';

interface CatalogItem {
    kind: CatalogKind;
    name: string;
    title: string;
    description: string;
    dependencies: string[];
    parts: string[];
    installCommand: string;
    agentPrompt: string;
}

const COMPONENT_ITEMS: CatalogItem[] = SHADCN_COMPONENTS.map((item: ShadcnComponentDefinition) => ({
    kind: 'component',
    name: item.name,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
    parts: item.parts,
    installCommand: `npx shadcn@3.7.0 add ${item.name}`,
    agentPrompt: `Use the shadcn/ui ${item.title} (${item.name}) component. ${item.description} Insert this JSX with the project's existing tokens:\n\n${item.insertCode}`,
}));

const BLOCK_ITEMS: CatalogItem[] = SHADCN_BLOCKS.map((item: ShadcnBlockDefinition) => ({
    kind: 'block',
    name: item.name,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
    parts: item.files,
    installCommand: `npx shadcn@3.7.0 add ${item.registryUrl}`,
    agentPrompt: `Use the shadcn/ui ${item.title} block (${item.name}). ${item.description} Install it with \`npx shadcn@3.7.0 add ${item.registryUrl}\` and adapt the copy and colors to the project.`,
}));

const ITEMS = [...COMPONENT_ITEMS, ...BLOCK_ITEMS];

type Filter = 'all' | CatalogKind;

export const LibraryView = () => {
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<'featured' | 'az'>('featured');
    const [selected, setSelected] = useState<CatalogItem | null>(null);

    const items = useMemo(() => {
        const term = query.trim().toLowerCase();
        const filtered = ITEMS.filter((item) => filter === 'all' || item.kind === filter).filter(
            (item) =>
                !term ||
                item.title.toLowerCase().includes(term) ||
                item.description.toLowerCase().includes(term) ||
                item.name.toLowerCase().includes(term),
        );
        if (sort === 'az') {
            return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
        }
        return filtered;
    }, [filter, query, sort]);

    return (
        <div className="flex min-h-full flex-col px-12 pb-16 pt-14 xl:px-16">
            <PageHeader
                title="Library"
                subtitle="Components and blocks your agent can search and use."
                actions={
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-tertiary" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={`Search ${filter === 'block' ? 'blocks' : filter === 'component' ? 'components' : 'library'}`}
                                className="h-9 w-[240px] rounded-full border border-border bg-background-secondary pl-9 pr-3.5 text-[12.5px] text-foreground outline-none placeholder:text-foreground-quadranary focus:border-border-active"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" className="h-9">
                                    {sort === 'az' ? 'A–Z' : 'All'}
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setSort('featured')}>
                                    All
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setSort('az')}>
                                    A–Z
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                }
            />

            <div className="mt-9 flex flex-wrap items-center gap-2">
                {(
                    [
                        { id: 'all', label: 'All' },
                        { id: 'component', label: 'Components' },
                        { id: 'block', label: 'Blocks' },
                    ] as { id: Filter; label: string }[]
                ).map((option) => (
                    <button
                        key={option.id}
                        onClick={() => setFilter(option.id)}
                        className={cn(
                            'h-8 rounded-full px-4 text-[12px] font-medium transition-colors',
                            filter === option.id
                                ? 'bg-foreground text-background'
                                : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover hover:text-foreground',
                        )}
                    >
                        {option.label}
                    </button>
                ))}
                <span className="ml-1 text-[11.5px] text-foreground-quadranary">
                    {items.length} items
                </span>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item, index) => (
                    <LibraryCard
                        key={`${item.kind}-${item.name}`}
                        item={item}
                        index={index}
                        onOpen={() => setSelected(item)}
                    />
                ))}
            </div>

            {items.length === 0 && (
                <p className="py-24 text-center text-[12.5px] text-foreground-quadranary">
                    Nothing in the library matches “{query}”.
                </p>
            )}

            <LibraryDetail item={selected} onOpenChange={(open) => !open && setSelected(null)} />
        </div>
    );
};

function LibraryCard({
    item,
    index,
    onOpen,
}: {
    item: CatalogItem;
    index: number;
    onOpen: () => void;
}) {
    return (
        <button
            onClick={onOpen}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left transition-colors hover:border-border-hover"
        >
            <div className="relative flex min-h-[224px] flex-1 items-center justify-center overflow-hidden p-7">
                <CatalogArt item={item} index={index} />
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground-tertiary opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-border px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11.5px] text-foreground-quadranary">
                        {item.description}
                    </p>
                </div>
                <span className="mt-0.5 shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-foreground-tertiary">
                    {item.kind === 'block' ? 'Block' : 'Component'}
                </span>
            </div>
        </button>
    );
}

/**
 * Static, honest artwork: the catalog does not ship screenshots, so each card
 * uses a typographic composition derived from the item's own name.
 */
function CatalogArt({ item, index }: { item: CatalogItem; index: number }) {
    const initials = item.title
        .split(' ')
        .map((word) => word.charAt(0))
        .slice(0, 2)
        .join('');

    const tone = index % 3;

    if (tone === 0) {
        return (
            <div className="flex items-center gap-3">
                <span className="h-14 w-14 rounded-full bg-gradient-to-br from-[#ff6b9d] to-[#b06bff]" />
                <span className="h-14 w-14 rounded-full bg-gradient-to-br from-[#b06bff] to-[#3b82f6]" />
                <span className="h-14 w-14 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#34d399]" />
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background-secondary font-display text-[18px] text-foreground-secondary">
                    {initials}
                </span>
            </div>
        );
    }

    if (tone === 1) {
        return (
            <div className="w-full max-w-[240px] rounded-xl border border-border bg-background-secondary/60 p-4">
                <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-md bg-foreground/10" />
                    <span className="h-1.5 w-16 rounded-full bg-foreground/15" />
                </div>
                <div className="mt-4 space-y-2">
                    <div className="h-1.5 w-full rounded-full bg-foreground/[0.08]" />
                    <div className="h-1.5 w-4/5 rounded-full bg-foreground/[0.08]" />
                    <div className="h-1.5 w-3/5 rounded-full bg-foreground/[0.06]" />
                </div>
                <div className="mt-4 flex gap-2">
                    <span className="h-7 flex-1 rounded-md border border-border bg-foreground/[0.03]" />
                    <span className="h-7 w-16 rounded-full bg-foreground text-background" />
                </div>
            </div>
        );
    }

    return (
        <span className="select-none font-display text-[4.5rem] leading-none tracking-tight text-foreground-secondary/50">
            {initials}
        </span>
    );
}

function LibraryDetail({
    item,
    onOpenChange,
}: {
    item: CatalogItem | null;
    onOpenChange: (open: boolean) => void;
}) {
    const [copied, setCopied] = useState<'install' | 'agent' | null>(null);

    const copy = async (value: string, kind: 'install' | 'agent') => {
        await navigator.clipboard.writeText(value);
        setCopied(kind);
        window.setTimeout(() => setCopied(null), 1600);
    };

    return (
        <Dialog open={!!item} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[640px] overflow-hidden rounded-2xl p-0">
                {item && (
                    <>
                        <div className="flex min-h-[200px] items-center justify-center border-b border-border bg-surface p-8">
                            <CatalogArt item={item} index={item.kind === 'block' ? 1 : 0} />
                        </div>
                        <div className="p-6">
                            <DialogHeader>
                                <DialogTitle>{item.title}</DialogTitle>
                                <DialogDescription>{item.description}</DialogDescription>
                            </DialogHeader>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Tag icon={item.kind === 'block' ? Blocks : Component}>
                                    {item.kind === 'block' ? 'Block' : 'Component'}
                                </Tag>
                                {item.dependencies.slice(0, 4).map((dependency) => (
                                    <Tag key={dependency} icon={Package}>
                                        {dependency}
                                    </Tag>
                                ))}
                            </div>

                            {item.parts.length > 0 && (
                                <p className="mt-4 text-[11.5px] leading-5 text-foreground-quadranary">
                                    <span className="text-foreground-tertiary">Exports: </span>
                                    {item.parts.join(', ')}
                                </p>
                            )}

                            <div className="mt-5 flex flex-col gap-2">
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2">
                                    <code className="min-w-0 flex-1 truncate text-[11.5px] text-foreground-secondary">
                                        {item.installCommand}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2"
                                        onClick={() => copy(item.installCommand, 'install')}
                                    >
                                        {copied === 'install' ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3">
                                <p className="text-[11px] text-foreground-quadranary">
                                    Copies a prompt with the install command and JSX.
                                </p>
                                <Button onClick={() => copy(item.agentPrompt, 'agent')}>
                                    <Sparkles className="h-4 w-4" />
                                    {copied === 'agent' ? 'Copied' : 'Copy for agent'}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

function Tag({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
    return (
        <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10.5px] text-foreground-tertiary">
            <Icon className="h-3 w-3" />
            {children}
        </span>
    );
}
