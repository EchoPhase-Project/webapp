import { createSignal } from 'solid-js';
import {
    mutationOptions,
    queryOptions,
    useQueryClient,
    type QueryClient,
} from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import ShareList, { type Sharee } from '@shared/ui/ShareList';
import Switch from '@shared/ui/Switch';
import { DevGrid, DevSample, DevSection } from './DevKit';

type Share = { user: Sharee; canEdit: boolean };

/** Known users: a username that is not here is "not found". */
const users: Sharee[] = [
    { id: 'u1', name: 'Ann Lee', userName: 'ann' },
    { id: 'u2', name: 'Bob Stone', userName: 'bob' },
    { id: 'u3', name: 'Chen Wu', userName: 'chen' },
    { id: 'u4', name: 'Dana Moss', userName: 'dana' },
];

const sharesKey = ['dev', 'share-list', 'shares'] as const;

// A short wait, so that busy and loading show.
const later = <T,>(make: () => T) =>
    new Promise<T>((resolve, reject) =>
        setTimeout(() => {
            try {
                resolve(make());
            } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        }, 400)
    );

const fail = (status: number, message: string, field?: string) =>
    new ApiError([{ code: 'dev_example', message, field }], status);

const firstShares = (): Share[] => [
    { user: { id: 'u1', name: 'Ann Lee', userName: 'ann' }, canEdit: true },
];

/**
 * The fake server: the shares in memory, and what the next call does. Plain
 * data, not a signal; the page resets it each time it opens.
 */
const server = { broken: false, canEdit: false, shares: firstShares() };

// Fake descriptions, as a feature's api.ts gives them. No request goes out.
const sharesQuery = () =>
    queryOptions({
        queryKey: sharesKey,
        queryFn: () =>
            later(() => {
                if (server.broken)
                    throw fail(500, 'The list did not load (on purpose).');
                return [...server.shares];
            }),
    });

const refresh = (client: QueryClient) =>
    client.invalidateQueries({ queryKey: sharesKey });

const shareMutation = (client: QueryClient) =>
    mutationOptions({
        mutationKey: ['dev', 'share-list', 'share'] as const,
        mutationFn: (userName: string) =>
            later(() => {
                const user = users.find((u) => u.userName === userName);
                if (!user)
                    throw fail(
                        404,
                        `No user has the username “${userName}”.`,
                        'userName'
                    );
                if (server.shares.some((s) => s.user.id === user.id))
                    throw fail(
                        409,
                        'It is already shared with this person.',
                        'userName'
                    );
                server.shares = [
                    ...server.shares,
                    { user, canEdit: server.canEdit },
                ];
                return user;
            }),
        onSuccess: () => refresh(client),
    });

const unshareMutation = (client: QueryClient) =>
    mutationOptions({
        mutationKey: ['dev', 'share-list', 'unshare'] as const,
        mutationFn: (userId: string) =>
            later(() => {
                if (userId === 'u4')
                    throw fail(403, 'Dana cannot be removed (on purpose).');
                server.shares = server.shares.filter(
                    (s) => s.user.id !== userId
                );
                return userId;
            }),
        onSuccess: () => refresh(client),
    });

/** ShareList on the fake descriptions, as a card and as a section. */
export default function ShareListPage() {
    const queryClient = useQueryClient();
    Object.assign(server, {
        broken: false,
        canEdit: false,
        shares: firstShares(),
    });
    queryClient.removeQueries({ queryKey: sharesKey });
    const [broken, setBroken] = createSignal(false);
    const [canEdit, setCanEdit] = createSignal(false);

    const common = {
        empty: 'Shared with nobody.',
        removeLabel: (name: string) => `Stop sharing with ${name}`,
        detail: (s: Share) => (
            <span class="badge">{s.canEdit ? 'can edit' : 'can read'}</span>
        ),
    };

    return (
        <>
            <Switch
                label="The list fails"
                description="The next read of the list fails, and LoadError shows."
                checked={broken()}
                onChange={(on) => {
                    setBroken(on);
                    server.broken = on;
                    void refresh(queryClient);
                }}
            />
            <p class="muted">
                Users: ann, bob, chen, dana. Another username gives a field
                error; a username that is in the list gives another. Removing
                Dana fails.
            </p>

            <DevSection title="ShareList">
                <DevGrid wide>
                    <ShareList
                        id="dev-share-card"
                        card
                        title="As a card"
                        description="On a settings page, in a SettingsCard."
                        query={sharesQuery()}
                        share={shareMutation}
                        unshare={unshareMutation}
                        options={
                            <Switch
                                label="May edit"
                                checked={canEdit()}
                                onChange={(on) => {
                                    setCanEdit(on);
                                    server.canEdit = on;
                                }}
                            />
                        }
                        {...common}
                    />
                    <DevSample title="As a section">
                        <ShareList
                            id="dev-share-section"
                            title="Shared with"
                            description="In a dialog or a panel, under an h3."
                            query={sharesQuery()}
                            share={shareMutation}
                            unshare={unshareMutation}
                            {...common}
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>
        </>
    );
}
