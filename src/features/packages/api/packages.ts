import {
    infiniteQueryOptions,
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, dataOr, request, send, type ApiResult } from '@shared/api/client';
import type {
    ConnectionSummary,
    PackageContent,
    PackageInput,
    PackageInstall,
    PackagePublish,
    PackageShare,
    PackageTag,
    PackageVersion,
    WorkflowPackage,
} from '@shared/api/types';
import { cursorPages } from '@shared/lib/paged-list';

// Packages: the caller's own (their workflows live in them), and the
// published ones everyone reads in Explore.

export const packageKeys = {
    all: ['packages'] as const,
    explore: (q: string, tag: string) =>
        [...packageKeys.all, 'explore', { q, tag }] as const,
    detail: (id: string) => [...packageKeys.all, 'detail', id] as const,
    shares: (id: string) => [...packageKeys.detail(id), 'shares'] as const,
};

/** Whom a package is shared with, for its owner. */
export const packageSharesQuery = (id: string) =>
    queryOptions({
        queryKey: packageKeys.shares(id),
        queryFn: ({ signal }) =>
            request<PackageShare[]>(
                api.GET('/api/v1/workflow-packages/{id}/shares', {
                    params: { path: { id } },
                    signal,
                })
            ),
    });

/** The package `id` shared with one more person, by username. */
export const sharePackageMutation = (queryClient: QueryClient, id: string) =>
    mutationOptions({
        mutationKey: [...packageKeys.all, 'share'] as const,
        mutationFn: (userName: string) =>
            request<PackageShare>(
                api.PUT('/api/v1/workflow-packages/{id}/shares', {
                    params: { path: { id } },
                    body: { userName },
                })
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: packageKeys.shares(id),
            }),
    });

/** The owner removes someone (by user id) from the package `id`. */
export const unsharePackageMutation = (queryClient: QueryClient, id: string) =>
    mutationOptions({
        mutationKey: [...packageKeys.all, 'unshare'] as const,
        mutationFn: (userId: string) =>
            request(
                api.DELETE('/api/v1/workflow-packages/{id}/shares/{userId}', {
                    params: { path: { id, userId } },
                })
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: packageKeys.shares(id),
            }),
    });

/**
 * Public packages, most installed first, a page at a time; `q` searches
 * name and summary, `tag` filters. Empty and absent are one search (one
 * cache entry).
 */
export const explorePackagesInfiniteQuery = (q = '', tag = '') =>
    infiniteQueryOptions({
        queryKey: packageKeys.explore(q, tag),
        queryFn: async ({ pageParam, signal }) => {
            const page = await request(
                api.GET('/api/v1/workflow-packages/explore', {
                    params: {
                        query: {
                            q: q || undefined,
                            tag: tag || undefined,
                            cursor: pageParam,
                            limit: 30,
                        },
                    },
                    signal,
                })
            );
            return { items: page.data, next: page.nextCursor ?? null };
        },
        ...cursorPages,
    });

/** The tags of public packages, most used first, those starting with `q`. */
export async function exploreTags(q: string): Promise<PackageTag[]> {
    const result = await send(
        api.GET('/api/v1/workflow-packages/explore/tags', {
            params: { query: { q: q || undefined, limit: 8 } },
        })
    );
    return dataOr(result, []);
}

/** The caller's packages, then those shared with them. */
export async function myPackages(): Promise<WorkflowPackage[]> {
    const result = await send(api.GET('/api/v1/workflow-packages'));
    return dataOr(result, []);
}

export function getPackage(id: string): Promise<ApiResult<WorkflowPackage>> {
    return send(
        api.GET('/api/v1/workflow-packages/{id}', { params: { path: { id } } })
    );
}

/** A new, empty package: workflows are made in it, versions published from it. */
export function createPackage(
    body: PackageInput
): Promise<ApiResult<WorkflowPackage>> {
    return send(api.POST('/api/v1/workflow-packages', { body }));
}

/** Saves all of it (send its errorWorkflow back, or it is cleared). */
function updatePackage(
    id: string,
    body: PackageInput
): Promise<ApiResult<WorkflowPackage>> {
    return send(
        api.PUT('/api/v1/workflow-packages/{id}', {
            params: { path: { id } },
            body,
        })
    );
}

/** The package as it is, as the body of an update. */
const inputOf = (pkg: WorkflowPackage): PackageInput => ({
    name: pkg.name,
    summary: pkg.summary,
    readme: pkg.readme,
    visibility: pkg.visibility,
    tags: pkg.tags,
    errorWorkflow: pkg.errorWorkflow ?? null,
    expectedStamp: pkg.stamp,
});

/**
 * Saves one part of it (its tags, who sees it), the rest as it was opened:
 * someone else's save meanwhile is a conflict (expectedStamp).
 */
export function savePackage(
    pkg: WorkflowPackage,
    patch: Partial<PackageInput>
): Promise<ApiResult<WorkflowPackage>> {
    return updatePackage(pkg.id, { ...inputOf(pkg), ...patch });
}

/** Deletes it with its workflows; packages others installed from it stay. */
export function deletePackage(id: string): Promise<ApiResult<unknown>> {
    return send(
        api.DELETE('/api/v1/workflow-packages/{id}', {
            params: { path: { id } },
        })
    );
}

export async function listPackageVersions(
    id: string
): Promise<PackageVersion[]> {
    const result = await send(
        api.GET('/api/v1/workflow-packages/{id}/versions', {
            params: { path: { id } },
        })
    );
    return dataOr(result, []);
}

/** A version with its workflows; the latest without `version`. */
export function getContent(
    id: string,
    version?: number
): Promise<ApiResult<PackageContent>> {
    return send(
        api.GET('/api/v1/workflow-packages/{id}/content', {
            params: { path: { id }, query: { version } },
        })
    );
}

export function publishVersion(
    id: string,
    body: PackagePublish
): Promise<ApiResult<PackageVersion>> {
    return send(
        api.POST('/api/v1/workflow-packages/{id}/versions', {
            params: { path: { id } },
            body,
        })
    );
}

/** A new package of the caller's from a version, connections mapped by name. */
export function installPackage(
    id: string,
    version: number | undefined,
    connections: Record<string, string>
): Promise<ApiResult<PackageInstall>> {
    return send(
        api.POST('/api/v1/workflow-packages/{id}/install', {
            params: { path: { id } },
            body: { version, connections },
        })
    );
}

/** The caller leaves a package shared with them. */
export function unsharePackage(
    id: string,
    userId: string
): Promise<ApiResult<unknown>> {
    return send(
        api.DELETE('/api/v1/workflow-packages/{id}/shares/{userId}', {
            params: { path: { id, userId } },
        })
    );
}

/** The caller's connections, to map a package's onto. */
export async function myConnections(): Promise<ConnectionSummary[]> {
    const result = await send(api.GET('/api/v1/connections'));
    return dataOr(result, []);
}
