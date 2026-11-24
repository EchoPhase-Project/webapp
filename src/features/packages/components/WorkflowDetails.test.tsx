// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { pageSection } from '@shared/nav/page-section';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { pkg, workflow } from '@features/packages/fixtures';
import WorkflowDetails from './WorkflowDetails';

const run = (over: Record<string, unknown> = {}) => ({
    runId: 'r1',
    status: 'failed',
    actorId: null,
    workflowId: 'w1',
    programHash: 'h',
    trigger: 'webhook',
    blockCount: 2,
    createdAt: '2026-10-25T10:00:00Z',
    startedAt: '2026-10-25T10:00:01Z',
    finishedAt: '2026-10-25T10:00:02Z',
    durationMs: 1200,
    steps: 2,
    errorCount: 1,
    ...over,
});

const routes = (
    over: Record<string, (r: Request) => Response | Promise<Response>> = {}
) => ({
    ...signedIn,
    'GET /api/v1/workflow-packages/p1': () =>
        json(200, pkg({ access: 'Owner' })),
    'GET /api/v1/workflows/w1': () => json(200, workflow()),
    'GET /api/v1/workflows/w1/runs': () =>
        json(200, { data: [run()], nextCursor: null }),
    'GET /api/v1/workflows/w1/versions': () =>
        json(200, [
            {
                version: 3,
                name: 'Guild report',
                contentHash: 'h3',
                parentVersion: 2,
                restoredFrom: null,
                savedBy: null,
                createdAt: '2026-10-25T10:00:00Z',
            },
            {
                version: 2,
                name: 'Guild report',
                contentHash: 'h2',
                parentVersion: 1,
                restoredFrom: null,
                savedBy: null,
                createdAt: '2026-10-24T10:00:00Z',
            },
        ]),
    ...over,
});

