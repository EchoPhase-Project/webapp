import {
    infiniteQueryOptions,
    keepPreviousData,
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, request, send, type ApiResult } from '@shared/api/client';
import type {
    PackageContent,
    PackageInput,
    PackageInstall,
    PackagePublish,
    PackageShare,
    PackageTag,
    PackageVersion,
    WorkflowPackage,
    WorkflowSummary,
} from '@shared/api/types';
import { cursorPages } from '@shared/lib/paged-list';

// Packages: the caller's own (their workflows live in them), and the
// published ones everyone reads in Explore. Reads are on Query; the
// changes still on ApiResult functions move to mutations in step 9.

export const packageKeys = {
    all: ['packages'] as const,
    mine: () => [...packageKeys.all, 'mine'] as const,
    /** All Explore searches: a change of who sees a package asks them again. */
    exploreLists: () => [...packageKeys.all, 'explore'] as const,
    explore: (q: string, tag: string) =>
        [...packageKeys.exploreLists(), { q, tag }] as const,
    exploreTags: (q: string) =>
        [...packageKeys.all, 'explore-tags', q] as const,
    detail: (id: string) => [...packageKeys.all, 'detail', id] as const,
    content: (id: string, version?: number) =>
        [...packageKeys.detail(id), 'content', version ?? 'latest'] as const,
    versions: (id: string) => [...packageKeys.detail(id), 'versions'] as const,
    shares: (id: string) => [...packageKeys.detail(id), 'shares'] as const,
    workflows: (id: string) =>
        [...packageKeys.detail(id), 'workflows'] as const,
};

/** One package, as the caller may see it. */
export const packageQuery = (id: string) =>
    queryOptions({
        queryKey: packageKeys.detail(id),
        queryFn: ({ signal }) =>
            request<WorkflowPackage>(
                api.GET('/api/v1/workflow-packages/{id}', {
                    params: { path: { id } },
                    signal,
                })
            ),
    });

/** The caller's packages, then those shared with them. */
export const myPackagesQuery = () =>
    queryOptions({
        queryKey: packageKeys.mine(),
        queryFn: ({ signal }) =>
            request<WorkflowPackage[]>(
                api.GET('/api/v1/workflow-packages', { signal })
            ),
    });

/**
 * A version with its workflows; the latest without `version`. A published
 * version never changes on the server (a new publish is a new number), so
 * one asked by number stays fresh; the latest changes with each publish.
 */
export const packageContentQuery = (id: string, version?: number) =>
    queryOptions({
        queryKey: packageKeys.content(id, version),
        queryFn: ({ signal }) =>
            request<PackageContent>(
                api.GET('/api/v1/workflow-packages/{id}/content', {
                    params: { path: { id }, query: { version } },
                    signal,
                })
            ),
        staleTime: version === undefined ? undefined : Infinity,
    });

/** Its published versions, newest first. */
export const packageVersionsQuery = (id: string) =>
    queryOptions({
        queryKey: packageKeys.versions(id),
        queryFn: ({ signal }) =>
            request<PackageVersion[]>(
                api.GET('/api/v1/workflow-packages/{id}/versions', {
                    params: { path: { id } },
                    signal,
                })
            ),
    });

/** The workflows of one of the caller's packages, by name. */
export const packageWorkflowsQuery = (id: string) =>
    queryOptions({
        queryKey: packageKeys.workflows(id),
        queryFn: ({ signal }) =>
            request<WorkflowSummary[]>(
                api.GET('/api/v1/workflows', {
                    params: { query: { packageId: id } },
                    signal,
                })
            ),
    });

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

/**
 * The tags of public packages, most used first, those starting with `q`.
 * They change slowly: kept fresh for five minutes. While another prefix is
 * out, the last answer stays shown.
 */
export const exploreTagsQuery = (q: string) =>
    queryOptions({
        queryKey: packageKeys.exploreTags(q),
        queryFn: ({ signal }) =>
            request<PackageTag[]>(
                api.GET('/api/v1/workflow-packages/explore/tags', {
                    params: { query: { q: q || undefined, limit: 8 } },
                    signal,
                })
            ),
        staleTime: 5 * 60_000,
        placeholderData: keepPreviousData,
    });

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
