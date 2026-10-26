import { createResource } from 'solid-js';
import type { WorkflowPackage } from '@shared/api/types';
import type { NavSection } from '@shared/nav/nav-link';
import {
    AiOutlineApartment,
    AiOutlineHistory,
    AiOutlineSetting,
} from 'solid-icons/ai';
import { FiBox } from 'solid-icons/fi';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { usePageSection } from '@shared/nav/page-section';
import { getPackage } from './api';

/** A package's own pages: its workflows (and each workflow's page), its runs, its settings. */
export const packagePath = (id: string, section?: 'runs' | 'settings') =>
    `/packages/${encodeURIComponent(id)}/${section ?? 'workflows'}`;

/** The parts of a workflow's page, each its own address. */
export type WorkflowTab =
    'overview' | 'webhooks' | 'schedules' | 'runs' | 'versions';

/** A workflow's page: its overview, or one of its parts. */
export const workflowPath = (
    packageId: string,
    workflowId: string,
    tab: WorkflowTab = 'overview'
) =>
    `${packagePath(packageId)}/${encodeURIComponent(workflowId)}${tab === 'overview' ? '' : `/${tab}`}`;

/**
 * One of the user's packages, while one of its pages is shown; its owner
 * also gets a group in the navigation, after "Packages": the package's
 * own, or, given `instead` (an open workflow's), that one, which then
 * links back to the package as its last item. One group, so a workflow
 * named as its package does not read twice.
 */
export function usePackage(
    id: () => string,
    instead?: (pkg: WorkflowPackage) => NavSection | null
) {
    const t = useLocalizer('workflows');
    const [pkg, actions] = createResource(id, async (packageId) => {
        const result = await getPackage(packageId);
        return result.ok ? result.data : null;
    });

    usePageSection(() => {
        const p = pkg();
        if (!p || p.access !== 'Owner') return null;
        const own = instead?.(p);
        if (own)
            return {
                after: '/packages',
                sections: [
                    {
                        ...own,
                        items: [
                            ...(own.items ?? []),
                            {
                                icon: FiBox,
                                label: p.name,
                                description: t(
                                    'package.back_hint',
                                    'Its package: workflows, runs, settings'
                                ),
                                href: packagePath(p.id),
                                end: true,
                            },
                        ],
                    },
                ],
            };
        return {
            after: '/packages',
            sections: [
                {
                    icon: FiBox,
                    label: p.name,
                    items: [
                        {
                            icon: AiOutlineApartment,
                            label: t('package.workflows', 'Workflows'),
                            description: t(
                                'package.workflows_hint',
                                'What it does, on or off'
                            ),
                            href: packagePath(p.id),
                        },
                        {
                            icon: AiOutlineHistory,
                            label: t('package.runs', 'Runs'),
                            description: t(
                                'package.runs_hint',
                                'Of all its workflows'
                            ),
                            href: packagePath(p.id, 'runs'),
                        },
                        {
                            icon: AiOutlineSetting,
                            label: t('package.settings', 'Settings'),
                            description: t(
                                'package.settings_hint',
                                'Errors, publishing, sharing'
                            ),
                            href: packagePath(p.id, 'settings'),
                        },
                    ],
                },
            ],
        };
    });

    return [pkg, actions] as const;
}
