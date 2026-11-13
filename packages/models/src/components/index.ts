import type { CodeImport } from '../code';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export type DetectedFramework = 'vite' | 'next' | 'react' | 'unknown';

/**
 * One shadcn/ui item in the pinned catalog.
 *
 * Every field except the authored templates is measured from the pinned
 * snapshot: `dependencies`, `registryDependencies` and `parts` are copied from
 * `apps/v4/public/r/styles/new-york-v4/<name>.json` at
 * `shadcn@3.7.0` (commit 1e9e337923aaede7db55b6091cb56a72a661b959), and
 * `title` / `description` come from the matching docs page frontmatter.
 * `parts` is the set of names that file actually exports, so an import can be
 * checked against it instead of trusted.
 *
 * An item the pinned snapshot does not carry (`toast`) keeps its measured title
 * and description, has empty `parts`, and is marked not installable rather than
 * being dropped or invented.
 */
export interface ShadcnComponentDefinition {
    /** Registry name, also the file name inside the ui directory. */
    name: string;
    title: string;
    description: string;
    /** npm packages the item needs, without version specifiers. */
    dependencies: string[];
    /** Other registry items the CLI installs first. */
    registryDependencies: string[];
    /** Names exported by the pinned component file; empty when there is none. */
    parts: string[];
    imports: CodeImport[];
    /** JSX written into the selected element when inserting. One root element. */
    insertCode: string;
    /** JSX rendered by the isolated preview page. */
    previewCode: string;
    /** False when the pinned snapshot has no installable item. Defaults to true. */
    installable?: boolean;
    /** False when a static template cannot be written safely. Defaults to true. */
    insertable?: boolean;
    /** False when the isolated preview cannot render the item. Defaults to true. */
    previewable?: boolean;
    /** Why a capability is missing. Present whenever a flag is false. */
    limitation?: string;
}

export interface ShadcnProjectStatus {
    projectPath: string;
    supported: boolean;
    reason: string | null;
    framework: DetectedFramework;
    packageManager: PackageManager | null;
    tailwind: boolean;
    initialized: boolean;
    uiDir: string | null;
    componentsJsonPath: string | null;
    installed: Record<string, boolean>;
}

export interface ShadcnInstallResult {
    component: string;
    success: boolean;
    initialized: boolean;
    message: string;
    log: string;
    status: ShadcnProjectStatus | null;
}

export interface ShadcnInitResult {
    success: boolean;
    message: string;
    log: string;
    status: ShadcnProjectStatus | null;
}

export interface ShadcnPreviewResult {
    component: string;
    url: string | null;
    error: string | null;
    log: string | null;
}

/**
 * Pinned shadcn CLI version.
 *
 * The 54-item catalog in this file was generated and hashed against
 * `shadcn@3.7.0` (commit 1e9e337923aaede7db55b6091cb56a72a661b959). Newer CLI
 * releases (3.8.x) expose a different item set — 57 items, with 34 of the 54
 * shared files changed — so installing with a different version would produce
 * sources that do not match the recorded provenance digest. Changing this value
 * requires regenerating the catalog and the recorded hashes together.
 */
export const COMPONENT_CLI_VERSION = '3.7.0';

