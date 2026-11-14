// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { workflow } from './fixtures';
import WorkflowRedirect from './WorkflowRedirect';

const PATTERN = '/workflows/:id?';

describe('WorkflowRedirect', () => {
    it('sends an old address to the workflow in its package', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflows/w1': () => json(200, workflow()),
        });
        const { history } = renderPage(
            () => <WorkflowRedirect />,
            '/workflows/w1',
            PATTERN
        );

        await waitFor(() =>
            expect(history.get()).toBe('/packages/p1/workflows/w1')
        );
    });

    it('sends a workflow it cannot find to the packages', async () => {
        fakeApi(signedIn);
        const { history } = renderPage(
            () => <WorkflowRedirect />,
            '/workflows/w9',
            PATTERN
        );

        await waitFor(() => expect(history.get()).toBe('/packages'));
    });
});
