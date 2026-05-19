import { useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Mail, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  Badge,
  Input,
  Textarea,
  Label,
  FieldHint,
  Select,
  PageHeader,
  EmptyState,
  Skeleton,
  SkeletonText,
  SkeletonRows,
  StatCard,
  type StatCardTone,
  Sparkline,
  Tabs,
  Dialog,
  Drawer,
  Tooltip,
  Kbd,
  DataTable,
  type DataTableColumn,
  FilterBar,
  type BadgeVariant,
  type ButtonVariant,
} from '@/components/ui';

const BADGE_VARIANTS: BadgeVariant[] = ['neutral', 'success', 'warning', 'danger', 'info', 'brand'];
const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'danger',
  'link',
];
const STAT_TONES: StatCardTone[] = [
  'brand',
  'accent',
  'emerald',
  'red',
  'amber',
  'blue',
  'purple',
  'neutral',
];

const PALETTES: { name: string; shades: { name: string; className: string; hex: string }[] }[] = [
  {
    name: 'Surface',
    shades: [
      { name: '50', className: 'bg-surface-50', hex: '#f3f0e8' },
      { name: '100', className: 'bg-surface-100', hex: '#ebe7dc' },
      { name: '200', className: 'bg-surface-200', hex: '#dcd6c7' },
      { name: '300', className: 'bg-surface-300', hex: '#bdb6a3' },
      { name: '400', className: 'bg-surface-400', hex: '#827d70' },
      { name: '500', className: 'bg-surface-500', hex: '#5e5b56' },
      { name: '600', className: 'bg-surface-600', hex: '#45433f' },
      { name: '700', className: 'bg-surface-700', hex: '#2f2d2a' },
      { name: '800', className: 'bg-surface-800', hex: '#1f1d1b' },
      { name: '900', className: 'bg-surface-900', hex: '#14120f' },
      { name: '950', className: 'bg-surface-950', hex: '#0a0907' },
    ],
  },
  {
    name: 'Brand (emerald)',
    shades: [
      { name: '50', className: 'bg-brand-50', hex: '#ecfdf5' },
      { name: '100', className: 'bg-brand-100', hex: '#d1fae5' },
      { name: '200', className: 'bg-brand-200', hex: '#a7f3d0' },
      { name: '300', className: 'bg-brand-300', hex: '#6ee7b7' },
      { name: '400', className: 'bg-brand-400', hex: '#34d399' },
      { name: '500', className: 'bg-brand-500', hex: '#10b981' },
      { name: '600', className: 'bg-brand-600', hex: '#059669' },
      { name: '700', className: 'bg-brand-700', hex: '#047857' },
      { name: '800', className: 'bg-brand-800', hex: '#065f46' },
      { name: '900', className: 'bg-brand-900', hex: '#064e3b' },
      { name: '950', className: 'bg-brand-950', hex: '#022c22' },
    ],
  },
  {
    name: 'Accent (terracotta)',
    shades: [
      { name: '50', className: 'bg-accent-50', hex: '#fdf4f0' },
      { name: '100', className: 'bg-accent-100', hex: '#fbe7df' },
      { name: '200', className: 'bg-accent-200', hex: '#f6cab9' },
      { name: '300', className: 'bg-accent-300', hex: '#efa78d' },
      { name: '400', className: 'bg-accent-400', hex: '#e58266' },
      { name: '500', className: 'bg-accent-500', hex: '#d97757' },
      { name: '600', className: 'bg-accent-600', hex: '#c25e3c' },
      { name: '700', className: 'bg-accent-700', hex: '#a14a2e' },
      { name: '800', className: 'bg-accent-800', hex: '#823c28' },
      { name: '900', className: 'bg-accent-900', hex: '#6a3322' },
      { name: '950', className: 'bg-accent-950', hex: '#3a1a11' },
    ],
  },
];

