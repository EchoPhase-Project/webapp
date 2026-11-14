import { Show } from 'solid-js';
import { usePageMeta } from '@shared/meta/page-meta';
import { useQueryClient } from '@tanstack/solid-query';
import { authKeys, useAuth } from '@shared/api/auth';
import type { ApiResult } from '@shared/api/client';
import { createSubmit } from '@shared/api/submit';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Avatar from '@shared/ui/Avatar';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import FilePicker from '@shared/ui/FilePicker';
import PageHeader from '@shared/ui/PageHeader';
import SettingsCard from '@shared/ui/SettingsCard';
import { removeAvatar, setAvatar } from './api';
import PasswordForm from './components/PasswordForm';
import ProfileForm from './components/ProfileForm';
import './profile.scss';

/** The kinds of picture the server takes as an avatar. */
const PICTURES = 'image/png,image/jpeg,image/webp';

/** The signed-in user's profile: picture, name, username, time zone and password. */
export default function ProfilePage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const t = useLocalizer('profile');

    usePageMeta(() => ({
        title: t('title', 'Profile'),
        description: t(
            'description',
            'Your picture, name, username, time zone and password.'
        ),
    }));

    const { busy, errors, run } = createSubmit();

    const changing = (call: () => Promise<ApiResult<unknown>>) =>
        run(call, () =>
            queryClient.invalidateQueries({ queryKey: authKeys.me() })
        );

    return (
        <div class="page-stack profile-container">
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
                        <SettingsCard
                            title={t('picture.title', 'Picture')}
                            description={t(
                                'picture.hint',
                                'PNG, JPEG or WebP, up to 5 MB. Others see it next to your name.'
                            )}
                        >
                            <div class="profile-picture">
                                <Avatar
                                    name={me().name}
                                    seed={me().id}
                                    fileId={me().avatarFileId}
                                    size={96}
                                    initial
                                />
                                <div class="profile-picture-text">
                                    <ErrorSummary errors={errors()} />
                                    <div class="actions-row">
                                        <FilePicker
                                            accept={PICTURES}
                                            busy={busy()}
                                            onPick={(file) =>
                                                void changing(() =>
                                                    setAvatar(file)
                                                )
                                            }
                                        >
                                            {me().avatarFileId
                                                ? t('picture.change', 'Change')
                                                : t('ui.upload', 'Upload')}
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
                            </div>
                        </SettingsCard>

                        <SettingsCard title={t('details.title', 'Details')}>
                            <ProfileForm user={me()} />
                        </SettingsCard>

                        <SettingsCard title={t('password.title', 'Password')}>
                            <PasswordForm />
                        </SettingsCard>
                    </>
                )}
            </Show>
        </div>
    );
}
