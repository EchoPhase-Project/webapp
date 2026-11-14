import { createSignal, For, Match, Show, Switch, type JSX } from 'solid-js';
import {
    useQuery,
    type MutationOptions,
    type QueryClient,
    type QueryKey,
    type QueryOptions,
} from '@tanstack/solid-query';
import { createSubmit } from '@shared/api/submit';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from './Button';
import ErrorSummary from './ErrorSummary';
import Field from './Field';
import LoadError from './LoadError';
import RemoveButton from './RemoveButton';
import SettingsCard from './SettingsCard';
import './share-list.scss';

/** A person something is shared with, as the API describes them. */
export type Sharee = { id: string; name: string; userName?: string | null };

/**
 * A share's mutation description (from the feature's api.ts) for one item:
 * `share` takes a username, `unshare` a user id. Its onSuccess refreshes
 * the list (`query`'s key).
 */
type ShareMutation<TData> = (
    queryClient: QueryClient
) => MutationOptions<TData, Error, string>;

type ShareListProps<
    T extends { user: Sharee },
    TKey extends QueryKey,
    TShared,
    TUnshared,
> = {
    /** The base of the username field's id. */
    id: string;
    title: string;
    description?: string;
    /** In a SettingsCard (a settings page); otherwise a section. */
    card?: boolean;
    /** A class for the section (not the card): its place in the page. */
    class?: string;
    /** What shows while it is shared with nobody. */
    empty: string;
    /** The remove button's name, for a person ("Stop sharing with Ann"). */
    removeLabel: (name: string) => string;
    /** The shares of what is shared (a `…SharesQuery(id)`). */
    query: QueryOptions<T[], Error, T[], TKey>;
    /** Shares it with one more person, by username. */
    share: ShareMutation<TShared>;
    /** Stops sharing it with a person, by user id. */
    unshare: ShareMutation<TUnshared>;
    /** After a person's name, such as what they may do ("can edit"). */
    detail?: (share: T) => JSX.Element;
    /** Under the username: more of the share (a "May edit" switch). */
    options?: JSX.Element;
};

/**
 * Whom something is shared with, for its owner: each person with a button
 * that stops it, and a username to share it with one more.
 */
export default function ShareList<
    T extends { user: Sharee },
    TKey extends QueryKey,
    TShared,
    TUnshared,
>(props: ShareListProps<T, TKey, TShared, TUnshared>) {
    const i18n = useI18n();
    const shares = useQuery(() => props.query);
    const [userName, setUserName] = createSignal('');
    const { busy, errors, mutation } = createSubmit(['userName']);
    // The descriptions are read in useMutation's tracked options: a change
    // (such as the note's "May edit") reaches the next call.
    // eslint-disable-next-line solid/reactivity
    const sharing = mutation((queryClient) => props.share(queryClient));
    // A failed removal shows above the people, apart from the form's errors.
    const removing = createSubmit();
    const unsharing = removing.mutation(
        // eslint-disable-next-line solid/reactivity
        (queryClient) => props.unshare(queryClient)
    );
    const inputId = (field: string) => `${props.id}-${field}`;

    async function add(e: Event) {
        e.preventDefault();
        const name = userName().trim();
        if (!name) return;
        await sharing.run(name, () => setUserName(''));
    }

    async function remove(userId: string) {
        await unsharing.run(userId);
    }

    const list = () => (
        <Show
            when={(shares.data ?? []).length > 0}
            fallback={<p class="muted">{props.empty}</p>}
        >
            <ul class="share-list-items">
                <For each={shares.data}>
                    {(share) => (
                        <li>
                            <span>
                                {share.user.name}{' '}
                                <span class="muted">
                                    @{share.user.userName}
                                </span>
                            </span>
                            {props.detail?.(share)}
                            <RemoveButton
                                label={props.removeLabel(share.user.name)}
                                disabled={busy() || removing.busy()}
                                onClick={() => void remove(share.user.id)}
                            />
                        </li>
                    )}
                </For>
            </ul>
        </Show>
    );

    // Nothing while the list loads; its error, with a way to ask again.
    const people = () => (
        <Switch>
            <Match when={shares.isError && shares.error}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={shares.isFetching}
                        onRetry={() => shares.refetch()}
                    />
                )}
            </Match>
            <Match when={shares.isSuccess}>{list()}</Match>
        </Switch>
    );

    const fields = () => (
        <>
            <ErrorSummary errors={errors()} inputId={inputId} />
            <div class="share-list-input">
                <Field
                    id={inputId('userName')}
                    name="userName"
                    label={i18n.t('ui.username', 'Username')}
                    type="text"
                    autocomplete="off"
                    errors={errors().userName}
                    disabled={busy()}
                    value={userName()}
                    onInput={(e) => setUserName(e.currentTarget.value)}
                />
            </div>
            {props.options}
        </>
    );

    const submit = () => (
        <Button
            type="submit"
            variant="ghost"
            busy={busy()}
            disabled={!userName().trim()}
        >
            {i18n.t('ui.share', 'Share')}
        </Button>
    );

    return (
        <Show
            when={props.card}
            fallback={
                <section
                    class={['share-list', props.class]
                        .filter(Boolean)
                        .join(' ')}
                >
                    <h3>{props.title}</h3>
                    <Show when={props.description}>
                        <p class="muted">{props.description}</p>
                    </Show>
                    <ErrorSummary errors={removing.errors()} />
                    {people()}
                    <form
                        class="share-list-form"
                        onSubmit={(e) => void add(e)}
                        noValidate
                    >
                        {fields()}
                        {submit()}
                    </form>
                </section>
            }
        >
            <SettingsCard
                title={props.title}
                description={props.description}
                onSubmit={(e) => void add(e)}
                actions={submit()}
            >
                <ErrorSummary errors={removing.errors()} />
                {people()}
                {fields()}
            </SettingsCard>
        </Show>
    );
}