const SELECT_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium', description: 'Typical default' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const TABLE_DATA = [
  { id: '1', name: 'Acme Corp', status: 'approved', score: 92 },
  { id: '2', name: 'Globex', status: 'in_review', score: 71 },
  { id: '3', name: 'Initech', status: 'rejected', score: 38 },
  { id: '4', name: 'Umbrella', status: 'in_review', score: 64 },
];

const TABLE_COLUMNS: DataTableColumn<(typeof TABLE_DATA)[number]>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Vendor',
    mobileLabel: 'Vendor',
    cell: ({ row }) => <span className="text-surface-900 font-medium">{row.original.name}</span>,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    mobileLabel: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === 'approved'
            ? 'success'
            : row.original.status === 'rejected'
              ? 'danger'
              : 'warning'
        }
        dot
        size="sm"
        className="capitalize"
      >
        {row.original.status.replace(/_/g, ' ')}
      </Badge>
    ),
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Score',
    mobileLabel: 'Score',
    cell: ({ row }) => {
      const s = row.original.score;
      const bar = s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-yellow-500' : 'bg-red-500';
      return (
        <div className="flex items-center gap-2">
          <span className="text-small text-surface-900 tabular-nums w-7">{s}</span>
          <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div className={bar} style={{ width: `${s}%`, height: '100%' }} />
          </div>
        </div>
      );
    },
  },
];

const TRENDS = {
  up: [12, 16, 14, 19, 22, 25, 31, 38],
  flat: [14, 15, 13, 14, 15, 14, 15, 14],
  down: [38, 34, 30, 29, 22, 19, 14, 11],
};

