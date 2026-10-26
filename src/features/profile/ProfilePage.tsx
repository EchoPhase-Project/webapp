import { createRenderEffect, createSignal, Show } from 'solid-js';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import type { ApiResult } from '@shared/api/client';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Avatar from '@shared/ui/Avatar';
import Button from '@shared/ui/Button';
import Card from '@shared/ui/Card';
import ErrorSummary from '@shared/ui/ErrorSummary';
import FilePicker from '@shared/ui/FilePicker';
import PageHeader from '@shared/ui/PageHeader';
import { removeAvatar, setAvatar } from './api';
import PasswordForm from './components/PasswordForm';
import ProfileForm from './components/ProfileForm';
import './profile.scss';

/** The kinds of picture the server takes as an avatar. */
const PICTURES = 'image/png,image/jpeg,image/webp';

/** The signed-in user's profile: picture, name, username, time zone and password. */
export default function ProfilePage() {
    const { setTitle, setDescription } = useRootMeta();
    const { user, refetchUser } = useAuth();
    const t = useLocalizer('profile');

    createRenderEffect(() => {
        setTitle(`${t('title', 'Profile')} · EchoPhase`);
        setDescription(
            t(
                'description',
                'Your picture, name, username, time zone and password.'
            )
        );
    });

    const [busy, setBusy] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});

    async function changing(call: () => Promise<ApiResult<unknown>>) {
        setBusy(true);
        try {
            const result = await call();
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return;
            }
            setErrors({});
            await refetchUser();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div class="profile-container">
            <PageHeader
                eyebrow={t('nav.settings', 'Settings')}
                title={t('title', 'Profile')}
                description={t(
                    'description',
                    'Your picture, name, username, time zone and password.'
                )}
            />

            <Show when={user()}>
                {(me) => (
                    <>
                        <Card class="profile-picture">
                            <Avatar
                                name={me().name}
                                seed={me().id}
                                fileId={me().avatarFileId}
                                size={96}
                                initial
                            />
                            <div class="profile-picture-text">
                                <h2>{t('picture.title', 'Picture')}</h2>
                                <p class="muted">
                                    {t(
                                        'picture.hint',
                                        'PNG, JPEG or WebP, up to 5 MB. Others see it next to your name.'
                                    )}
                                </p>
                                <ErrorSummary
                                    errors={errors()}
                                    inputId={() => ''}
                                />
                                <div class="profile-picture-actions">
                                    <FilePicker
                                        accept={PICTURES}
                                        busy={busy()}
                                        onPick={(file) =>
                                            void changing(() => setAvatar(file))
                                        }
                                    >
                                        {me().avatarFileId
                                            ? t('picture.change', 'Change')
                                            : t('picture.upload', 'Upload')}
                                    </FilePicker>
                                    <Show when={me().avatarFileId}>
                                        <Button
                                            variant="ghost"
                                            disabled={busy()}
                                            onClick={() =>
                                                void changing(removeAvatar)
                                            }
                                        >
                                            {t('picture.remove', 'Remove')}
                                        </Button>
                                    </Show>
                                </div>
                            </div>
                        </Card>

                        <Card class="profile-details">
                            <h2>{t('details.title', 'Details')}</h2>
                            <ProfileForm user={me()} />
                        </Card>

                        <Card class="profile-details">
                            <h2>{t('password.title', 'Password')}</h2>
                            <PasswordForm />
                        </Card>
                    </>
                )}
            </Show>
        </div>
    );
}
