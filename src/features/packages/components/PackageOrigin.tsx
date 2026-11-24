import { Show } from 'solid-js';
import { A } from '@solidjs/router';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';

/**
 * Where one of the user's packages comes from and goes: "installed, vX"
 * (to the package it came from) and "published, vX" (to its Explore page).
 */
export default function PackageOrigin(props: {
    pkg: Pick<WorkflowPackage, 'id' | 'latestVersion' | 'source'>;
}) {
    const t = useLocalizer('workflows');
    return (
        <Show when={props.pkg.source || props.pkg.latestVersion > 0}>
            <span class="package-origin">
                <Show when={props.pkg.source}>
                    {(source) => (
                        <A
                            class="badge"
                            href={`/explore/${source().packageId}`}
                        >
                            {t('packages.installed', 'installed, v{version}', {
                                version: source().version ?? '',
                            })}
                        </A>
                    )}
                </Show>
                <Show when={props.pkg.latestVersion > 0}>
                    <A class="badge" href={`/explore/${props.pkg.id}`}>
                        {t('packages.published', 'published, v{version}', {
                            version: props.pkg.latestVersion,
                        })}
                    </A>
                </Show>
            </span>
        </Show>
    );
}
