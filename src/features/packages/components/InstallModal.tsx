import { createSignal, For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import type {
    ConnectionSummary,
    PackageConnection,
    PackageContent,
    PackageInstall,
} from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import InlineList from '@shared/ui/InlineList';
import Button, { LinkButton } from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import LoadError from '@shared/ui/LoadError';
import Select from '@shared/ui/forms/Select';
import { createForm } from '@shared/ui/forms/form';
import Modal from '@shared/ui/Modal';
import { myConnectionsQuery } from '@features/packages/api/connections';
import { installPackageMutation } from '@features/packages/api/packages';
import { packagePath } from '@features/packages/package-nav';

const FORM_ID = 'package-install';
// As form.summary links an error about a connection: `${id}-${field}`.
const selectId = (name: string) => `${FORM_ID}-${name}`;

/** The caller's connections that can stand in for one the package uses. */
function candidates(
    needed: PackageConnection,
    mine: ConnectionSummary[]
): ConnectionSummary[] {
    return mine.filter(
        (c) => !needed.provider || c.provider === needed.provider
    );
}

/** The first choice: the caller's connection by the same name, if they have one. */
export function defaultChoice(
    needed: PackageConnection,
    mine: ConnectionSummary[]
): string {
    return candidates(needed, mine).some((c) => c.name === needed.name)
        ? needed.name
        : '';
}

/**
 * Installs a version: for each connection its workflows use, the caller
 * picks one of theirs (or leaves it for later); then the copies made.
 */
export default function InstallModal(props: {
    open: boolean;
    packageId: string;
    content: PackageContent;
    onClose: () => void;
}) {
    const t = useLocalizer('packages');
    const [done, setDone] = createSignal<PackageInstall | null>(null);
    const close = () => {
        setDone(null);
        props.onClose();
    };

    return (
        <Modal
            open={props.open}
            title={t('install.title', 'Install version {version}', {
                version: props.content.version,
            })}
            onClose={close}
        >
            <Show when={props.open}>
                <Show
                    when={done()}
                    fallback={
                        <InstallForm
                            packageId={props.packageId}
                            content={props.content}
                            onInstalled={setDone}
                        />
                    }
                >
                    {(install) => (
                        <Installed install={install()} onClose={close} />
                    )}
                </Show>
            </Show>
        </Modal>
    );
}

function InstallForm(props: {
    packageId: string;
    content: PackageContent;
    onInstalled: (install: PackageInstall) => void;
}) {
    const t = useLocalizer('packages');
    const connections = useQuery(() => myConnectionsQuery());
    const mine = () => connections.data ?? [];
    // The fields are the package's connections, known only now: one value
    // (the picks by name) instead of a binding each.
    const form = createForm({
        id: FORM_ID,
        initial: (): { picks: Record<string, string> } => ({ picks: {} }),
    });
    const installing = form.mutation(installPackageMutation);

    // Until the user picks, the same-named connection (or none).
    const choiceOf = (needed: PackageConnection) =>
        form.values.picks[needed.name] ?? defaultChoice(needed, mine());

    const install = form.onSubmit(() => {
        const connections: Record<string, string> = {};
        for (const needed of props.content.connections) {
            const choice = choiceOf(needed);
            if (choice) connections[needed.name] = choice;
        }
        return installing.run(
            {
                id: props.packageId,
                version: props.content.version,
                connections,
            },
            (installed) => props.onInstalled(installed)
        );
    });

    return (
        <form class="vert-form" onSubmit={install} noValidate>
            <ErrorSummary {...form.summary} />
            <Show when={connections.isError && connections.error}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={connections.isFetching}
                        onRetry={() => connections.refetch()}
                    />
                )}
            </Show>
            <p>
                {t(
                    'install.lead',
                    'Makes a package of yours with its {count} workflows, turned off. Webhooks get new secrets.',
                    { count: props.content.workflows.length }
                )}
            </p>
            <Show when={props.content.connections.length > 0}>
                <fieldset class="package-connections">
                    <legend class="field-label">
                        {t('install.connections', 'Connections they use')}
                    </legend>
                    <For each={props.content.connections}>
                        {(needed) => (
                            <Select
                                id={selectId(needed.name)}
                                showLabel
                                label={
                                    <InlineList
                                        items={[
                                            <strong>{needed.name}</strong>,
                                            needed.provider && (
                                                <span class="muted">
                                                    {needed.provider}
                                                </span>
                                            ),
                                        ]}
                                    />
                                }
                                disabled={form.busy() || connections.isPending}
                                value={choiceOf(needed)}
                                onChange={(value) =>
                                    form.set('picks', {
                                        ...form.values.picks,
                                        [needed.name]: value,
                                    })
                                }
                                options={[
                                    {
                                        value: '',
                                        label: t(
                                            'install.later',
                                            'None yet: set it up later'
                                        ),
                                    },
                                    ...candidates(needed, mine()).map((c) => ({
                                        value: c.name,
                                        label: `${c.name} (${c.provider})`,
                                    })),
                                ]}
                            />
                        )}
                    </For>
                </fieldset>
            </Show>
            <div class="actions-row actions-row--end">
                <Button type="submit" busy={form.busy()}>
                    {t('install.submit', 'Install')}
                </Button>
            </div>
        </form>
    );
}

function Installed(props: { install: PackageInstall; onClose: () => void }) {
    const t = useLocalizer('packages');
    return (
        <div class="vert-form" role="status">
            <p>
                {t(
                    'install.done',
                    'Installed as a package of yours. Its workflows, turned off:'
                )}
            </p>
            <ul class="package-list">
                <For each={props.install.workflows}>
                    {(w) => <li>{w.name}</li>}
                </For>
            </ul>
            <Show when={props.install.missingConnections.length > 0}>
                <p class="package-notice">
                    {t(
                        'install.missing',
                        'Before turning them on, add these connections (or pick others in the workflows): {names}.',
                        {
                            names: props.install.missingConnections
                                .map((c) => c.name)
                                .join(', '),
                        }
                    )}
                </p>
            </Show>
            <div class="actions-row actions-row--end">
                <Button variant="ghost" onClick={() => props.onClose()}>
                    {t('ui.done', 'Done')}
                </Button>
                <LinkButton href={packagePath(props.install.package.id)}>
                    {t('install.open_package', 'Open it')}
                </LinkButton>
            </div>
        </div>
    );
}
