import { For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import {
    AiOutlineDownload,
    AiOutlineLock,
    AiOutlineTeam,
} from 'solid-icons/ai';
import type { WorkflowPackage } from '@shared/api/types';
import { plainText } from '@shared/lib/markdown';
import { useLocalizer } from '@shared/i18n/i18n-context';

/** How much of the README a card shows when the package has no summary. */
const EXCERPT = 420;

/**
 * A package in the grid. Cards grow with their text (the summary, else the
 * start of the README), so the grid packs them like a board of pins.
 */
export default function PackageCard(props: {
    pkg: WorkflowPackage;
    /** Picks a tag to filter by instead of following the card. */
    onTag?: (tag: string) => void;
}) {
    const t = useLocalizer('packages');

    const text = () => {
        if (props.pkg.summary) return props.pkg.summary;
        // A README opens with its title, which the card shows already.
        const readme = plainText(
            props.pkg.readme.replace(/^\s*#{1,6}\s+[^\n]*\n?/, '')
        );
        return readme.length > EXCERPT
            ? `${readme.slice(0, EXCERPT - 1)}…`
            : readme;
    };

    return (
        <article class="package-card card">
            <A href={`/explore/${props.pkg.id}`} class="package-card-link">
                <span class="package-card-title">{props.pkg.name}</span>
            </A>
            <Show when={text()}>
                <p class="package-card-text">{text()}</p>
            </Show>
            <Show when={props.pkg.tags.length > 0}>
                <ul class="package-tags" aria-label={t('card.tags', 'Tags')}>
                    <For each={props.pkg.tags}>
                        {(tag) => (
                            <li>
                                <button
                                    type="button"
                                    class="package-tag"
                                    onClick={() => props.onTag?.(tag)}
                                >
                                    #{tag}
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
            <span class="package-card-meta muted">
                <span>{props.pkg.owner.name}</span>
                <span>
                    <AiOutlineDownload aria-hidden="true" />{' '}
                    {t('card.installs', '{count} installs').replace(
                        '{count}',
                        String(props.pkg.installs)
                    )}
                </span>
                <Show when={props.pkg.visibility === 'Private'}>
                    <span>
                        <AiOutlineLock aria-hidden="true" />{' '}
                        {t('visibility.Private', 'Private')}
                    </span>
                </Show>
                <Show when={props.pkg.access !== 'Owner'}>
                    <Show when={props.pkg.visibility !== 'Public'}>
                        <span>
                            <AiOutlineTeam aria-hidden="true" />{' '}
                            {t('card.shared', 'Shared with you')}
                        </span>
                    </Show>
                </Show>
                <span>v{props.pkg.latestVersion}</span>
            </span>
        </article>
    );
}
