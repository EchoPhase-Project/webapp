import { createSignal } from 'solid-js';
import { useDateFormat } from '@shared/lib/date-format';
import Button from '@shared/ui/Button';
import RemoveButton from '@shared/ui/RemoveButton';
import { Cell, Row, Table } from '@shared/ui/Table';
import { IconPencil } from '@shared/ui/icons';
import { DevLog, DevSample, DevSection } from './DevKit';

type State = 'active' | 'failed' | 'running' | 'off';

// Each state's word and pill, as the features show a status.
const STATES: Record<State, { text: string; pill: string }> = {
    active: { text: 'Active', pill: 'pill pill--ok' },
    failed: { text: 'Failed', pill: 'pill pill--bad' },
    running: { text: 'Running', pill: 'pill pill--busy' },
    off: { text: 'Off', pill: 'pill pill--quiet' },
};

type Workflow = {
    id: string;
    name: string;
    state: State;
    /** ISO 8601, as the API sends it; null: never ran. */
    lastRunAt: string | null;
};

const WORKFLOWS: Workflow[] = [
    {
        id: 'w1',
        name: 'Nightly backup',
        state: 'active',
        lastRunAt: '2026-11-16T02:00:00Z',
    },
    {
        id: 'w2',
        name: 'Deploy to staging',
        state: 'failed',
        lastRunAt: '2026-11-15T17:42:10Z',
    },
    {
        id: 'w3',
        name: 'Import the price list',
        state: 'running',
        lastRunAt: '2026-11-16T09:15:00Z',
    },
    { id: 'w4', name: 'Weekly report', state: 'off', lastRunAt: null },
];

type Hook = { id: string; url: string; note: string };

const HOOKS: Hook[] = [
    {
        id: 'h1',
        url: 'https://hooks.example.com/api/v1/workflow-packages/deploy-tools/workflows/deploy-to-staging/webhooks/3f9c2a7e-51d4-4b8e-9a0c-6d2f1e8b7c45',
        note: 'Called by the CI of the main repository after each merge to the main branch, with the commit and its author in the body.',
    },
    { id: 'h2', url: 'https://example.com/hook', note: 'Short.' },
];

const columns = {
    name: 'Name',
    state: 'Status',
    lastRun: 'Last run',
    actions: 'Actions',
};

/** Table as the features use it: columns, a status, times, row actions. */
export default function TablePage() {
    const date = useDateFormat();
    const [log, setLog] = createSignal('');
    const [rows, setRows] = createSignal(WORKFLOWS);

    // As the features: a time in the profile's zone, a dash for none.
    const show = (iso: string | null) => date(iso) || '—';

    function remove(workflow: Workflow) {
        setRows((all) => all.filter((w) => w.id !== workflow.id));
        setLog(`Deleted “${workflow.name}”`);
    }

    return (
        <>
            <DevLog>{log()}</DevLog>

            <DevSection
                title="Columns, a status and row actions"
                note="Under 768px wide, each row is a card of label and value lines: make the window narrow to see it. Delete every row to see the empty text."
            >
                <div class="actions-row">
                    <Button
                        variant="ghost"
                        disabled={rows().length === WORKFLOWS.length}
                        onClick={() => {
                            setRows(WORKFLOWS);
                            setLog('Put the rows back');
                        }}
                    >
                        Put the rows back
                    </Button>
                </div>
                <Table
                    data={rows()}
                    headers={Object.values(columns)}
                    placeholder={() => <>No workflows.</>}
                    render={({ item: workflow }) => (
                        <Row>
                            <Cell label={columns.name} text={workflow.name} />
                            <Cell label={columns.state}>
                                <span class={STATES[workflow.state].pill}>
                                    {STATES[workflow.state].text}
                                </span>
                            </Cell>
                            <Cell
                                label={columns.lastRun}
                                text={show(workflow.lastRunAt)}
                            />
                            <Cell
                                label={columns.actions}
                                props={{ class: 'actions' }}
                            >
                                <span class="actions-row actions-row--end">
                                    <Button
                                        variant="ghost"
                                        disabled={workflow.state === 'running'}
                                        onClick={() =>
                                            setLog(`Ran “${workflow.name}”`)
                                        }
                                    >
                                        Run
                                    </Button>
                                    <Button
                                        variant="icon"
                                        aria-label={`Edit ${workflow.name}`}
                                        title={`Edit ${workflow.name}`}
                                        onClick={() =>
                                            setLog(`Edit “${workflow.name}”`)
                                        }
                                    >
                                        <IconPencil />
                                    </Button>
                                    <RemoveButton
                                        label={`Delete ${workflow.name}`}
                                        onClick={() => remove(workflow)}
                                    />
                                </span>
                            </Cell>
                        </Row>
                    )}
                />
            </DevSection>

            <DevSection
                title="Long text"
                note="On a wide screen a long cell ends in an ellipsis; the cell's title has the full text (text= sets it). On a phone the value ends in an ellipsis next to its label."
            >
                <Table
                    data={HOOKS}
                    headers={['Address', 'Note']}
                    placeholder={() => <>No webhooks.</>}
                    render={({ item: hook }) => (
                        <Row>
                            <Cell label="Address" props={{ title: hook.url }}>
                                <code>{hook.url}</code>
                            </Cell>
                            <Cell label="Note" text={hook.note} />
                        </Row>
                    )}
                />
            </DevSection>

            <DevSection
                title="Empty"
                note="With no rows, Table shows its placeholder in an EmptyState. The features give a short text; an add button goes in the panel head, not in the table."
            >
                <DevSample title="No rows">
                    <Table
                        data={[] as Hook[]}
                        headers={['Address', 'Note']}
                        placeholder={() => <>No webhooks.</>}
                        render={({ item: hook }) => (
                            <Row>
                                <Cell label="Address" text={hook.url} />
                                <Cell label="Note" text={hook.note} />
                            </Row>
                        )}
                    />
                </DevSample>
            </DevSection>
        </>
    );
}
