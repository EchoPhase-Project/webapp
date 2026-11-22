import { createSignal } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
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

/** QueryState on fake reads; Paginated on fake lists in pages. */
export default function DataPage() {
    return (
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
    );
}