export const SHADCN_COMPONENTS: ShadcnComponentDefinition[] = [
    {
        name: 'accordion',
        title: 'Accordion',
        description:
            'A vertically stacked set of interactive headings that each reveal a section of content.',
        dependencies: ['@radix-ui/react-accordion'],
        registryDependencies: [],
        parts: ['Accordion', 'AccordionContent', 'AccordionItem', 'AccordionTrigger'],
        imports: [
            {
                source: '@/components/ui/accordion',
                namedImports: [
                    'Accordion',
                    'AccordionContent',
                    'AccordionItem',
                    'AccordionTrigger',
                ],
            },
        ],
        insertCode: `<Accordion type="single" collapsible className="w-full">
    <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It follows the WAI-ARIA pattern.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>Yes. It uses the project's Tailwind theme.</AccordionContent>
    </AccordionItem>
</Accordion>`,
        previewCode: `<Accordion type="single" collapsible className="w-full">
    <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It follows the WAI-ARIA pattern.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>Yes. It uses the project's Tailwind theme.</AccordionContent>
    </AccordionItem>
</Accordion>`,
    },
    {
        name: 'alert',
        title: 'Alert',
        description: 'Displays a callout for user attention.',
        dependencies: [],
        registryDependencies: [],
        parts: ['Alert', 'AlertDescription', 'AlertTitle'],
        imports: [
            {
                source: '@/components/ui/alert',
                namedImports: ['Alert', 'AlertDescription', 'AlertTitle'],
            },
        ],
        insertCode: `<Alert>
    <AlertTitle>Heads up</AlertTitle>
    <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
</Alert>`,
        previewCode: `<div className="grid w-96 gap-3">
    <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
    </Alert>
    <Alert variant="destructive">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>Your session expired. Sign in again.</AlertDescription>
    </Alert>
</div>`,
    },
    {
        name: 'alert-dialog',
        title: 'Alert Dialog',
        description:
            'A modal dialog that interrupts the user with important content and expects a response.',
        dependencies: ['@radix-ui/react-alert-dialog'],
        registryDependencies: ['button'],
        parts: [
            'AlertDialog',
            'AlertDialogAction',
            'AlertDialogCancel',
            'AlertDialogContent',
            'AlertDialogDescription',
            'AlertDialogFooter',
            'AlertDialogHeader',
            'AlertDialogOverlay',
            'AlertDialogPortal',
            'AlertDialogTitle',
            'AlertDialogTrigger',
        ],
        imports: [
            {
                source: '@/components/ui/alert-dialog',
                namedImports: [
                    'AlertDialog',
                    'AlertDialogAction',
                    'AlertDialogCancel',
                    'AlertDialogContent',
                    'AlertDialogDescription',
                    'AlertDialogFooter',
                    'AlertDialogHeader',
                    'AlertDialogTitle',
                    'AlertDialogTrigger',
                ],
            },
            { source: '@/components/ui/button', namedImports: ['Button'] },
        ],
        insertCode: `<AlertDialog>
    <AlertDialogTrigger asChild>
        <Button variant="outline">Delete account</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>`,
        previewCode: `<AlertDialog>
    <AlertDialogTrigger asChild>
        <Button variant="outline">Delete account</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>`,
    },
    {
        name: 'aspect-ratio',
        title: 'Aspect Ratio',
        description: 'Displays content within a desired ratio.',
        dependencies: ['@radix-ui/react-aspect-ratio'],
        registryDependencies: [],
        parts: ['AspectRatio'],
        imports: [{ source: '@/components/ui/aspect-ratio', namedImports: ['AspectRatio'] }],
        insertCode: `<AspectRatio ratio={16 / 9} className="rounded-md bg-muted">
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">16 : 9</div>
</AspectRatio>`,
        previewCode: `<AspectRatio ratio={16 / 9} className="rounded-md bg-muted">
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">16 : 9</div>
</AspectRatio>`,
    },
    {
        name: 'avatar',
        title: 'Avatar',
        description: 'An image element with a fallback for representing the user.',
        dependencies: ['@radix-ui/react-avatar'],
        registryDependencies: [],
        parts: ['Avatar', 'AvatarFallback', 'AvatarImage'],
        imports: [{ source: '@/components/ui/avatar', namedImports: ['Avatar', 'AvatarFallback'] }],
        insertCode: `<Avatar>
    <AvatarFallback>KM</AvatarFallback>
</Avatar>`,
        previewCode: `<div className="flex items-center gap-3">
    <Avatar>
        <AvatarFallback>KM</AvatarFallback>
    </Avatar>
    <Avatar>
        <AvatarFallback>AL</AvatarFallback>
    </Avatar>
</div>`,
    },
    {
        name: 'badge',
        title: 'Badge',
        description: 'Displays a badge or a component that looks like a badge.',
        dependencies: ['@radix-ui/react-slot'],
        registryDependencies: [],
        parts: ['Badge', 'badgeVariants'],
        imports: [{ source: '@/components/ui/badge', namedImports: ['Badge'] }],
        insertCode: `<Badge>Badge</Badge>`,
        previewCode: `<div className="flex flex-wrap items-center gap-2">
    <Badge>Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="destructive">Destructive</Badge>
</div>`,
    },
    {
        name: 'breadcrumb',
        title: 'Breadcrumb',
        description: 'Displays the path to the current resource using a hierarchy of links.',
        dependencies: ['@radix-ui/react-slot'],
        registryDependencies: [],
        parts: [
            'Breadcrumb',
            'BreadcrumbEllipsis',
            'BreadcrumbItem',
            'BreadcrumbLink',
            'BreadcrumbList',
            'BreadcrumbPage',
            'BreadcrumbSeparator',
        ],
        imports: [
            {
                source: '@/components/ui/breadcrumb',
                namedImports: [
                    'Breadcrumb',
                    'BreadcrumbItem',
                    'BreadcrumbLink',
                    'BreadcrumbList',
                    'BreadcrumbPage',
                    'BreadcrumbSeparator',
                ],
            },
        ],
        insertCode: `<Breadcrumb>
    <BreadcrumbList>
        <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
            <BreadcrumbPage>Components</BreadcrumbPage>
        </BreadcrumbItem>
    </BreadcrumbList>
</Breadcrumb>`,
        previewCode: `<Breadcrumb>
    <BreadcrumbList>
        <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
            <BreadcrumbPage>Components</BreadcrumbPage>
        </BreadcrumbItem>
    </BreadcrumbList>
</Breadcrumb>`,
    },
    {
        name: 'button',
        title: 'Button',
        description: 'Displays a button or a component that looks like a button.',
        dependencies: ['@radix-ui/react-slot'],
        registryDependencies: [],
        parts: ['Button', 'buttonVariants'],
        imports: [{ source: '@/components/ui/button', namedImports: ['Button'] }],
        insertCode: `<Button>Button</Button>`,
        previewCode: `<div className="flex flex-wrap items-center gap-3">
    <Button>Default</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="destructive">Destructive</Button>
</div>`,
    },
    {
        name: 'button-group',
        title: 'Button Group',
        description: 'A container that groups related buttons together with consistent styling.',
        dependencies: [],
        registryDependencies: ['button', 'separator'],
        parts: ['ButtonGroup', 'ButtonGroupSeparator', 'ButtonGroupText', 'buttonGroupVariants'],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            { source: '@/components/ui/button-group', namedImports: ['ButtonGroup'] },
        ],
        insertCode: `<ButtonGroup>
    <Button variant="outline">Previous</Button>
    <Button variant="outline">Next</Button>
</ButtonGroup>`,
        previewCode: `<ButtonGroup>
    <Button variant="outline">Archive</Button>
    <Button variant="outline">Report</Button>
    <Button variant="outline">Snooze</Button>
</ButtonGroup>`,
    },
    {
        name: 'calendar',
        title: 'Calendar',
        description: 'A date field component that allows users to enter and edit date.',
        dependencies: ['date-fns', 'react-day-picker'],
        registryDependencies: ['button'],
        parts: ['Calendar', 'CalendarDayButton'],
        imports: [{ source: '@/components/ui/calendar', namedImports: ['Calendar'] }],
        insertCode: `<Calendar className="w-fit rounded-md border" />`,
        previewCode: `<Calendar className="w-fit rounded-md border" />`,
    },
    {
        name: 'card',
        title: 'Card',
        description: 'Displays a card with header, content, and footer.',
        dependencies: [],
        registryDependencies: [],
        parts: [
            'Card',
            'CardAction',
            'CardContent',
            'CardDescription',
            'CardFooter',
            'CardHeader',
            'CardTitle',
        ],
        imports: [
            {
                source: '@/components/ui/card',
                namedImports: ['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle'],
            },
        ],
        insertCode: `<Card className="w-full max-w-sm">
    <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>A short description of the card.</CardDescription>
    </CardHeader>
    <CardContent>
        <p className="text-sm text-muted-foreground">Card content goes here.</p>
    </CardContent>
</Card>`,
        previewCode: `<Card className="w-80">
    <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>A short description of the card.</CardDescription>
    </CardHeader>
    <CardContent>
        <p className="text-sm text-muted-foreground">Card content goes here.</p>
    </CardContent>
</Card>`,
    },
    {
        name: 'carousel',
        title: 'Carousel',
        description: 'A carousel with motion and swipe built using Embla.',
        dependencies: ['embla-carousel-react'],
        registryDependencies: ['button'],
        parts: [
            'Carousel',
            'CarouselApi',
            'CarouselContent',
            'CarouselItem',
            'CarouselNext',
            'CarouselPrevious',
        ],
        imports: [
            { source: '@/components/ui/card', namedImports: ['Card', 'CardContent'] },
            {
                source: '@/components/ui/carousel',
                namedImports: [
                    'Carousel',
                    'CarouselContent',
                    'CarouselItem',
                    'CarouselNext',
                    'CarouselPrevious',
                ],
            },
        ],
        insertCode: `<Carousel className="w-full max-w-xs">
    <CarouselContent>
        <CarouselItem>
            <div className="p-1">
                <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                        <span className="text-2xl font-semibold">1</span>
                    </CardContent>
                </Card>
            </div>
        </CarouselItem>
        <CarouselItem>
            <div className="p-1">
                <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                        <span className="text-2xl font-semibold">2</span>
                    </CardContent>
                </Card>
            </div>
        </CarouselItem>
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext />
</Carousel>`,
        previewCode: `<Carousel className="w-full max-w-xs">
    <CarouselContent>
        <CarouselItem>
            <div className="p-1">
                <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                        <span className="text-2xl font-semibold">1</span>
                    </CardContent>
                </Card>
            </div>
        </CarouselItem>
        <CarouselItem>
            <div className="p-1">
                <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                        <span className="text-2xl font-semibold">2</span>
                    </CardContent>
                </Card>
            </div>
        </CarouselItem>
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext />
</Carousel>`,
    },
    {
        name: 'chart',
        title: 'Chart',
        description: 'Beautiful charts. Built using Recharts. Copy and paste into your apps.',
        dependencies: ['lucide-react', 'recharts'],
        registryDependencies: ['card'],
        parts: [
            'ChartContainer',
            'ChartLegend',
            'ChartLegendContent',
            'ChartStyle',
            'ChartTooltip',
            'ChartTooltipContent',
        ],
        imports: [
            {
                source: '@/components/ui/chart',
                namedImports: ['ChartContainer', 'ChartTooltip', 'ChartTooltipContent'],
            },
            { source: 'recharts', namedImports: ['Bar', 'BarChart', 'CartesianGrid', 'XAxis'] },
        ],
        insertCode: `<ChartContainer config={{ desktop: { label: 'Desktop', color: 'var(--chart-1)' } }} className="min-h-[200px] w-full">
    <BarChart accessibilityLayer data={[{ month: 'January', desktop: 186 }, { month: 'February', desktop: 305 }]}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
    </BarChart>
</ChartContainer>`,
        previewCode: `<ChartContainer config={{ desktop: { label: 'Desktop', color: 'var(--chart-1)' } }} className="min-h-[200px] w-full">
    <BarChart accessibilityLayer data={[{ month: 'January', desktop: 186 }, { month: 'February', desktop: 305 }]}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
    </BarChart>
</ChartContainer>`,
    },
    {
        name: 'checkbox',
        title: 'Checkbox',
        description: 'A control that allows the user to toggle between checked and not checked.',
        dependencies: ['@radix-ui/react-checkbox'],
        registryDependencies: [],
        parts: ['Checkbox'],
        imports: [
            { source: '@/components/ui/checkbox', namedImports: ['Checkbox'] },
            { source: '@/components/ui/label', namedImports: ['Label'] },
        ],
        insertCode: `<div className="flex items-center gap-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">Accept terms and conditions</Label>
</div>`,
        previewCode: `<div className="flex items-center gap-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">Accept terms and conditions</Label>
</div>`,
    },
    {
        name: 'collapsible',
        title: 'Collapsible',
        description: 'An interactive component which expands/collapses a panel.',
        dependencies: ['@radix-ui/react-collapsible'],
        registryDependencies: [],
        parts: ['Collapsible', 'CollapsibleContent', 'CollapsibleTrigger'],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/collapsible',
                namedImports: ['Collapsible', 'CollapsibleContent', 'CollapsibleTrigger'],
            },
        ],
        insertCode: `<Collapsible>
    <CollapsibleTrigger asChild>
        <Button variant="ghost">Toggle details</Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
        <p className="pt-2 text-sm text-muted-foreground">The content revealed by the trigger.</p>
    </CollapsibleContent>
</Collapsible>`,
        previewCode: `<Collapsible>
    <CollapsibleTrigger asChild>
        <Button variant="ghost">Toggle details</Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
        <p className="pt-2 text-sm text-muted-foreground">The content revealed by the trigger.</p>
    </CollapsibleContent>
</Collapsible>`,
    },
    {
        name: 'command',
        title: 'Command',
        description: 'Fast, composable, unstyled command menu for React.',
        dependencies: ['cmdk'],
        registryDependencies: ['dialog'],
        parts: [
            'Command',
            'CommandDialog',
            'CommandEmpty',
            'CommandGroup',
            'CommandInput',
            'CommandItem',
            'CommandList',
            'CommandSeparator',
            'CommandShortcut',
        ],
        imports: [
            {
                source: '@/components/ui/command',
                namedImports: [
                    'Command',
                    'CommandEmpty',
                    'CommandGroup',
                    'CommandInput',
                    'CommandItem',
                    'CommandList',
                ],
            },
        ],
        insertCode: `<Command className="w-80 rounded-lg border">
    <CommandInput placeholder="Type a command or search..." />
    <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
            <CommandItem>Calendar</CommandItem>
            <CommandItem>Search</CommandItem>
            <CommandItem>Settings</CommandItem>
        </CommandGroup>
    </CommandList>
</Command>`,
        previewCode: `<Command className="w-80 rounded-lg border">
    <CommandInput placeholder="Type a command or search..." />
    <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
            <CommandItem>Calendar</CommandItem>
            <CommandItem>Search</CommandItem>
            <CommandItem>Settings</CommandItem>
        </CommandGroup>
    </CommandList>
</Command>`,
    },
    {
        name: 'context-menu',
        title: 'Context Menu',
        description:
            'Displays a menu to the user — such as a set of actions or functions — triggered by a button.',
        dependencies: ['@radix-ui/react-context-menu'],
        registryDependencies: [],
        parts: [
            'ContextMenu',
            'ContextMenuCheckboxItem',
            'ContextMenuContent',
            'ContextMenuGroup',
            'ContextMenuItem',
            'ContextMenuLabel',
            'ContextMenuPortal',
            'ContextMenuRadioGroup',
            'ContextMenuRadioItem',
            'ContextMenuSeparator',
            'ContextMenuShortcut',
            'ContextMenuSub',
            'ContextMenuSubContent',
            'ContextMenuSubTrigger',
            'ContextMenuTrigger',
        ],
        imports: [
            {
                source: '@/components/ui/context-menu',
                namedImports: [
                    'ContextMenu',
                    'ContextMenuContent',
                    'ContextMenuItem',
                    'ContextMenuSeparator',
                    'ContextMenuTrigger',
                ],
            },
        ],
        insertCode: `<ContextMenu>
    <ContextMenuTrigger className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Right click here
    </ContextMenuTrigger>
    <ContextMenuContent>
        <ContextMenuItem>Back</ContextMenuItem>
        <ContextMenuItem>Reload</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Inspect</ContextMenuItem>
    </ContextMenuContent>
</ContextMenu>`,
        previewCode: `<ContextMenu>
    <ContextMenuTrigger className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Right click here
    </ContextMenuTrigger>
    <ContextMenuContent>
        <ContextMenuItem>Back</ContextMenuItem>
        <ContextMenuItem>Reload</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Inspect</ContextMenuItem>
    </ContextMenuContent>
</ContextMenu>`,
    },
    {
        name: 'dialog',
        title: 'Dialog',
        description:
            'A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.',
        dependencies: ['@radix-ui/react-dialog'],
        registryDependencies: [],
        parts: [
            'Dialog',
            'DialogClose',
            'DialogContent',
            'DialogDescription',
            'DialogFooter',
            'DialogHeader',
            'DialogOverlay',
            'DialogPortal',
            'DialogTitle',
            'DialogTrigger',
        ],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/dialog',
                namedImports: [
                    'Dialog',
                    'DialogContent',
                    'DialogDescription',
                    'DialogFooter',
                    'DialogHeader',
                    'DialogTitle',
                    'DialogTrigger',
                ],
            },
        ],
        insertCode: `<Dialog>
    <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
    </DialogTrigger>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description goes here.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
            <Button>Confirm</Button>
        </DialogFooter>
    </DialogContent>
</Dialog>`,
        previewCode: `<Dialog>
    <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
    </DialogTrigger>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description goes here.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
            <Button>Confirm</Button>
        </DialogFooter>
    </DialogContent>
</Dialog>`,
    },
    {
        name: 'drawer',
        title: 'Drawer',
        description: 'A drawer component for React.',
        dependencies: ['@radix-ui/react-dialog', 'vaul'],
        registryDependencies: [],
        parts: [
            'Drawer',
            'DrawerClose',
            'DrawerContent',
            'DrawerDescription',
            'DrawerFooter',
            'DrawerHeader',
            'DrawerOverlay',
            'DrawerPortal',
            'DrawerTitle',
            'DrawerTrigger',
        ],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/drawer',
                namedImports: [
                    'Drawer',
                    'DrawerContent',
                    'DrawerDescription',
                    'DrawerFooter',
                    'DrawerHeader',
                    'DrawerTitle',
                    'DrawerTrigger',
                ],
            },
        ],
        insertCode: `<Drawer>
    <DrawerTrigger asChild>
        <Button variant="outline">Open drawer</Button>
    </DrawerTrigger>
    <DrawerContent>
        <DrawerHeader>
            <DrawerTitle>Drawer title</DrawerTitle>
            <DrawerDescription>Drawer description goes here.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
            <Button>Save changes</Button>
        </DrawerFooter>
    </DrawerContent>
</Drawer>`,
        previewCode: `<Drawer>
    <DrawerTrigger asChild>
        <Button variant="outline">Open drawer</Button>
    </DrawerTrigger>
    <DrawerContent>
        <DrawerHeader>
            <DrawerTitle>Drawer title</DrawerTitle>
            <DrawerDescription>Drawer description goes here.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
            <Button>Save changes</Button>
        </DrawerFooter>
    </DrawerContent>
</Drawer>`,
    },
    {
        name: 'dropdown-menu',
        title: 'Dropdown Menu',
        description:
            'Displays a menu to the user — such as a set of actions or functions — triggered by a button.',
        dependencies: ['@radix-ui/react-dropdown-menu'],
        registryDependencies: [],
        parts: [
            'DropdownMenu',
            'DropdownMenuCheckboxItem',
            'DropdownMenuContent',
            'DropdownMenuGroup',
            'DropdownMenuItem',
            'DropdownMenuLabel',
            'DropdownMenuPortal',
            'DropdownMenuRadioGroup',
            'DropdownMenuRadioItem',
            'DropdownMenuSeparator',
            'DropdownMenuShortcut',
            'DropdownMenuSub',
            'DropdownMenuSubContent',
            'DropdownMenuSubTrigger',
            'DropdownMenuTrigger',
        ],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/dropdown-menu',
                namedImports: [
                    'DropdownMenu',
                    'DropdownMenuContent',
                    'DropdownMenuItem',
                    'DropdownMenuLabel',
                    'DropdownMenuSeparator',
                    'DropdownMenuTrigger',
                ],
            },
        ],
        insertCode: `<DropdownMenu>
    <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-48">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>`,
        previewCode: `<DropdownMenu>
    <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-48">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>`,
    },
    {
        name: 'empty',
        title: 'Empty',
        description: 'Use the Empty component to display an empty state.',
        dependencies: [],
        registryDependencies: [],
        parts: [
            'Empty',
            'EmptyContent',
            'EmptyDescription',
            'EmptyHeader',
            'EmptyMedia',
            'EmptyTitle',
        ],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/empty',
                namedImports: [
                    'Empty',
                    'EmptyContent',
                    'EmptyDescription',
                    'EmptyHeader',
                    'EmptyTitle',
                ],
            },
        ],
        insertCode: `<Empty>
    <EmptyHeader>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Create a project to get started.</EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
        <Button>Create project</Button>
    </EmptyContent>
</Empty>`,
        previewCode: `<Empty>
    <EmptyHeader>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Create a project to get started.</EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
        <Button>Create project</Button>
    </EmptyContent>
</Empty>`,
    },
    {
        name: 'field',
        title: 'Field',
        description:
            'Combine labels, controls, and help text to compose accessible form fields and grouped inputs.',
        dependencies: [],
        registryDependencies: ['label', 'separator'],
        parts: [
            'Field',
            'FieldContent',
            'FieldDescription',
            'FieldError',
            'FieldGroup',
            'FieldLabel',
            'FieldLegend',
            'FieldSeparator',
            'FieldSet',
            'FieldTitle',
        ],
        imports: [
            {
                source: '@/components/ui/field',
                namedImports: ['Field', 'FieldDescription', 'FieldGroup', 'FieldLabel'],
            },
            { source: '@/components/ui/input', namedImports: ['Input'] },
        ],
        insertCode: `<FieldGroup>
    <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" placeholder="you@example.com" />
        <FieldDescription>We will never share your email.</FieldDescription>
    </Field>
</FieldGroup>`,
        previewCode: `<FieldGroup>
    <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" placeholder="you@example.com" />
        <FieldDescription>We will never share your email.</FieldDescription>
    </Field>
</FieldGroup>`,
    },
    {
        name: 'form',
        title: 'Form',
        description: 'Building forms with React Hook Form and Zod.',
        dependencies: [
            '@hookform/resolvers',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            'react-hook-form',
            'zod',
        ],
        registryDependencies: ['button', 'label'],
        parts: [
            'Form',
            'FormControl',
            'FormDescription',
            'FormField',
            'FormItem',
            'FormLabel',
            'FormMessage',
            'useFormField',
        ],
        imports: [],
        insertCode: '',
        previewCode: '',
        insertable: false,
        previewable: false,
        limitation:
            'Form is a wrapper over react-hook-form. Inserting or previewing it needs a controller instance, which the catalog does not generate.',
    },
    {
        name: 'hover-card',
        title: 'Hover Card',
        description: 'For sighted users to preview content available behind a link.',
        dependencies: ['@radix-ui/react-hover-card'],
        registryDependencies: [],
        parts: ['HoverCard', 'HoverCardContent', 'HoverCardTrigger'],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/hover-card',
                namedImports: ['HoverCard', 'HoverCardContent', 'HoverCardTrigger'],
            },
        ],
        insertCode: `<HoverCard>
    <HoverCardTrigger asChild>
        <Button variant="link">@kumite</Button>
    </HoverCardTrigger>
    <HoverCardContent className="w-80">
        <p className="text-sm">Design engineering for AI coding agents.</p>
    </HoverCardContent>
</HoverCard>`,
        previewCode: `<HoverCard>
    <HoverCardTrigger asChild>
        <Button variant="link">@kumite</Button>
    </HoverCardTrigger>
    <HoverCardContent className="w-80">
        <p className="text-sm">Design engineering for AI coding agents.</p>
    </HoverCardContent>
</HoverCard>`,
    },
    {
        name: 'input',
        title: 'Input',
        description: 'Displays a form input field or a component that looks like an input field.',
        dependencies: [],
        registryDependencies: [],
        parts: ['Input'],
        imports: [{ source: '@/components/ui/input', namedImports: ['Input'] }],
        insertCode: `<Input type="email" placeholder="Email address" />`,
        previewCode: `<div className="grid w-80 gap-3">
    <Input placeholder="Email address" type="email" />
    <Input placeholder="Disabled" disabled />
</div>`,
    },
    {
        name: 'input-group',
        title: 'Input Group',
        description: 'Display additional information or actions to an input or textarea.',
        dependencies: [],
        registryDependencies: ['button', 'input', 'textarea'],
        parts: [
            'InputGroup',
            'InputGroupAddon',
            'InputGroupButton',
            'InputGroupInput',
            'InputGroupText',
            'InputGroupTextarea',
        ],
        imports: [
            {
                source: '@/components/ui/input-group',
                namedImports: [
                    'InputGroup',
                    'InputGroupAddon',
                    'InputGroupInput',
                    'InputGroupText',
                ],
            },
        ],
        insertCode: `<InputGroup>
    <InputGroupInput placeholder="Search..." />
    <InputGroupAddon align="inline-end">
        <InputGroupText>K</InputGroupText>
    </InputGroupAddon>
</InputGroup>`,
        previewCode: `<InputGroup>
    <InputGroupInput placeholder="Search..." />
    <InputGroupAddon align="inline-end">
        <InputGroupText>K</InputGroupText>
    </InputGroupAddon>
</InputGroup>`,
    },
    {
        name: 'input-otp',
        title: 'Input OTP',
        description: 'Accessible one-time password component with copy paste functionality.',
        dependencies: ['input-otp'],
        registryDependencies: [],
        parts: ['InputOTP', 'InputOTPGroup', 'InputOTPSeparator', 'InputOTPSlot'],
        imports: [
            {
                source: '@/components/ui/input-otp',
                namedImports: ['InputOTP', 'InputOTPGroup', 'InputOTPSeparator', 'InputOTPSlot'],
            },
        ],
        insertCode: `<InputOTP maxLength={6}>
    <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
    </InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
    </InputOTPGroup>
</InputOTP>`,
        previewCode: `<InputOTP maxLength={6}>
    <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
    </InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
    </InputOTPGroup>
</InputOTP>`,
    },
    {
        name: 'item',
        title: 'Item',
        description: 'A versatile component that you can use to display any content.',
        dependencies: [],
        registryDependencies: ['separator'],
        parts: [
            'Item',
            'ItemActions',
            'ItemContent',
            'ItemDescription',
            'ItemFooter',
            'ItemGroup',
            'ItemHeader',
            'ItemMedia',
            'ItemSeparator',
            'ItemTitle',
        ],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/item',
                namedImports: [
                    'Item',
                    'ItemActions',
                    'ItemContent',
                    'ItemDescription',
                    'ItemMedia',
                    'ItemTitle',
                ],
            },
        ],
        insertCode: `<Item variant="outline">
    <ItemMedia>KM</ItemMedia>
    <ItemContent>
        <ItemTitle>Design system</ItemTitle>
        <ItemDescription>Updated two hours ago.</ItemDescription>
    </ItemContent>
    <ItemActions>
        <Button size="sm" variant="ghost">Open</Button>
    </ItemActions>
</Item>`,
        previewCode: `<Item variant="outline">
    <ItemMedia>KM</ItemMedia>
    <ItemContent>
        <ItemTitle>Design system</ItemTitle>
        <ItemDescription>Updated two hours ago.</ItemDescription>
    </ItemContent>
    <ItemActions>
        <Button size="sm" variant="ghost">Open</Button>
    </ItemActions>
</Item>`,
    },
    {
        name: 'kbd',
        title: 'Kbd',
        description: 'Used to display textual user input from keyboard.',
        dependencies: [],
        registryDependencies: [],
        parts: ['Kbd', 'KbdGroup'],
        imports: [{ source: '@/components/ui/kbd', namedImports: ['Kbd', 'KbdGroup'] }],
        insertCode: `<KbdGroup>
    <Kbd>K</Kbd>
    <Kbd>M</Kbd>
</KbdGroup>`,
        previewCode: `<KbdGroup>
    <Kbd>K</Kbd>
    <Kbd>M</Kbd>
</KbdGroup>`,
    },
    {
        name: 'label',
        title: 'Label',
        description: 'Renders an accessible label associated with controls.',
        dependencies: ['@radix-ui/react-label'],
        registryDependencies: [],
        parts: ['Label'],
        imports: [
            { source: '@/components/ui/input', namedImports: ['Input'] },
            { source: '@/components/ui/label', namedImports: ['Label'] },
        ],
        insertCode: `<div className="grid w-64 gap-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
</div>`,
        previewCode: `<div className="grid w-64 gap-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
</div>`,
    },
    {
        name: 'menubar',
        title: 'Menubar',
        description:
            'A visually persistent menu common in desktop applications that provides quick access to a consistent set of commands.',
        dependencies: ['@radix-ui/react-menubar'],
        registryDependencies: [],
        parts: [
            'Menubar',
            'MenubarCheckboxItem',
            'MenubarContent',
            'MenubarGroup',
            'MenubarItem',
            'MenubarLabel',
            'MenubarMenu',
            'MenubarPortal',
            'MenubarRadioGroup',
            'MenubarRadioItem',
            'MenubarSeparator',
            'MenubarShortcut',
            'MenubarSub',
            'MenubarSubContent',
            'MenubarSubTrigger',
            'MenubarTrigger',
        ],
        imports: [
            {
                source: '@/components/ui/menubar',
                namedImports: [
                    'Menubar',
                    'MenubarContent',
                    'MenubarItem',
                    'MenubarMenu',
                    'MenubarSeparator',
                    'MenubarTrigger',
                ],
            },
        ],
        insertCode: `<Menubar>
    <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
            <MenubarItem>New tab</MenubarItem>
            <MenubarItem>New window</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Print</MenubarItem>
        </MenubarContent>
    </MenubarMenu>
</Menubar>`,
        previewCode: `<Menubar>
    <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
            <MenubarItem>New tab</MenubarItem>
            <MenubarItem>New window</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Print</MenubarItem>
        </MenubarContent>
    </MenubarMenu>
</Menubar>`,
    },
    {
        name: 'navigation-menu',
        title: 'Navigation Menu',
        description: 'A collection of links for navigating websites.',
        dependencies: ['@radix-ui/react-navigation-menu'],
        registryDependencies: [],
        parts: [
            'NavigationMenu',
            'NavigationMenuContent',
            'NavigationMenuIndicator',
            'NavigationMenuItem',
            'NavigationMenuLink',
            'NavigationMenuList',
            'NavigationMenuTrigger',
            'NavigationMenuViewport',
            'navigationMenuTriggerStyle',
        ],
        imports: [
            {
                source: '@/components/ui/navigation-menu',
                namedImports: [
                    'NavigationMenu',
                    'NavigationMenuContent',
                    'NavigationMenuItem',
                    'NavigationMenuLink',
                    'NavigationMenuList',
                    'NavigationMenuTrigger',
                ],
            },
        ],
        insertCode: `<NavigationMenu>
    <NavigationMenuList>
        <NavigationMenuItem>
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
                <NavigationMenuLink href="/docs">Introduction</NavigationMenuLink>
            </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
            <NavigationMenuLink href="/docs/components">Components</NavigationMenuLink>
        </NavigationMenuItem>
    </NavigationMenuList>
</NavigationMenu>`,
        previewCode: `<NavigationMenu>
    <NavigationMenuList>
        <NavigationMenuItem>
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
                <NavigationMenuLink href="/docs">Introduction</NavigationMenuLink>
            </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
            <NavigationMenuLink href="/docs/components">Components</NavigationMenuLink>
        </NavigationMenuItem>
    </NavigationMenuList>
</NavigationMenu>`,
    },
    {
        name: 'pagination',
        title: 'Pagination',
        description: 'Pagination with page navigation, next and previous links.',
        dependencies: [],
        registryDependencies: ['button'],
        parts: [
            'Pagination',
            'PaginationContent',
            'PaginationEllipsis',
            'PaginationItem',
            'PaginationLink',
            'PaginationNext',
            'PaginationPrevious',
        ],
        imports: [
            {
                source: '@/components/ui/pagination',
                namedImports: [
                    'Pagination',
                    'PaginationContent',
                    'PaginationItem',
                    'PaginationLink',
                    'PaginationNext',
                    'PaginationPrevious',
                ],
            },
        ],
        insertCode: `<Pagination>
    <PaginationContent>
        <PaginationItem>
            <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
            <PaginationLink href="#" isActive>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
            <PaginationNext href="#" />
        </PaginationItem>
    </PaginationContent>
</Pagination>`,
        previewCode: `<Pagination>
    <PaginationContent>
        <PaginationItem>
            <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
            <PaginationLink href="#" isActive>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
            <PaginationNext href="#" />
        </PaginationItem>
    </PaginationContent>
</Pagination>`,
    },
    {
        name: 'popover',
        title: 'Popover',
        description: 'Displays rich content in a portal, triggered by a button.',
        dependencies: ['@radix-ui/react-popover'],
        registryDependencies: [],
        parts: ['Popover', 'PopoverAnchor', 'PopoverContent', 'PopoverTrigger'],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/popover',
                namedImports: ['Popover', 'PopoverContent', 'PopoverTrigger'],
            },
        ],
        insertCode: `<Popover>
    <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
    </PopoverTrigger>
    <PopoverContent className="w-80">
        <p className="text-sm">Place content for the popover here.</p>
    </PopoverContent>
</Popover>`,
        previewCode: `<Popover>
    <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
    </PopoverTrigger>
    <PopoverContent className="w-80">
        <p className="text-sm">Place content for the popover here.</p>
    </PopoverContent>
</Popover>`,
    },
    {
        name: 'progress',
        title: 'Progress',
        description:
            'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.',
        dependencies: ['@radix-ui/react-progress'],
        registryDependencies: [],
        parts: ['Progress'],
        imports: [{ source: '@/components/ui/progress', namedImports: ['Progress'] }],
        insertCode: `<Progress value={60} className="w-64" />`,
        previewCode: `<Progress value={60} className="w-64" />`,
    },
    {
        name: 'radio-group',
        title: 'Radio Group',
        description:
            'A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.',
        dependencies: ['@radix-ui/react-radio-group'],
        registryDependencies: [],
        parts: ['RadioGroup', 'RadioGroupItem'],
        imports: [
            { source: '@/components/ui/label', namedImports: ['Label'] },
            {
                source: '@/components/ui/radio-group',
                namedImports: ['RadioGroup', 'RadioGroupItem'],
            },
        ],
        insertCode: `<RadioGroup defaultValue="comfortable">
    <div className="flex items-center gap-2">
        <RadioGroupItem value="default" id="r1" />
        <Label htmlFor="r1">Default</Label>
    </div>
    <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="r2" />
        <Label htmlFor="r2">Comfortable</Label>
    </div>
</RadioGroup>`,
        previewCode: `<RadioGroup defaultValue="comfortable">
    <div className="flex items-center gap-2">
        <RadioGroupItem value="default" id="r1" />
        <Label htmlFor="r1">Default</Label>
    </div>
    <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="r2" />
        <Label htmlFor="r2">Comfortable</Label>
    </div>
</RadioGroup>`,
    },
    {
        name: 'resizable',
        title: 'Resizable',
        description: 'Accessible resizable panel groups and layouts with keyboard support.',
        dependencies: ['react-resizable-panels'],
        registryDependencies: [],
        parts: ['ResizableHandle', 'ResizablePanel', 'ResizablePanelGroup'],
        imports: [
            {
                source: '@/components/ui/resizable',
                namedImports: ['ResizableHandle', 'ResizablePanel', 'ResizablePanelGroup'],
            },
        ],
        insertCode: `<ResizablePanelGroup direction="horizontal" className="max-w-md rounded-lg border">
    <ResizablePanel defaultSize={50}>
        <div className="p-6 text-sm">One</div>
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel defaultSize={50}>
        <div className="p-6 text-sm">Two</div>
    </ResizablePanel>
</ResizablePanelGroup>`,
        previewCode: `<ResizablePanelGroup direction="horizontal" className="max-w-md rounded-lg border">
    <ResizablePanel defaultSize={50}>
        <div className="p-6 text-sm">One</div>
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel defaultSize={50}>
        <div className="p-6 text-sm">Two</div>
    </ResizablePanel>
</ResizablePanelGroup>`,
    },
    {
        name: 'scroll-area',
        title: 'Scroll Area',
        description: 'Augments native scroll functionality for custom, cross-browser styling.',
        dependencies: ['@radix-ui/react-scroll-area'],
        registryDependencies: [],
        parts: ['ScrollArea', 'ScrollBar'],
        imports: [{ source: '@/components/ui/scroll-area', namedImports: ['ScrollArea'] }],
        insertCode: `<ScrollArea className="h-48 w-64 rounded-md border">
    <div className="space-y-3 p-4 text-sm">
        <p>First item</p>
        <p>Second item</p>
        <p>Third item</p>
        <p>Fourth item</p>
        <p>Fifth item</p>
        <p>Sixth item</p>
    </div>
</ScrollArea>`,
        previewCode: `<ScrollArea className="h-48 w-64 rounded-md border">
    <div className="space-y-3 p-4 text-sm">
        <p>First item</p>
        <p>Second item</p>
        <p>Third item</p>
        <p>Fourth item</p>
        <p>Fifth item</p>
        <p>Sixth item</p>
    </div>
</ScrollArea>`,
    },
    {
        name: 'select',
        title: 'Select',
        description: 'Displays a list of options for the user to pick from—triggered by a button.',
        dependencies: ['@radix-ui/react-select'],
        registryDependencies: [],
        parts: [
            'Select',
            'SelectContent',
            'SelectGroup',
            'SelectItem',
            'SelectLabel',
            'SelectScrollDownButton',
            'SelectScrollUpButton',
            'SelectSeparator',
            'SelectTrigger',
            'SelectValue',
        ],
        imports: [
            {
                source: '@/components/ui/select',
                namedImports: [
                    'Select',
                    'SelectContent',
                    'SelectGroup',
                    'SelectItem',
                    'SelectLabel',
                    'SelectTrigger',
                    'SelectValue',
                ],
            },
        ],
        insertCode: `<Select>
    <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a fruit" />
    </SelectTrigger>
    <SelectContent>
        <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
        </SelectGroup>
    </SelectContent>
</Select>`,
        previewCode: `<Select>
    <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a fruit" />
    </SelectTrigger>
    <SelectContent>
        <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
        </SelectGroup>
    </SelectContent>
</Select>`,
    },
    {
        name: 'separator',
        title: 'Separator',
        description: 'Visually or semantically separates content.',
        dependencies: ['@radix-ui/react-separator'],
        registryDependencies: [],
        parts: ['Separator'],
        imports: [{ source: '@/components/ui/separator', namedImports: ['Separator'] }],
        insertCode: `<div>
    <div className="space-y-1">
        <h4 className="text-sm font-medium">Kumite</h4>
        <p className="text-sm text-muted-foreground">Design engineering for AI agents.</p>
    </div>
    <Separator className="my-4" />
    <div className="flex h-5 items-center gap-4 text-sm">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Source</span>
    </div>
</div>`,
        previewCode: `<div>
    <div className="space-y-1">
        <h4 className="text-sm font-medium">Kumite</h4>
        <p className="text-sm text-muted-foreground">Design engineering for AI agents.</p>
    </div>
    <Separator className="my-4" />
    <div className="flex h-5 items-center gap-4 text-sm">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Source</span>
    </div>
</div>`,
    },
    {
        name: 'sheet',
        title: 'Sheet',
        description:
            'Extends the Dialog component to display content that complements the main content of the screen.',
        dependencies: ['@radix-ui/react-dialog'],
        registryDependencies: [],
        parts: [
            'Sheet',
            'SheetClose',
            'SheetContent',
            'SheetDescription',
            'SheetFooter',
            'SheetHeader',
            'SheetTitle',
            'SheetTrigger',
        ],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/sheet',
                namedImports: [
                    'Sheet',
                    'SheetContent',
                    'SheetDescription',
                    'SheetHeader',
                    'SheetTitle',
                    'SheetTrigger',
                ],
            },
        ],
        insertCode: `<Sheet>
    <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
    </SheetTrigger>
    <SheetContent>
        <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description goes here.</SheetDescription>
        </SheetHeader>
    </SheetContent>
</Sheet>`,
        previewCode: `<Sheet>
    <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
    </SheetTrigger>
    <SheetContent>
        <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description goes here.</SheetDescription>
        </SheetHeader>
    </SheetContent>
</Sheet>`,
    },
    {
        name: 'sidebar',
        title: 'Sidebar',
        description: 'A composable, themeable and customizable sidebar component.',
        dependencies: ['@radix-ui/react-slot', 'class-variance-authority', 'lucide-react'],
        registryDependencies: [
            'button',
            'input',
            'separator',
            'sheet',
            'skeleton',
            'tooltip',
            'use-mobile',
        ],
        parts: [
            'Sidebar',
            'SidebarContent',
            'SidebarFooter',
            'SidebarGroup',
            'SidebarGroupAction',
            'SidebarGroupContent',
            'SidebarGroupLabel',
            'SidebarHeader',
            'SidebarInput',
            'SidebarInset',
            'SidebarMenu',
            'SidebarMenuAction',
            'SidebarMenuBadge',
            'SidebarMenuButton',
            'SidebarMenuItem',
            'SidebarMenuSkeleton',
            'SidebarMenuSub',
            'SidebarMenuSubButton',
            'SidebarMenuSubItem',
            'SidebarProvider',
            'SidebarRail',
            'SidebarSeparator',
            'SidebarTrigger',
            'useSidebar',
        ],
        imports: [
            {
                source: '@/components/ui/sidebar',
                namedImports: [
                    'Sidebar',
                    'SidebarContent',
                    'SidebarGroup',
                    'SidebarGroupContent',
                    'SidebarGroupLabel',
                    'SidebarMenu',
                    'SidebarMenuButton',
                    'SidebarMenuItem',
                    'SidebarProvider',
                ],
            },
        ],
        insertCode: `<SidebarProvider>
    <Sidebar>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Application</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton>Dashboard</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton>Projects</SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
</SidebarProvider>`,
        previewCode: `<SidebarProvider>
    <Sidebar>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Application</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton>Dashboard</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton>Projects</SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
</SidebarProvider>`,
    },
    {
        name: 'skeleton',
        title: 'Skeleton',
        description: 'Use to show a placeholder while content is loading.',
        dependencies: [],
        registryDependencies: [],
        parts: ['Skeleton'],
        imports: [{ source: '@/components/ui/skeleton', namedImports: ['Skeleton'] }],
        insertCode: `<div className="flex items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-28" />
    </div>
</div>`,
        previewCode: `<div className="flex items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-28" />
    </div>
</div>`,
    },
    {
        name: 'slider',
        title: 'Slider',
        description: 'An input where the user selects a value from within a given range.',
        dependencies: ['@radix-ui/react-slider'],
        registryDependencies: [],
        parts: ['Slider'],
        imports: [{ source: '@/components/ui/slider', namedImports: ['Slider'] }],
        insertCode: `<Slider defaultValue={[50]} max={100} step={1} className="w-64" />`,
        previewCode: `<Slider defaultValue={[50]} max={100} step={1} className="w-64" />`,
    },
    {
        name: 'sonner',
        title: 'Sonner',
        description: 'An opinionated toast component for React.',
        dependencies: ['next-themes', 'sonner'],
        registryDependencies: [],
        parts: ['Toaster'],
        imports: [{ source: '@/components/ui/sonner', namedImports: ['Toaster'] }],
        insertCode: `<Toaster />`,
        previewCode: '',
        previewable: false,
        limitation:
            'The toaster renders nothing until a toast is pushed, and the isolated preview has no trigger to push one.',
    },
    {
        name: 'spinner',
        title: 'Spinner',
        description: 'An indicator that can be used to show a loading state.',
        dependencies: ['class-variance-authority'],
        registryDependencies: [],
        parts: ['Spinner'],
        imports: [{ source: '@/components/ui/spinner', namedImports: ['Spinner'] }],
        insertCode: `<div className="flex items-center gap-3">
    <Spinner />
    <Spinner className="size-6" />
</div>`,
        previewCode: `<div className="flex items-center gap-3">
    <Spinner />
    <Spinner className="size-6" />
</div>`,
    },
    {
        name: 'switch',
        title: 'Switch',
        description: 'A control that allows the user to toggle between checked and not checked.',
        dependencies: ['@radix-ui/react-switch'],
        registryDependencies: [],
        parts: ['Switch'],
        imports: [
            { source: '@/components/ui/label', namedImports: ['Label'] },
            { source: '@/components/ui/switch', namedImports: ['Switch'] },
        ],
        insertCode: `<div className="flex items-center gap-2">
    <Switch id="airplane-mode" />
    <Label htmlFor="airplane-mode">Airplane mode</Label>
</div>`,
        previewCode: `<div className="flex items-center gap-2">
    <Switch id="airplane-mode" />
    <Label htmlFor="airplane-mode">Airplane mode</Label>
</div>`,
    },
    {
        name: 'table',
        title: 'Table',
        description: 'A responsive table component.',
        dependencies: [],
        registryDependencies: [],
        parts: [
            'Table',
            'TableBody',
            'TableCaption',
            'TableCell',
            'TableFooter',
            'TableHead',
            'TableHeader',
            'TableRow',
        ],
        imports: [
            {
                source: '@/components/ui/table',
                namedImports: [
                    'Table',
                    'TableBody',
                    'TableCaption',
                    'TableCell',
                    'TableHead',
                    'TableHeader',
                    'TableRow',
                ],
            },
        ],
        insertCode: `<Table>
    <TableCaption>A list of recent invoices.</TableCaption>
    <TableHeader>
        <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
        </TableRow>
    </TableHeader>
    <TableBody>
        <TableRow>
            <TableCell>INV-001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell className="text-right">$250.00</TableCell>
        </TableRow>
        <TableRow>
            <TableCell>INV-002</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell className="text-right">$150.00</TableCell>
        </TableRow>
    </TableBody>
</Table>`,
        previewCode: `<Table>
    <TableCaption>A list of recent invoices.</TableCaption>
    <TableHeader>
        <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
        </TableRow>
    </TableHeader>
    <TableBody>
        <TableRow>
            <TableCell>INV-001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell className="text-right">$250.00</TableCell>
        </TableRow>
        <TableRow>
            <TableCell>INV-002</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell className="text-right">$150.00</TableCell>
        </TableRow>
    </TableBody>
</Table>`,
    },
    {
        name: 'tabs',
        title: 'Tabs',
        description:
            'A set of layered sections of content—known as tab panels—that are displayed one at a time.',
        dependencies: ['@radix-ui/react-tabs'],
        registryDependencies: [],
        parts: ['Tabs', 'TabsContent', 'TabsList', 'TabsTrigger'],
        imports: [
            {
                source: '@/components/ui/tabs',
                namedImports: ['Tabs', 'TabsContent', 'TabsList', 'TabsTrigger'],
            },
        ],
        insertCode: `<Tabs defaultValue="account" className="w-80">
    <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
    </TabsList>
    <TabsContent value="account">
        <p className="text-sm text-muted-foreground">Account settings.</p>
    </TabsContent>
    <TabsContent value="password">
        <p className="text-sm text-muted-foreground">Password settings.</p>
    </TabsContent>
</Tabs>`,
        previewCode: `<Tabs defaultValue="account" className="w-80">
    <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
    </TabsList>
    <TabsContent value="account">
        <p className="text-sm text-muted-foreground">Account settings.</p>
    </TabsContent>
    <TabsContent value="password">
        <p className="text-sm text-muted-foreground">Password settings.</p>
    </TabsContent>
</Tabs>`,
    },
    {
        name: 'textarea',
        title: 'Textarea',
        description: 'Displays a form textarea or a component that looks like a textarea.',
        dependencies: [],
        registryDependencies: [],
        parts: ['Textarea'],
        imports: [{ source: '@/components/ui/textarea', namedImports: ['Textarea'] }],
        insertCode: `<Textarea placeholder="Type your message here." className="w-80" />`,
        previewCode: `<Textarea placeholder="Type your message here." className="w-80" />`,
    },
    {
        name: 'toast',
        title: 'Toast',
        description: 'A succinct message that is displayed temporarily.',
        dependencies: [],
        registryDependencies: [],
        parts: [],
        imports: [],
        insertCode: '',
        previewCode: '',
        installable: false,
        insertable: false,
        previewable: false,
        limitation:
            'The pinned new-york-v4 snapshot has no toast item (the registry request returns 404). The legacy toast exists only in the deprecated style, so this catalog cannot install it.',
    },
    {
        name: 'toggle',
        title: 'Toggle',
        description: 'A two-state button that can be either on or off.',
        dependencies: ['@radix-ui/react-toggle'],
        registryDependencies: [],
        parts: ['Toggle', 'toggleVariants'],
        imports: [{ source: '@/components/ui/toggle', namedImports: ['Toggle'] }],
        insertCode: `<Toggle aria-label="Toggle bold">Bold</Toggle>`,
        previewCode: `<Toggle aria-label="Toggle bold">Bold</Toggle>`,
    },
    {
        name: 'toggle-group',
        title: 'Toggle Group',
        description: 'A set of two-state buttons that can be toggled on or off.',
        dependencies: ['@radix-ui/react-toggle-group'],
        registryDependencies: ['toggle'],
        parts: ['ToggleGroup', 'ToggleGroupItem'],
        imports: [
            {
                source: '@/components/ui/toggle-group',
                namedImports: ['ToggleGroup', 'ToggleGroupItem'],
            },
        ],
        insertCode: `<ToggleGroup type="single" defaultValue="center">
    <ToggleGroupItem value="left">Left</ToggleGroupItem>
    <ToggleGroupItem value="center">Center</ToggleGroupItem>
    <ToggleGroupItem value="right">Right</ToggleGroupItem>
</ToggleGroup>`,
        previewCode: `<ToggleGroup type="single" defaultValue="center">
    <ToggleGroupItem value="left">Left</ToggleGroupItem>
    <ToggleGroupItem value="center">Center</ToggleGroupItem>
    <ToggleGroupItem value="right">Right</ToggleGroupItem>
</ToggleGroup>`,
    },
    {
        name: 'tooltip',
        title: 'Tooltip',
        description:
            'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.',
        dependencies: ['@radix-ui/react-tooltip'],
        registryDependencies: [],
        parts: ['Tooltip', 'TooltipContent', 'TooltipProvider', 'TooltipTrigger'],
        imports: [
            { source: '@/components/ui/button', namedImports: ['Button'] },
            {
                source: '@/components/ui/tooltip',
                namedImports: ['Tooltip', 'TooltipContent', 'TooltipProvider', 'TooltipTrigger'],
            },
        ],
        insertCode: `<TooltipProvider>
    <Tooltip>
        <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Add to library</TooltipContent>
    </Tooltip>
</TooltipProvider>`,
        previewCode: `<TooltipProvider>
    <Tooltip>
        <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Add to library</TooltipContent>
    </Tooltip>
</TooltipProvider>`,
    },
];

export const getShadcnComponent = (name: string): ShadcnComponentDefinition | undefined =>
    SHADCN_COMPONENTS.find((component) => component.name === name);
