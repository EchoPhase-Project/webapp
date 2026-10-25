import { createResource, createSignal, For, Show } from 'solid-js';
import type {
    ConnectionSummary,
    PackageConnection,
    PackageContent,
    PackageInstall,
} from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Modal from '@shared/ui/Modal';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import { installPackage, myConnections } from '@features/packages/api';

const inputId = (field: string) => `package-install-${field}`;

/** The caller's connections that can stand in for one the package uses. */
export function candidates(
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
            title={t('install.title', 'Install version {version}').replace(
                '{version}',
                String(props.content.version)
            )}
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
    const [mine] = createResource(myConnections);
    const [chosen, setChosen] = createSignal<Record<string, string>>({});
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    // Until the user picks, the same-named connection (or none).
    const choiceOf = (needed: PackageConnection) =>
        chosen()[needed.name] ?? defaultChoice(needed, mine() ?? []);

    async function install(e: Event) {
        e.preventDefault();
        if (busy()) return;
        setBusy(true);
        try {
            const connections: Record<string, string> = {};
            for (const needed of props.content.connections) {
                const choice = choiceOf(needed);
                if (choice) connections[needed.name] = choice;
            }
            const result = await installPackage(
                props.packageId,
                props.content.version,
                connections
            );
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return;
            }
            props.onInstalled(result.data);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form class="vert-form" onSubmit={(e) => void install(e)} noValidate>
            <ErrorSummary errors={errors()} inputId={inputId} />
            <p>
                {t(
                    'install.lead',
                    'Copies {count} workflows into yours, turned off, linked to each other. Webhooks get new secrets.'
                ).replace('{count}', String(props.content.workflows.length))}
            </p>
            <Show when={props.content.connections.length > 0}>
                <fieldset class="package-connections">
                    <legend class="field-label">
                        {t('install.connections', 'Connections they use')}
                    </legend>
                    <For each={props.content.connections}>
                        {(needed) => (
                            <div class="package-connection">
                                <label for={inputId(needed.name)}>
                                    <strong>{needed.name}</strong>
                                    <Show when={needed.provider}>
                                        {(provider) => (
                                            <span class="muted">
                                                {' '}
                                                · {provider()}
                                            </span>
                                        )}
                                    </Show>
                                </label>
                                <select
                                    id={inputId(needed.name)}
                                    class="package-select"
                                    disabled={busy() || mine.loading}
                                    value={choiceOf(needed)}
                                    onChange={(e) =>
                                        setChosen((c) => ({
                                            ...c,
                                            [needed.name]:
                                                e.currentTarget.value,
                                        }))
                                    }
                                >
                                    <option value="">
                                        {t(
                                            'install.later',
                                            'None yet: set it up later'
                                        )}
                                    </option>
                                    <For
                                        each={candidates(needed, mine() ?? [])}
                                    >
                                        {(c) => (
                                            <option value={c.name}>
                                                {c.name} ({c.provider})
                                            </option>
                                        )}
                                    </For>
                                </select>
                            </div>
                        )}
                    </For>
                </fieldset>
            </Show>
            <div class="package-actions">
                <Button type="submit" busy={busy()}>
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
                    'Installed. Your new workflows, turned off:'
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
                        'Before turning them on, add these connections (or pick others in the workflows): {names}.'
                    ).replace(
                        '{names}',
                        props.install.missingConnections
                            .map((c) => c.name)
                            .join(', ')
                    )}
                </p>
            </Show>
            <div class="package-actions">
                <Button onClick={() => props.onClose()}>
                    {t('install.close', 'Done')}
                </Button>
            </div>
        </div>
    );
}