describe('WorkflowDetails', () => {
    it('shows what it is: its blocks only; its webhooks and schedules have tabs', async () => {
        fakeApi(routes());
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);

        expect(
            await screen.findByRole('heading', {
                name: 'Guild report',
                level: 1,
            })
        ).toBeTruthy();
        expect(screen.getByText('WebhookTrigger')).toBeTruthy();
        expect(screen.getByText('say hi')).toBeTruthy();
        expect(screen.queryByText(/\/api\/v1\/hooks\/w1\/1$/)).toBeNull();
        expect(
            await screen.findByRole('link', { name: 'Webhooks' })
        ).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Schedules' })).toBeTruthy();
        // Back to its package, by name.
        expect(
            (
                await screen.findByRole('link', { name: /Guild tools/ })
            ).getAttribute('href')
        ).toBe('/packages/p1/workflows');
    });

    it('has no webhooks tab without a WebhookTrigger', async () => {
        fakeApi(
            routes({
                'GET /api/v1/workflows/w1': () =>
                    json(200, workflow({ webhooks: [] })),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);

        expect(
            await screen.findByRole('link', { name: 'Schedules' })
        ).toBeTruthy();
        expect(screen.queryByRole('link', { name: 'Webhooks' })).toBeNull();
    });

    it('lists the webhooks: the secret only when asked; a new one from the edit dialog', async () => {
        const api = fakeApi(
            routes({
                'PUT /api/v1/workflows/w1': () =>
                    json(200, workflow({ version: 4 })),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="webhooks" />
        ));

        expect(
            await screen.findByText(/\/api\/v1\/hooks\/w1\/1$/)
        ).toBeTruthy();
        expect(screen.getByText('202 at once')).toBeTruthy();
        expect(screen.queryByText('a-secret-of-sixteen')).toBeNull();
        fireEvent.click(
            screen.getByRole('button', { name: 'Show the secret' })
        );
        const shown = screen.getByText('a-secret-of-sixteen');
        // The secret is plain text in its cell, outside every live region:
        // the status region only ever says "Copied".
        const regions = screen.getAllByRole('status');
        for (const region of regions) {
            expect(region.textContent).not.toContain('a-secret-of-sixteen');
            expect(region.contains(shown)).toBe(false);
        }
        expect(
            shown.closest('[aria-live], [role="status"], [role="alert"]')
        ).toBeNull();
        expect(shown.closest('[aria-hidden="true"], [hidden]')).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'Edit the webhook' })
        );
        fireEvent.click(await screen.findByLabelText(/New secret/));
        fireEvent.click(screen.getByLabelText(/The run’s output/));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflows/w1')).toHaveLength(1)
        );
        const body = (await api
            .calls('PUT /api/v1/workflows/w1')[0]
            .json()) as {
            version: number;
            program: {
                blocks: { params: { secret?: string; respond?: string } }[];
            };
        };
        expect(body.version).toBe(3);
        const params = body.program.blocks[0].params;
        expect(params.respond).toBe('OnFinish');
        expect(params.secret).not.toBe('a-secret-of-sixteen');
        expect((params.secret ?? '').length).toBeGreaterThanOrEqual(16);

        // After the save, the secret (here the saved workflow's) is shown in
        // its cell, and no live region reads it.
        const after = await screen.findByText('a-secret-of-sixteen');
        for (const region of screen.getAllByRole('status'))
            expect(region.textContent).not.toContain('a-secret-of-sixteen');
        expect(
            after.closest('[aria-live], [role="status"], [role="alert"]')
        ).toBeNull();
        await expectNoA11yViolations();
    });

    it('shows a failed webhook edit in its dialog, which stays open', async () => {
        fakeApi(
            routes({
                'PUT /api/v1/workflows/w1': () =>
                    json(409, {
                        code: 'TestChanged',
                        message: 'The workflow changed meanwhile.',
                    }),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="webhooks" />
        ));

        fireEvent.click(
            await screen.findByRole('button', { name: 'Edit the webhook' })
        );
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

        const alert = await within(dialog).findByRole('alert');
        expect(alert.textContent).toBe('The workflow changed meanwhile.');
        expect(document.activeElement).toBe(alert);
        // Only once: not again on the page behind the dialog.
        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(dialog.closest('dialog')?.hasAttribute('open')).toBe(true);
        await expectNoA11yViolations();
    });

    it('shows a failed schedule save in its dialog, which stays open', async () => {
        fakeApi(
            routes({
                'PUT /api/v1/workflows/w1': () =>
                    json(409, {
                        code: 'TestChanged',
                        message: 'The workflow changed meanwhile.',
                    }),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="schedules" />
        ));

        fireEvent.click(
            await screen.findByRole('button', { name: 'Add a schedule' })
        );
        const dialog = await screen.findByRole('dialog');
        fireEvent.input(within(dialog).getByLabelText(/^Cron/), {
            target: { value: '0 9 * * *' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

        const alert = await within(dialog).findByRole('alert');
        expect(alert.textContent).toBe('The workflow changed meanwhile.');
        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(dialog.closest('dialog')?.hasAttribute('open')).toBe(true);
        // The typed cron is still there, for another try.
        expect(
            within(dialog).getByLabelText<HTMLInputElement>(/^Cron/).value
        ).toBe('0 9 * * *');
    });

    it('adds a schedule that starts where the other triggers do', async () => {
        const api = fakeApi(
            routes({
                'PUT /api/v1/workflows/w1': () =>
                    json(200, workflow({ version: 4 })),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="schedules" />
        ));
        expect(await screen.findByText('No schedules.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Add a schedule' }));
        fireEvent.input(await screen.findByLabelText(/^Cron/), {
            target: { value: '0 9 * * 1-5' },
        });
        // The zone comes from the list: type part of it, pick it.
        const zone = screen.getByRole<HTMLInputElement>('combobox', {
            name: /^Time zone/,
        });
        fireEvent.input(zone, { target: { value: 'chisinau' } });
        fireEvent.click(
            screen.getByRole('option', { name: 'Europe/Chisinau' })
        );
        expect(zone.value).toBe('Europe/Chisinau');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflows/w1')).toHaveLength(1)
        );
        const body = (await api
            .calls('PUT /api/v1/workflows/w1')[0]
            .json()) as {
            program: {
                blocks: {
                    id: number;
                    type: string;
                    params: { cron?: string };
                }[];
                connections: { from: number; to: number }[];
                settings: { timeZone?: string };
            };
        };
        const added = body.program.blocks.find(
            (b) => b.type === 'ScheduleTrigger'
        );
        expect(added).toMatchObject({ id: 3, params: { cron: '0 9 * * 1-5' } });
        expect(body.program.connections).toContainEqual({
            from: 3,
            to: 2,
            output: 'main',
        });
        expect(body.program.settings.timeZone).toBe('Europe/Chisinau');
    });

    it('edits a schedule in its dialog, and deletes one after asking', async () => {
        // A workflow with one schedule: block 3, before the Print block.
        const scheduled = workflow({
            program: {
                blocks: [
                    {
                        id: 1,
                        type: 'WebhookTrigger',
                        params: { secret: 'a-secret-of-sixteen' },
                    },
                    { id: 2, type: 'Print', name: 'say hi', params: {} },
                    {
                        id: 3,
                        type: 'ScheduleTrigger',
                        params: { cron: '0 9 * * *' },
                    },
                ],
                connections: [
                    { from: 1, to: 2, output: 'main' },
                    { from: 3, to: 2, output: 'main' },
                ],
                startIds: [],
                settings: {},
            },
            schedules: [
                {
                    blockId: 3,
                    cron: '0 9 * * *',
                    timeZone: 'UTC',
                    nextRunAt: '2026-10-26T09:00:00Z',
                },
            ],
        });
        type Body = {
            program: {
                blocks: { id: number; params: { cron?: string } }[];
                connections: { from: number }[];
            };
        };
        // The saves in turn: the edit, a refused delete, the delete.
        const answers = [
            () => json(200, { ...scheduled, version: 4 }),
            () =>
                json(409, {
                    code: 'TestChanged',
                    message: 'The workflow changed meanwhile.',
                }),
            () => json(200, workflow({ version: 5 })),
        ];
        const api = fakeApi(
            routes({
                'GET /api/v1/workflows/w1': () => json(200, scheduled),
                'PUT /api/v1/workflows/w1': () => {
                    const answer = answers.shift();
                    if (!answer) throw new Error('one save too many');
                    return answer();
                },
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="schedules" />
        ));
        expect(await screen.findByText('0 9 * * *')).toBeTruthy();

        // Edit: the dialog opens with the cron; the save changes block 3.
        fireEvent.click(
            screen.getByRole('button', { name: 'Edit the schedule' })
        );
        const dialog = await screen.findByRole('dialog');
        const cron = within(dialog).getByLabelText<HTMLInputElement>(/^Cron/);
        expect(cron.value).toBe('0 9 * * *');
        fireEvent.input(cron, { target: { value: '30 8 * * *' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflows/w1')).toHaveLength(1)
        );
        const edited = (await api
            .calls('PUT /api/v1/workflows/w1')[0]
            .json()) as Body;
        expect(edited.program.blocks).toHaveLength(3);
        expect(edited.program.blocks.find((b) => b.id === 3)?.params.cron).toBe(
            '30 8 * * *'
        );
        await waitFor(() =>
            expect(dialog.closest('dialog')?.hasAttribute('open')).toBe(false)
        );

        // Delete: asked first; a refusal stays in the question.
        fireEvent.click(
            await screen.findByRole('button', { name: 'Delete the schedule' })
        );
        const question = await screen.findByRole('alertdialog');
        const yes = question.querySelector('.btn-danger') as HTMLElement;
        fireEvent.click(yes);
        expect((await within(question).findByRole('alert')).textContent).toBe(
            'The workflow changed meanwhile.'
        );
        expect(question.closest('dialog')?.hasAttribute('open')).toBe(true);

        fireEvent.click(yes);
        await waitFor(() =>
            expect(question.closest('dialog')?.hasAttribute('open')).toBe(false)
        );
        // Block 3 and its connection go; the rest stays.
        const deleted = (await api
            .calls('PUT /api/v1/workflows/w1')[2]
            .json()) as Body;
        expect(deleted.program.blocks.map((b) => b.id)).toEqual([1, 2]);
        expect(deleted.program.connections.map((c) => c.from)).toEqual([1]);
    });

    it('runs it with a JSON input, refusing what is not JSON', async () => {
        const api = fakeApi(
            routes({
                'POST /api/v1/workflows/w1/runs': () =>
                    json(202, { runId: 'r9', status: 'queued' }),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Run now' }));

        const input = screen.getByLabelText(/Input \(JSON/);
        fireEvent.input(input, { target: { value: '{nope' } });
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        // The message under the input, which takes the focus to read it out.
        await waitFor(() =>
            expect(input.getAttribute('aria-invalid')).toBe('true')
        );
        expect(document.activeElement).toBe(input);
        expect(
            document.getElementById(input.getAttribute('aria-describedby')!)!
                .textContent
        ).toMatch(/not JSON/);
        expect(api.calls('POST /api/v1/workflows/w1/runs')).toHaveLength(0);

        fireEvent.input(input, { target: { value: '{"user": "ann"}' } });
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        await waitFor(() =>
            expect(api.calls('POST /api/v1/workflows/w1/runs')).toHaveLength(1)
        );
        expect(
            await api.calls('POST /api/v1/workflows/w1/runs')[0].json()
        ).toEqual({ input: { user: 'ann' } });
    });

    it('locks the input while the run starts', async () => {
        let answer: () => void = () => {};
        const arrived = new Promise<void>((ok) => (answer = ok));
        fakeApi(
            routes({
                'POST /api/v1/workflows/w1/runs': async () => {
                    await arrived;
                    return json(202, { runId: 'r9', status: 'queued' });
                },
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Run now' }));

        const input =
            screen.getByLabelText<HTMLTextAreaElement>(/Input \(JSON/);
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        await waitFor(() => expect(input.disabled).toBe(true));
        answer();
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('shows what the server refuses at the dialog top, one line each', async () => {
        const api = fakeApi(
            routes({
                'POST /api/v1/workflows/w1/runs': () =>
                    json(400, [
                        {
                            code: 'ProgramInvalid',
                            message: 'Block 2: no input.',
                        },
                        { code: 'ProgramInvalid', message: 'Block 5: no url.' },
                    ]),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Run now' }));
        const input = screen.getByLabelText(/Input \(JSON/);
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));

        const summary = await screen.findByRole('alert');
        expect(
            [...summary.querySelectorAll('li')].map((li) => li.textContent)
        ).toEqual(['Block 2: no input.', 'Block 5: no url.']);
        expect(document.activeElement).toBe(summary);
        // Not the input's fault: the field stays as it was.
        expect(input.getAttribute('aria-invalid')).toBe('false');
        expect(api.calls('POST /api/v1/workflows/w1/runs')).toHaveLength(1);
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('lists its runs and opens one to its result', async () => {
        fakeApi(
            routes({
                'GET /api/v1/blocks/runs/r1': () =>
                    json(200, {
                        run: run(),
                        result: { errors: [{ block: 2, message: 'boom' }] },
                    }),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" tab="runs" />);

        const row = await screen.findByRole('button', { name: /failed/ });
        expect(row.textContent).toContain('Webhook');
        expect(row.textContent).toContain('1.2 sec');
        fireEvent.click(row);
        expect(await screen.findByText(/"boom"/)).toBeTruthy();
    });

    it('restores an old version after asking', async () => {
        const api = fakeApi(
            routes({
                'POST /api/v1/workflows/w1/versions/2/restore': () =>
                    json(200, workflow({ version: 4 })),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="versions" />
        ));

        fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(dialog.querySelector('.btn-danger') as HTMLElement);

        await waitFor(() =>
            expect(
                api.calls('POST /api/v1/workflows/w1/versions/2/restore')
            ).toHaveLength(1)
        );
        expect(
            await api
                .calls('POST /api/v1/workflows/w1/versions/2/restore')[0]
                .json()
        ).toEqual({ currentVersion: 3 });
        // The restored workflow shows at once; its versions are asked again.
        expect(await screen.findByText('v4')).toBeTruthy();
        await waitFor(() =>
            expect(api.calls('GET /api/v1/workflows/w1/versions')).toHaveLength(
                2
            )
        );
    });

    it('shows a refused restore in the dialog, which stays open', async () => {
        fakeApi(
            routes({
                'POST /api/v1/workflows/w1/versions/2/restore': () =>
                    json(409, {
                        code: 'TestChanged',
                        message: 'The workflow changed meanwhile.',
                    }),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="versions" />
        ));

        fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(dialog.querySelector('.btn-danger') as HTMLElement);

        const alert = await within(dialog).findByRole('alert');
        expect(alert.textContent).toBe('The workflow changed meanwhile.');
        expect(document.activeElement).toBe(alert);
        expect(dialog.closest('dialog')?.hasAttribute('open')).toBe(true);
    });

    it('shows a refused delete in its dialog, which stays open', async () => {
        const api = fakeApi(
            routes({
                'DELETE /api/v1/workflows/w1': () =>
                    json(409, {
                        code: 'TestInUse',
                        message: 'Another workflow calls it.',
                    }),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);

        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(dialog.querySelector('.btn-danger') as HTMLElement);

        const alert = await within(dialog).findByRole('alert');
        expect(alert.textContent).toBe('Another workflow calls it.');
        expect(document.activeElement).toBe(alert);
        expect(dialog.closest('dialog')?.hasAttribute('open')).toBe(true);
        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(api.calls('DELETE /api/v1/workflows/w1')).toHaveLength(1);
        await expectNoA11yViolations();
    });

    it('gives the navigation one group: its parts, then back to its package', async () => {
        fakeApi(routes());
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);

        await waitFor(() =>
            expect(pageSection()?.sections.map((s) => s.label)).toEqual([
                'Guild report',
            ])
        );
        const items = pageSection()?.sections[0].items ?? [];
        expect(items.map((i) => i.href)).toEqual([
            '/packages/p1/workflows/w1',
            '/packages/p1/workflows/w1/webhooks',
            '/packages/p1/workflows/w1/schedules',
            '/packages/p1/workflows/w1/runs',
            '/packages/p1/workflows/w1/versions',
            '/packages/p1/workflows',
        ]);
        expect(items.every((i) => i.description)).toBe(true);
        expect(items.at(-1)?.label).toBe('Guild tools');
        // The overview is current only on itself.
        expect(items[0].end).toBe(true);
    });

    it('shows a failed read with a retry, and one it cannot find as gone', async () => {
        let answer = () =>
            json(500, { code: 'TestBroken', message: 'Try later.' });
        fakeApi(routes({ 'GET /api/v1/workflows/w1': () => answer() }));
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);

        expect((await screen.findByRole('alert')).textContent).toBe(
            'Try later.'
        );
        expect(screen.queryByText(/does not exist/)).toBeNull();

        answer = () => json(404, { code: 'NotFound', message: 'Not found.' });
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByText(/does not exist/)).toBeTruthy();
    });
});
