import { createSignal, type Accessor } from 'solid-js';
import { infiniteQueryOptions, useQuery } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import { createPagedList, cursorPages } from '@shared/api/paged-list';
import Card from '@shared/ui/Card';
import Masonry from '@shared/ui/Masonry';
import Paginated, { paginatedItem } from '@shared/ui/Paginated';
import QueryState from '@shared/ui/QueryState';
import Switch from '@shared/ui/Switch';
import { Cell, Row, Table } from '@shared/ui/Table';
import { DevGrid, DevSample, DevSection } from './DevKit';

type Session = { id: string; device: string; seen: string };

const SESSIONS: Session[] = [
    { id: 's1', device: 'Firefox on Linux', seen: 'Now' },
    { id: 's2', device: 'echophase-cli', seen: '2 hours ago' },
    { id: 's3', device: 'Safari on iPhone', seen: 'Yesterday' },
];

const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

const failure = () =>
    new ApiError(
        [
            {
                code: 'dev_example',
                message: 'The server did not answer. Try again.',
            },
        ],
        503
    );

/** A read of sessions that takes a second; it fails or is empty on request. */
function SessionsSample() {
    const [fail, setFail] = createSignal(false);
    const [empty, setEmpty] = createSignal(false);
    // Each choice is another key: the read starts again (pending first).
    const sessions = useQuery(() => ({
        queryKey: ['dev', 'data', 'sessions', fail(), empty()] as const,
        queryFn: async () => {
            await wait(1000);
            if (fail()) throw failure();
            return empty() ? [] : SESSIONS;
        },
        retry: false,
    }));
    return (
        <>
            <Switch
                label="The read fails"
                checked={fail()}
                onChange={setFail}
            />
            <Switch
                label="Nothing in it"
                checked={empty()}
                onChange={setEmpty}
            />
            <QueryState
                query={sessions}
                placeholder={[]}
                empty="No sessions. (The empty text of QueryState.)"
            >
                {(list) => (
                    <Table
                        data={list()}
                        headers={['Device', 'Last seen']}
                        placeholder={() => <>No sessions.</>}
                        render={({ item }) => (
                            <Row>
                                <Cell label="Device" text={item.device} />
                                <Cell label="Last seen" text={item.seen} />
                            </Row>
                        )}
                    />
                )}
            </QueryState>
        </>
    );
}

type Run = { id: string; name: string; text: string };

/** 23 fake runs, 5 a page; the texts of different lengths for Masonry. */
const RUNS: Run[] = Array.from({ length: 23 }, (_, i) => ({
    id: `r${i + 1}`,
    name: `Run ${i + 1}`,
    text: 'A run that did its work. '.repeat((i % 4) + 1),
}));
const PAGE = 5;

/**
 * A fake list in pages, as a feature's `…InfiniteQuery` description gives
 * it: a page takes 0.8 s; `fail` fails the requests while it is on; `empty`
 * is another key, with nothing in it.
 */
const fakeRunsInfiniteQuery = (
    sample: string,
    empty: boolean,
    fail: Accessor<boolean>
) =>
    infiniteQueryOptions({
        queryKey: ['dev', 'data', 'runs', sample, empty] as const,
        queryFn: async ({ pageParam }) => {
            await wait(800);
            if (fail()) throw failure();
            const from = Number(pageParam ?? 0);
            const items = empty ? [] : RUNS.slice(from, from + PAGE);
            const next = from + PAGE < (empty ? 0 : RUNS.length);
            return { items, next: next ? String(from + PAGE) : null };
        },
        retry: false,
        ...cursorPages,
    });

/** The switches of a list sample, and its list. */
function useFakeRuns(sample: string) {
    const [fail, setFail] = createSignal(false);
    const [empty, setEmpty] = createSignal(false);
    const list = createPagedList(() =>
        fakeRunsInfiniteQuery(sample, empty(), fail)
    );
    const switches = () => (
        <>
            <Switch
                label="The requests fail"
                checked={fail()}
                onChange={setFail}
            />
            <Switch
                label="Nothing in it (a new query)"
                checked={empty()}
                onChange={setEmpty}
            />
        </>
    );
    return { list, switches };
}

function RunTable(props: { items: Run[] }) {
    return (
        <Table
            data={props.items}
            headers={['Run', 'What it did']}
            placeholder={() => <>No runs.</>}
            render={({ item }) => (
                <Row props={paginatedItem}>
                    <Cell label="Run">
                        <a href={`#${item.id}`}>{item.name}</a>
                    </Cell>
                    <Cell label="What it did" text={item.text} />
                </Row>
            )}
        />
    );
}

function MoreSample() {
    const { list, switches } = useFakeRuns('more');
    return (
        <>
            {switches()}
            <Paginated list={list} empty="No runs yet.">
                {(items) => <RunTable items={items()} />}
            </Paginated>
        </>
    );
}

function PagesSample() {
    const { list, switches } = useFakeRuns('pages');
    return (
        <>
            {switches()}
            <Paginated list={list} mode="pages" empty="No runs yet.">
                {(items) => <RunTable items={items()} />}
            </Paginated>
        </>
    );
}

function MasonrySample() {
    const { list, switches } = useFakeRuns('masonry');
    return (
        <>
            {switches()}
            <Paginated list={list} auto empty="No runs yet.">
                {(items) => (
                    <Masonry each={items()} itemProps={paginatedItem}>
                        {(run) => (
                            <Card class="dev-masonry-card">
                                <p>
                                    <a href={`#${run.id}`}>{run.name}</a>
                                </p>
                                <p>{run.text}</p>
                            </Card>
                        )}
                    </Masonry>
                )}
            </Paginated>
        </>
    );
}

/** QueryState on fake reads; Paginated on fake lists in pages. */
export default function DataPage() {
    return (
        <>
            <DevSection
                title="QueryState"
                note="One read in its states: the table in its loading form for a second, then the data, the empty text, or LoadError with Try again. A switch starts the read again."
            >
                <DevGrid wide>
                    <DevSample title="A table with a placeholder">
                        <SessionsSample />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="Paginated"
                note="A fake list of 23 runs, 5 a page, 0.8 s a page. Show more moves the focus to the first new row. Previous shows a loaded page without a request; Next asks only for a page not loaded yet. A failed first page shows LoadError in place of the list; a failed next page shows it under the rows."
            >
                <DevGrid wide>
                    <DevSample title="Mode more, a Table">
                        <MoreSample />
                    </DevSample>
                    <DevSample title="Mode pages, a Table">
                        <PagesSample />
                    </DevSample>
                    <DevSample title="Mode more with auto, a Masonry">
                        <MasonrySample />
                    </DevSample>
                </DevGrid>
            </DevSection>
        </>
    );
}
