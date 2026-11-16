import { Index, Match, Switch } from 'solid-js';
import Card from '@shared/ui/Card';
import PageHeader from '@shared/ui/PageHeader';
import SettingsCard from '@shared/ui/SettingsCard';
import { SkeletonScope, SkeletonText } from '@shared/ui/Skeleton';
import { Table } from '@shared/ui/Table';
import './page-skeleton.scss';

/**
 * What a page shows, roughly, for its shape while its code loads:
 * - header: only the page's header (the default);
 * - table: a header and a table (sessions, files);
 * - cards: a header and a grid of cards (explore, notes);
 * - list: a header and cards one under another (packages);
 * - settings: a header and settings cards (profile);
 * - detail: a header and one large card (one package, one workflow);
 * - document: a header and paragraphs of text (terms, docs).
 */
export type PageSkeletonForm =
    'header' | 'table' | 'cards' | 'list' | 'settings' | 'detail' | 'document';

const times = (n: number) => Array.from({ length: n });
// Column headers of a table whose page is not there yet: no words, the row
// keeps its height.
const COLUMNS = ['\u00a0', '\u00a0', '\u00a0'];

/**
 * The rough shape of a page, made of the shared components in their
 * loading form: what `lazyPage` shows while a page's code loads (its
 * `skeleton` option). The layout's live region says "Loading…" then: this
 * one does not, and its part is hidden from screen readers.
 */
export default function PageSkeleton(props: { form: PageSkeletonForm }) {
    return (
        <SkeletonScope when announce={false}>
            <div class="page-stack page-skeleton">
                <PageHeader title="" />
                <Switch>
                    <Match when={props.form === 'table'}>
                        <Table
                            data={[]}
                            headers={COLUMNS}
                            skeletonRows={4}
                            placeholder={() => null}
                            render={() => null}
                        />
                    </Match>
                    <Match when={props.form === 'cards'}>
                        <div class="page-skeleton-cards">
                            <Index each={times(6)}>{() => <Card />}</Index>
                        </div>
                    </Match>
                    <Match when={props.form === 'list'}>
                        <Index each={times(4)}>
                            {() => <Card skeletonLines={2} />}
                        </Index>
                    </Match>
                    <Match when={props.form === 'settings'}>
                        <Index each={times(2)}>
                            {() => <SettingsCard title="" actions={<span />} />}
                        </Index>
                    </Match>
                    <Match when={props.form === 'detail'}>
                        <Card skeletonLines={6} />
                    </Match>
                    <Match when={props.form === 'document'}>
                        <div class="page-skeleton-document">
                            <Index each={times(3)}>
                                {() => <SkeletonText lines={4} />}
                            </Index>
                        </div>
                    </Match>
                </Switch>
            </div>
        </SkeletonScope>
    );
}
