// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import RemoveButton from '@shared/ui/RemoveButton';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { SkeletonScope } from '@shared/ui/Skeleton';
import { Cell, Row, Table } from './Table';

type Item = { name: string };

function renderTable(data: Item[], loading = false) {
    render(() => (
        <I18nProvider>
            <SkeletonScope when={loading}>
                <Table
                    data={data}
                    headers={['Name', 'Actions']}
                    placeholder={() => <>Nothing yet.</>}
                    render={(p) => (
                        <Row>
                            <Cell label="Name" text={p.item.name} />
                            <Cell label="Actions">
                                <RemoveButton
                                    label={`Delete ${p.item.name}`}
                                    onClick={() => undefined}
                                />
                            </Cell>
                        </Row>
                    )}
                />
            </SkeletonScope>
        </I18nProvider>
    ));
}

describe('Table', () => {
    it('has a header row and a row for each item', async () => {
        renderTable([{ name: 'daily' }, { name: 'weekly' }]);
        expect(screen.getAllByRole('columnheader')).toHaveLength(2);
        expect(screen.getAllByRole('row')).toHaveLength(3);
        expect(
            screen.getByRole('button', { name: 'Delete weekly' })
        ).toBeTruthy();
        await expectNoA11yViolations();
    });

    it('shows the placeholder when there are no items', async () => {
        renderTable([]);
        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.getByText('Nothing yet.')).toBeTruthy();
        await expectNoA11yViolations();
    });

    it('shows rows of bars in the same columns while it loads', async () => {
        renderTable([], true);
        expect(screen.queryByText('Nothing yet.')).toBeNull();
        expect(
            screen
                .getAllByRole('columnheader', { hidden: true })
                .map((th) => th.textContent)
        ).toEqual(['Name', 'Actions']);
        const rows = document.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(3);
        for (const row of rows)
            expect(
                [...row.querySelectorAll('td')].map((td) => td.dataset.label)
            ).toEqual(['Name', 'Actions']);
        expect(document.querySelectorAll('td .skeleton-text')).toHaveLength(6);
        await expectNoA11yViolations();
    });

    it('shows its rows of bars in place of the items it has', () => {
        renderTable([{ name: 'daily' }], true);
        expect(screen.queryByText('daily')).toBeNull();
        expect(document.querySelectorAll('tbody tr')).toHaveLength(3);
    });
});
