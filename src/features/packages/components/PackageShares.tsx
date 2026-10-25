import { createResource, createSignal, For, Show } from 'solid-js';
import { AiOutlineClose } from 'solid-icons/ai';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import {
    listShares,
    sharePackage,
    unsharePackage,
} from '@features/packages/api';

const inputId = (field: string) => `package-share-${field}`;

/** Whom a package is shared with, for its owner: they read and install it. */
export default function PackageShares(props: { packageId: string }) {
    const t = useLocalizer('packages');
    const [shares, { refetch }] = createResource(
        () => props.packageId,
        listShares
    );
    const [userName, setUserName] = createSignal('');
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    async function add(e: Event) {
        e.preventDefault();
        if (!userName().trim()) return;
        setBusy(true);
        try {
            const result = await sharePackage(
                props.packageId,
                userName().trim()
            );
            if (!result.ok) {
                setErrors(groupErrors(result.errors, ['userName']));
                return;
            }
            setErrors({});
            setUserName('');
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    async function remove(userId: string) {
        setBusy(true);
        try {
            await unsharePackage(props.packageId, userId);
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    return (
        <section class="package-side-section">
            <h2>{t('share.title', 'Shared with')}</h2>
            <Show
                when={(shares() ?? []).length > 0}
                fallback={
                    <p class="muted">
                        {t(
                            'share.none',
                            'Nobody yet. Shares matter while it is private.'
                        )}
                    </p>
                }
            >
                <ul class="package-share-list">
                    <For each={shares()}>
                        {(share) => (
                            <li>
                                <span>
                                    {share.user.name}{' '}
                                    <span class="muted">
                                        @{share.user.userName}
                                    </span>
                                </span>
                                <Button
                                    variant="icon"
                                    disabled={busy()}
                                    aria-label={t(
                                        'share.remove',
                                        'Stop sharing with {name}'
                                    ).replace('{name}', share.user.name)}
                                    onClick={() => void remove(share.user.id)}
                                >
                                    <AiOutlineClose />
                                </Button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
            <form
                class="package-share-form"
                onSubmit={(e) => void add(e)}
                noValidate
            >
                <ErrorSummary errors={errors()} inputId={inputId} />
                <Field
                    id={inputId('userName')}
                    name="userName"
                    label={t('share.username', 'Username')}
                    type="text"
                    autocomplete="off"
                    errors={errors().userName}
                    disabled={busy()}
                    value={userName()}
                    onInput={(e) => setUserName(e.currentTarget.value)}
                />
                <Button type="submit" variant="ghost" busy={busy()}>
                    {t('share.add', 'Share')}
                </Button>
            </form>
        </section>
    );
}
