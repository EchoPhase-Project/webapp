import { createResource, createSignal, For, Show, type JSX } from 'solid-js';
import type { ApiResult } from '@shared/api/client';
import { createSubmit } from '@shared/api/submit';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from './Button';
import ErrorSummary from './ErrorSummary';
import Field from './Field';
import RemoveButton from './RemoveButton';
import SettingsCard from './SettingsCard';
import './share-list.scss';

/** A person something is shared with, as the API describes them. */
export type Sharee = { id: string; name: string; userName?: string | null };

type ShareListProps<T extends { user: Sharee }> = {
    /** The id of what is shared; the functions get it. */
    of: string;
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
    list: (of: string) => Promise<T[]>;
    share: (of: string, userName: string) => Promise<ApiResult<unknown>>;
    unshare: (of: string, userId: string) => Promise<unknown>;
    /** After a person's name, such as what they may do ("can edit"). */
    detail?: (share: T) => JSX.Element;
    /** Under the username: more of the share (a "May edit" switch). */
    options?: JSX.Element;
};

/**
 * Whom something is shared with, for its owner: each person with a button
 * that stops it, and a username to share it with one more.
 */
export default function ShareList<T extends { user: Sharee }>(
    props: ShareListProps<T>
) {
    const i18n = useI18n();
    const [shares, { refetch }] = createResource(
        () => props.of,
        (of) => props.list(of)
    );
    const [userName, setUserName] = createSignal('');
    const { busy, errors, pending, run } = createSubmit(['userName']);
    const inputId = (field: string) => `${props.id}-${field}`;

    async function add(e: Event) {
        e.preventDefault();
        const name = userName().trim();
        if (!name) return;
        await run(
            () => props.share(props.of, name),
            async () => {
                setUserName('');
                await refetch();
            }
        );
    }

    async function remove(userId: string) {
        await pending(async () => {
            await props.unshare(props.of, userId);
            await refetch();
        });
    }

    const people = () => (
        <Show
            when={(shares() ?? []).length > 0}
            fallback={<p class="muted">{props.empty}</p>}
        >
            <ul class="share-list-items">
                <For each={shares()}>
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
                                disabled={busy()}
                                onClick={() => void remove(share.user.id)}
                            />
                        </li>
                    )}
                </For>
            </ul>
        </Show>
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
                {people()}
                {fields()}
            </SettingsCard>
        </Show>
    );
}
