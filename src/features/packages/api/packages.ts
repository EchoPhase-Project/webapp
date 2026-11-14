import {
    infiniteQueryOptions,
    keepPreviousData,
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';
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
// published ones everyone reads in Explore.

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

/**
 * A package saved: kept as the server answered it, and the caller's list
 * asked again; Explore's searches too when who sees it changed from
 * `before` (as it was opened).
 */
function savedPackage(
    queryClient: QueryClient,
    pkg: WorkflowPackage,
    before?: WorkflowPackage
) {
    queryClient.setQueryData(packageKeys.detail(pkg.id), pkg);
    const lists = [
        queryClient.invalidateQueries({ queryKey: packageKeys.mine() }),
    ];
    if (before && before.visibility !== pkg.visibility)
        lists.push(
            queryClient.invalidateQueries({
                queryKey: packageKeys.exploreLists(),
            })
        );
    return Promise.all(lists);
}

/**
 * A package gone for the caller: all about it dropped (its content,
 * versions, shares and workflows are under its key), their list asked again.
 */
function gonePackage(queryClient: QueryClient, id: string) {
    queryClient.removeQueries({ queryKey: packageKeys.detail(id) });
    return queryClient.invalidateQueries({ queryKey: packageKeys.mine() });
}

/** A new, empty package: workflows are made in it, versions published from it. */
export const createPackageMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...packageKeys.all, 'create'] as const,
        mutationFn: (body: PackageInput) =>
            request<WorkflowPackage>(
                api.POST('/api/v1/workflow-packages', { body })
            ),
        onSuccess: (pkg) => savedPackage(queryClient, pkg),
    });

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
 * Saves one part of a package (`patch`: its tags, who sees it), the rest as
 * it was opened (`pkg`): someone else's save meanwhile is a conflict
 * (expectedStamp).
 */
export const updatePackageMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...packageKeys.all, 'update'] as const,
        mutationFn: (v: {
            pkg: WorkflowPackage;
            patch: Partial<PackageInput>;
        }) =>
            request<WorkflowPackage>(
                api.PUT('/api/v1/workflow-packages/{id}', {
                    params: { path: { id: v.pkg.id } },
                    body: { ...inputOf(v.pkg), ...v.patch },
                })
            ),
        onSuccess: (pkg, v) => savedPackage(queryClient, pkg, v.pkg),
    });

/** Deletes it with its workflows; packages others installed from it stay. */
export const deletePackageMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...packageKeys.all, 'delete'] as const,
        mutationFn: (id: string) =>
            request(
                api.DELETE('/api/v1/workflow-packages/{id}', {
                    params: { path: { id } },
                })
            ),
        onSuccess: (_, id) => gonePackage(queryClient, id),
    });

/**
 * A new version of the package `id`. It shows at once as the latest; the
 * package, its versions, its latest content and Explore are asked again.
 * The content of published versions never changes: left alone (exact keys).
 */
export const publishPackageVersionMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...packageKeys.all, 'publish'] as const,
        mutationFn: (v: { id: string; body: PackagePublish }) =>
            request<PackageVersion>(
                api.POST('/api/v1/workflow-packages/{id}/versions', {
                    params: { path: { id: v.id } },
                    body: v.body,
                })
            ),
        onSuccess: (version, v) => {
            queryClient.setQueryData(
                packageKeys.detail(v.id),
                (pkg: WorkflowPackage | undefined) =>
                    pkg && {
                        ...pkg,
                        latestVersion: version.version,
                        updatedAt: version.createdAt,
                    }
            );
            return Promise.all([
                queryClient.invalidateQueries({
                    queryKey: packageKeys.detail(v.id),
                    exact: true,
                }),
                queryClient.invalidateQueries({
                    queryKey: packageKeys.versions(v.id),
                }),
                queryClient.invalidateQueries({
                    queryKey: packageKeys.content(v.id),
                    exact: true,
                }),
                queryClient.invalidateQueries({
                    queryKey: packageKeys.exploreLists(),
                }),
            ]);
        },
    });

/**
 * A new package of the caller's from a version of the package `id`
 * (absent: the latest), connections mapped by name. The new one is kept as
 * the server answered it; the caller's list and the source (one more
 * install) are asked again.
 */
export const installPackageMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...packageKeys.all, 'install'] as const,
        mutationFn: (v: {
            id: string;
            version?: number;
            connections: Record<string, string>;
        }) =>
            request<PackageInstall>(
                api.POST('/api/v1/workflow-packages/{id}/install', {
                    params: { path: { id: v.id } },
                    body: { version: v.version, connections: v.connections },
                })
            ),
        onSuccess: (installed, v) => {
            queryClient.setQueryData(
                packageKeys.detail(installed.package.id),
                installed.package
            );
            return Promise.all([
                queryClient.invalidateQueries({
                    queryKey: packageKeys.mine(),
                }),
                queryClient.invalidateQueries({
                    queryKey: packageKeys.detail(v.id),
                    exact: true,
                }),
            ]);
        },
    });

/** The caller (`userId`) leaves a package shared with them. */
export const leavePackageMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...packageKeys.all, 'leave'] as const,
        mutationFn: (v: { id: string; userId: string }) =>
            request(
                api.DELETE('/api/v1/workflow-packages/{id}/shares/{userId}', {
                    params: { path: { id: v.id, userId: v.userId } },
                })
            ),
        onSuccess: (_, v) => gonePackage(queryClient, v.id),
    });