export default function DesignSystem() {
  const [text, setText] = useState('');
  const [select1, setSelect1] = useState('medium');
  const [select2, setSelect2] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  return (
    <div className="space-y-10 pb-16">
      <PageHeader
        title="Design System"
        description="Tokens, primitives, and patterns. Every page on GigaChad GRC composes from this."
        meta={
          <Badge variant="brand" size="sm">
            v1
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
              Filter
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add primitive</Button>
          </>
        }
      />

      {/* ============ TOKENS ============ */}
      <Section
        title="Tokens"
        description="Foundation values that every primitive consumes. Never use raw gray-* — only surface-*."
      >
        {PALETTES.map((p) => (
          <div key={p.name} className="space-y-2">
            <h3 className="text-small font-semibold text-surface-900">{p.name}</h3>
            <div className="grid grid-cols-6 lg:grid-cols-11 gap-1">
              {p.shades.map((s) => (
                <div key={s.name} className="space-y-1">
                  <div
                    className={`${s.className} h-12 rounded-md border border-surface-200`}
                    aria-label={s.hex}
                  />
                  <div className="text-[10px] text-surface-600 font-mono leading-tight">
                    <div>{s.name}</div>
                    <div className="text-surface-500">{s.hex}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card density="cozy">
            <h3 className="text-small font-semibold text-surface-900 mb-3">Typography</h3>
            <div className="space-y-2">
              <p className="text-display text-surface-900">Display — 32px</p>
              <p className="text-h1 text-surface-900">Heading 1 — 26px</p>
              <p className="text-h2 text-surface-900">Heading 2 — 18px</p>
              <p className="text-h3 text-surface-900">Heading 3 — 15px</p>
              <p className="text-body text-surface-800">Body — 14px</p>
              <p className="text-small text-surface-700">Small — 13px</p>
              <p className="font-mono text-xs text-surface-700">font-mono — 12px</p>
            </div>
          </Card>
          <Card density="cozy">
            <h3 className="text-small font-semibold text-surface-900 mb-3">Radii &amp; shadows</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                ['rounded-sm', 'sm'],
                ['rounded-md', 'md'],
                ['rounded-lg', 'lg'],
                ['rounded-xl', 'xl'],
              ].map(([cls, label]) => (
                <div key={cls} className="text-center">
                  <div className={`bg-surface-100 border border-surface-200 ${cls} h-12`} />
                  <p className="text-xs text-surface-600 mt-1 font-mono">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center">
                <div className="bg-white rounded-md h-12 shadow-lift" />
                <p className="text-xs text-surface-600 mt-1 font-mono">lift</p>
              </div>
              <div className="text-center">
                <div className="bg-white rounded-md h-12 shadow-lift-hover" />
                <p className="text-xs text-surface-600 mt-1 font-mono">lift-hover</p>
              </div>
              <div className="text-center">
                <div className="bg-white rounded-md h-12 shadow-glow-brand" />
                <p className="text-xs text-surface-600 mt-1 font-mono">glow-brand</p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* ============ BUTTON ============ */}
      <Section
        title="Button"
        description="Use primary for the main action. Outline/ghost for secondary; danger for destructive."
      >
        <Subsection title="Variants">
          <div className="flex flex-wrap gap-2">
            {BUTTON_VARIANTS.map((v) => (
              <Button key={v} variant={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </div>
        </Subsection>

        <Subsection title="Sizes">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </Subsection>

        <Subsection title="States">
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Plus className="h-4 w-4" />}>With left icon</Button>
            <Button rightIcon={<Mail className="h-4 w-4" />} variant="outline">
              With right icon
            </Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
              Destructive
            </Button>
          </div>
        </Subsection>
      </Section>

      {/* ============ BADGE ============ */}
      <Section
        title="Badge"
        description="Status pills. Always use dot for live status; omit dot for tags/labels."
      >
        <Subsection title="Variants">
          <div className="flex flex-wrap gap-2">
            {BADGE_VARIANTS.map((v) => (
              <Badge key={v} variant={v} className="capitalize">
                {v}
              </Badge>
            ))}
          </div>
        </Subsection>
        <Subsection title="With dot">
          <div className="flex flex-wrap gap-2">
            {BADGE_VARIANTS.map((v) => (
              <Badge key={v} variant={v} dot className="capitalize">
                {v}
              </Badge>
            ))}
          </div>
        </Subsection>
        <Subsection title="Sizes">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info" size="sm">
              Small
            </Badge>
            <Badge variant="info" size="md">
              Medium
            </Badge>
          </div>
        </Subsection>
      </Section>

      {/* ============ FORMS ============ */}
      <Section
        title="Form controls"
        description="Input, Textarea, Select, Label, FieldHint — Headless UI under the hood."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card density="cozy" className="space-y-3">
            <div>
              <Label htmlFor="ds-text" required>
                Text input
              </Label>
              <Input
                id="ds-text"
                placeholder="Type here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
              <FieldHint>Use leftIcon for search-style inputs.</FieldHint>
            </div>
            <div>
              <Label htmlFor="ds-text-invalid">Invalid</Label>
              <Input id="ds-text-invalid" placeholder="…" defaultValue="bad value" invalid />
              <FieldHint error>This value is not allowed.</FieldHint>
            </div>
            <div>
              <Label htmlFor="ds-ta">Textarea</Label>
              <Textarea id="ds-ta" placeholder="Multi-line input…" rows={3} />
            </div>
          </Card>

          <Card density="cozy" className="space-y-3">
            <div>
              <Label htmlFor="ds-sel">Plain select</Label>
              <Select
                value={select1}
                onChange={setSelect1}
                options={SELECT_OPTIONS}
                placeholder="Pick severity"
                clearable
              />
              <FieldHint>Use plain Select for ≤7 options.</FieldHint>
            </div>
            <div>
              <Label htmlFor="ds-sel2">Searchable select</Label>
              <Select
                value={select2}
                onChange={setSelect2}
                options={SELECT_OPTIONS}
                placeholder="Search…"
                searchable
                clearable
              />
              <FieldHint>Use searchable Select for ≥8 options.</FieldHint>
            </div>
          </Card>
        </div>
      </Section>

      {/* ============ CARD ============ */}
      <Section
        title="Card"
        description="The canonical container. Use slots (Header/Title/Description/Body/Footer) for structured cards."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>With slots</CardTitle>
                <CardDescription>Full anatomy</CardDescription>
              </div>
              <Badge variant="brand" size="sm">
                New
              </Badge>
            </CardHeader>
            <CardBody>
              <p className="text-body text-surface-800">
                CardHeader + Title + Description + Body + Footer give you a consistent layout.
              </p>
            </CardBody>
            <CardFooter>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>

          <Card density="cozy">
            <h3 className="text-h3 text-surface-900">Simple card</h3>
            <p className="text-small text-surface-700 mt-1">
              Density prop sets padding without needing slots.
            </p>
          </Card>

          <Card interactive density="cozy">
            <h3 className="text-h3 text-surface-900">Interactive</h3>
            <p className="text-small text-surface-700 mt-1">
              Hover-lift + cursor-pointer when{' '}
              <code className="font-mono text-xs">interactive</code> is true.
            </p>
          </Card>
        </div>
      </Section>

      {/* ============ STAT CARDS / SPARKLINE ============ */}
      <Section
        title="StatCard &amp; Sparkline"
        description="At-a-glance metrics. tone= chooses the icon tint and sparkline color."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Controls"
            value={142}
            delta={4.2}
            trend={TRENDS.up}
            tone="brand"
            caption="of 240 total"
          />
          <StatCard
            label="Findings"
            value={17}
            delta={-12}
            deltaPositiveIsGood={false}
            trend={TRENDS.down}
            tone="red"
          />
          <StatCard label="Coverage" value="86%" delta={0} trend={TRENDS.flat} tone="emerald" />
          <StatCard
            label="Vendors"
            value={31}
            trend={TRENDS.up}
            tone="amber"
            caption="3 expiring soon"
          />
        </div>
        <Subsection title="All tones">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STAT_TONES.map((t) => (
              <StatCard key={t} label={t} value="—" tone={t} />
            ))}
          </div>
        </Subsection>
        <Subsection title="Sparkline (stand-alone)">
          <div className="flex items-center gap-4">
            <Sparkline data={TRENDS.up} stroke="rgb(16 185 129)" fill="rgba(16,185,129,0.15)" />
            <Sparkline data={TRENDS.flat} stroke="rgb(154 160 180)" fill="rgba(154,160,180,0.12)" />
            <Sparkline data={TRENDS.down} stroke="rgb(248 113 113)" fill="rgba(248,113,113,0.15)" />
          </div>
        </Subsection>
      </Section>

      {/* ============ DATATABLE ============ */}
      <Section
        title="DataTable"
        description="TanStack v8 wrapper. Always pass column id + accessorKey/Fn + cell render fn."
      >
        <DataTable columns={TABLE_COLUMNS} data={TABLE_DATA} />
        <Subsection title="Loading state">
          <DataTable columns={TABLE_COLUMNS} data={[]} loading />
        </Subsection>
        <Subsection title="Empty state">
          <DataTable
            columns={TABLE_COLUMNS}
            data={[]}
            emptyState={
              <EmptyState
                icon={<Search />}
                title="No vendors yet"
                description="Add your first vendor to start tracking risk."
                action={<Button leftIcon={<Plus className="h-4 w-4" />}>New vendor</Button>}
              />
            }
          />
        </Subsection>
      </Section>

      {/* ============ FILTER BAR ============ */}
      <Section
        title="FilterBar"
        description="The filter row above tables. Pass active filters for the chip dismiss row."
      >
        <FilterBar
          active={
            filterStatus
              ? [
                  {
                    key: 'status',
                    label: `Status: ${filterStatus}`,
                    onClear: () => setFilterStatus(''),
                  },
                ]
              : []
          }
          onClearAll={filterStatus ? () => setFilterStatus('') : undefined}
        >
          <Input
            inputSize="sm"
            className="w-64"
            placeholder="Search…"
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            size="sm"
            fullWidth={false}
            className="w-44"
            placeholder="All statuses"
            value={filterStatus}
            onChange={setFilterStatus}
            options={SELECT_OPTIONS}
            clearable
          />
        </FilterBar>
      </Section>

      {/* ============ TABS ============ */}
      <Section
        title="Tabs"
        description="Headless UI Tab.Group under the hood. Pass an items array."
      >
        <Tabs
          tabs={[
            {
              label: 'Overview',
              content: (
                <Card density="cozy">
                  <p className="text-body text-surface-800">Overview tab content.</p>
                </Card>
              ),
            },
            {
              label: 'Activity',
              content: (
                <Card density="cozy">
                  <p className="text-body text-surface-800">Activity tab content.</p>
                </Card>
              ),
            },
            {
              label: 'Settings',
              content: (
                <Card density="cozy">
                  <p className="text-body text-surface-800">Settings tab content.</p>
                </Card>
              ),
            },
            {
              label: 'Disabled',
              disabled: true,
              content: null,
            },
          ]}
        />
      </Section>

      {/* ============ OVERLAYS ============ */}
      <Section
        title="Overlays"
        description="Dialog for confirmations; Drawer for record detail; Tooltip for hint copy."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialogOpen(true)} variant="outline">
            Open Dialog
          </Button>
          <Button onClick={() => setDrawerOpen(true)} variant="outline">
            Open Drawer
          </Button>
          <Tooltip content="This is a tooltip">
            <Button variant="ghost">Hover me</Button>
          </Tooltip>
        </div>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Delete control?"
          description="This will permanently remove CR-042 and all linked evidence. This action cannot be undone."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setDialogOpen(false)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-body text-surface-700">
            Type{' '}
            <code className="font-mono text-xs bg-surface-100 px-1 py-0.5 rounded">CR-042</code>{' '}
            below to confirm.
          </p>
        </Dialog>

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          size="lg"
          title="Sample drawer"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
              <Button>Open full page</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Badge variant="success" dot>
              Implemented
            </Badge>
            <p className="text-body text-surface-800">
              Drawers are the canonical pattern for record detail. They preserve list context,
              support nesting (HUI stack), and accept a footer.
            </p>
            <Card density="cozy">
              <p className="text-small text-surface-700">
                Place sections inside Cards for visual separation.
              </p>
            </Card>
          </div>
        </Drawer>
      </Section>

      {/* ============ EMPTY / SKELETON ============ */}
      <Section
        title="EmptyState &amp; Skeleton"
        description="Always render a meaningful loading and empty state. No bare spinners."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <EmptyState
              icon={<Search />}
              title="No matches"
              description="Try adjusting your filters or search query."
              action={<Button variant="outline">Clear filters</Button>}
            />
          </Card>
          <Card density="cozy" className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <SkeletonText lines={3} />
            <SkeletonRows rows={3} />
          </Card>
        </div>
      </Section>

      {/* ============ MISC ============ */}
      <Section
        title="Miscellaneous"
        description="Keyboard hints, breadcrumbs (top-level via Layout), and other small bits."
      >
        <Subsection title="Keyboard">
          <div className="flex flex-wrap items-center gap-2 text-small text-surface-700">
            <span>Press</span>
            <Kbd>⌘</Kbd>
            <span>+</span>
            <Kbd>K</Kbd>
            <span>to open the command palette, or</span>
            <Kbd>?</Kbd>
            <span>for keyboard shortcuts.</span>
          </div>
        </Subsection>
      </Section>

      {/* ============ RULES ============ */}
      <Section title="Rules of the road">
        <Card density="cozy">
          <ul className="space-y-2 text-small text-surface-800">
            <Rule>
              Never use raw <code className="font-mono text-xs">gray-*</code> classes — only{' '}
              <code className="font-mono text-xs">surface-*</code>.
            </Rule>
            <Rule>
              Page bg is <code className="font-mono text-xs">surface-50</code>, card bg is white,
              borders are <code className="font-mono text-xs">surface-200</code>.
            </Rule>
            <Rule>
              Brand emerald is for primary CTAs and positive/passing semantics; never for accent
              decoration.
            </Rule>
            <Rule>
              Accent terracotta is used sparingly for emphasis and human moments — never for status.
            </Rule>
            <Rule>
              Status colors: success = emerald, warning = amber, danger = red. Always use{' '}
              <code className="font-mono text-xs">Badge variant</code>, never custom.
            </Rule>
            <Rule>
              <strong>
                Always use the Badge primitive (or{' '}
                <code className="font-mono text-xs">categoryChipClass</code>) for pills.
              </strong>{' '}
              Never hand-roll <code className="font-mono text-xs">px-2 py-1 rounded</code> spans —
              they drift. Search the codebase before adding new pill markup.
            </Rule>
            <Rule>
              Badge capitalizes its content by default. Pass{' '}
              <code className="font-mono text-xs">capitalize={'{false}'}</code> only for acronyms
              (PDF, MFA, CSV) or HTTP methods (GET, POST).
            </Rule>
            <Rule>
              Enum values are snake_case in the API. Render them with{' '}
              <code className="font-mono text-xs">{'{value.replace(/_/g, " ")}'}</code> inside a
              Badge — capitalize is on by default so the result is Title Case.
            </Rule>
            <Rule>
              For per-category/per-domain pills (control category, framework type, permission
              resource), use <code className="font-mono text-xs">categoryChipClass(value)</code>{' '}
              from <code className="font-mono text-xs">@/lib/categoryStyle</code> — never a custom
              color map.
            </Rule>
            <Rule>
              For risk status pills, use{' '}
              <code className="font-mono text-xs">riskStatusVariant(status)</code> from{' '}
              <code className="font-mono text-xs">@/lib/riskStatus</code> as the Badge variant.
              Single source of truth across Drawer, Detail, Dashboard.
            </Rule>
            <Rule>
              Use 700/800 text shades on light bg (
              <code className="font-mono text-xs">text-emerald-700</code>,{' '}
              <code className="font-mono text-xs">text-red-700</code>,{' '}
              <code className="font-mono text-xs">text-amber-800</code>). Avoid 300/400 — those were
              dark-mode defaults and are unreadable on cream.
            </Rule>
            <Rule>
              Pills use <code className="font-mono text-xs">rounded-md</code>.{' '}
              <code className="font-mono text-xs">rounded-full</code> is for avatars and dots only —
              never status pills.
            </Rule>
            <Rule>
              Every list page: <code className="font-mono text-xs">PageHeader</code> →{' '}
              <code className="font-mono text-xs">FilterBar</code> →{' '}
              <code className="font-mono text-xs">DataTable</code> (or Card grid).
            </Rule>
            <Rule>
              Every detail page: back link → <code className="font-mono text-xs">PageHeader</code>{' '}
              with meta + actions → meta strip → <code className="font-mono text-xs">Tabs</code>.
            </Rule>
            <Rule>
              Drawer-first: list row click opens a Drawer, not a navigation. Open full page is a
              footer action.
            </Rule>
            <Rule>
              Always render a <code className="font-mono text-xs">Skeleton</code> while loading and
              an <code className="font-mono text-xs">EmptyState</code> when there's nothing.
            </Rule>
            <Rule>
              Icons from <code className="font-mono text-xs">lucide-react</code> first;{' '}
              <code className="font-mono text-xs">@heroicons/react/24/outline</code> only for legacy
              parity.
            </Rule>
          </ul>
        </Card>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-surface-200 pb-2">
        <h2 className="text-h1 text-surface-900">{title}</h2>
        {description && <p className="text-small text-surface-600 mt-1 max-w-3xl">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
      <span>{children}</span>
    </li>
  );
}
