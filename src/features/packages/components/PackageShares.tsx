import { createResource, createSignal, For, Show } from 'solid-js';
import { IconX } from '@shared/ui/icons';
import { createSubmit } from '@shared/api/submit';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import {
    listShares,
    sharePackage,
    unsharePackage,
} from '@features/packages/api';
import SettingsCard from './SettingsCard';

const inputId = (field: string) => `package-share-${field}`;

/** Whom a package is shared with, for its owner: they read and install it. */
export default function PackageShares(props: { packageId: string }) {
    const t = useLocalizer('packages');
    const [shares, { refetch }] = createResource(
        () => props.packageId,
        listShares
    );
    const [userName, setUserName] = createSignal('');
    const { busy, errors, pending, run } = createSubmit(['userName']);

    async function add(e: Event) {
        e.preventDefault();
        if (!userName().trim()) return;
        await run(
            () => sharePackage(props.packageId, userName().trim()),
            async () => {
                setUserName('');
                await refetch();
            }
        );
    }

    async function remove(userId: string) {
        await pending(async () => {
            await unsharePackage(props.packageId, userId);
            await refetch();
        });
    }

    return (
        <SettingsCard
            title={t('share.title', 'Shared with')}
            description={t(
                'share.description',
                'They read it and install it, while it is private.'
            )}
            onSubmit={(e) => void add(e)}
            actions={
                <Button
                    type="submit"
                    variant="ghost"
                    busy={busy()}
                    disabled={!userName().trim()}
                >
                    {t('ui.share', 'Share')}
                </Button>
            }
        >
            <Show
                when={(shares() ?? []).length > 0}
                fallback={<p class="muted">{t('share.none', 'Nobody yet.')}</p>}
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
                                    variant="icon-danger"
                                    disabled={busy()}
                                    aria-label={t(
                                        'share.remove',
                                        'Stop sharing with {name}',
                                        { name: share.user.name }
                                    )}
                                    onClick={() => void remove(share.user.id)}
                                >
                                    <IconX />
                                </Button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
            <ErrorSummary errors={errors()} inputId={inputId} />
            <div class="package-share-input">
                <Field
                    id={inputId('userName')}
                    name="userName"
                    label={t('ui.username', 'Username')}
                    type="text"
                    autocomplete="off"
                    errors={errors().userName}
                    disabled={busy()}
                    value={userName()}
                    onInput={(e) => setUserName(e.currentTarget.value)}
                />
            </div>
        </SettingsCard>
    );
}
