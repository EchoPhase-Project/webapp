import {
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import {
    api,
    dataOr,
    multipart,
    request,
    send,
    type ApiResult,
} from '@shared/api/client';
import type {
    BlockRunDetails,
    BlockRunPage,
    ConnectionSummary,
    PackageContent,
    PackageInput,
    PackageInstall,
    PackagePublish,
    PackageShare,
    PackageTag,
    PackageVersion,
    RunStarted,
    Workflow,
    WorkflowImport,
    WorkflowPackage,
    WorkflowSummary,
    WorkflowVersion,
} from '@shared/api/types';

// Packages: the caller's own (their workflows live in them), and the
// published ones everyone reads in Explore.

// Only the shares are on Query so far; the rest moves in steps 8 and 9.
export const packageKeys = {
    all: ['packages'] as const,
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

/** A page of public packages and the cursor of the next (null: the last). */
export interface ExplorePage {
    items: WorkflowPackage[];
    next: string | null;
}

/** Public packages, most installed first, a page at a time; `q` searches name and summary. */
export async function explorePackages(
    q?: string,
    tag?: string,
    cursor?: string
): Promise<ApiResult<ExplorePage>> {
    const result = await send(
        api.GET('/api/v1/workflow-packages/explore', {
            params: {
                query: {
                    q: q || undefined,
                    tag: tag || undefined,
                    cursor,
                    limit: 30,
                },
            },
        })
    );
    return result.ok
        ? {
              ok: true,
              data: {
                  items: result.data.data,
                  next: result.data.nextCursor ?? null,
              },
          }
        : result;
}

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

/** The runs of all its workflows, newest first. */
export function listPackageRuns(
    id: string,
    cursor?: string
): Promise<ApiResult<BlockRunPage>> {
    return send(
        api.GET('/api/v1/workflow-packages/{id}/runs', {
            params: { path: { id }, query: { limit: 20, cursor } },
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

// Workflows: always in one of the caller's packages.

/** The workflows of one package, by name. */
export async function listWorkflows(
    packageId: string
): Promise<WorkflowSummary[]> {
    const result = await send(
        api.GET('/api/v1/workflows', { params: { query: { packageId } } })
    );
    return dataOr(result, []);
}

export function getWorkflow(id: string): Promise<ApiResult<Workflow>> {
    return send(
        api.GET('/api/v1/workflows/{id}', { params: { path: { id } } })
    );
}

/** Saves the workflow as given (name, program, active), only over the version shown (409 otherwise). */
export function saveWorkflow(
    workflow: Workflow,
    changes: Partial<Pick<Workflow, 'name' | 'program' | 'active'>>
): Promise<ApiResult<Workflow>> {
    return send(
        api.PUT('/api/v1/workflows/{id}', {
            params: { path: { id: workflow.id } },
            body: {
                name: changes.name ?? workflow.name,
                program: changes.program ?? workflow.program,
                active: changes.active ?? workflow.active,
                version: workflow.version,
            },
        })
    );
}

/** Turns its triggers on or off. */
export const setActive = (workflow: Workflow, active: boolean) =>
    saveWorkflow(workflow, { active });

/** Deletes it; refused (409) while another of its package calls it or it is the error workflow. */
export function deleteWorkflow(id: string): Promise<ApiResult<unknown>> {
    return send(
        api.DELETE('/api/v1/workflows/{id}', { params: { path: { id } } })
    );
}

/** A run now, active or not, with this input (a JSON value). */
export function runWorkflow(
    id: string,
    input?: unknown
): Promise<ApiResult<RunStarted>> {
    return send(
        api.POST('/api/v1/workflows/{id}/runs', {
            params: { path: { id } },
            body: { input },
        })
    );
}

export function listWorkflowRuns(
    id: string,
    cursor?: string
): Promise<ApiResult<BlockRunPage>> {
    return send(
        api.GET('/api/v1/workflows/{id}/runs', {
            params: { path: { id }, query: { limit: 20, cursor } },
        })
    );
}

export function getRun(runId: string): Promise<ApiResult<BlockRunDetails>> {
    return send(
        api.GET('/api/v1/blocks/runs/{runId}', { params: { path: { runId } } })
    );
}

export async function listWorkflowVersions(
    id: string
): Promise<WorkflowVersion[]> {
    const result = await send(
        api.GET('/api/v1/workflows/{id}/versions', { params: { path: { id } } })
    );
    return dataOr(result, []);
}

/** Makes an old version current again, as a new one on top. */
export function restoreWorkflowVersion(
    id: string,
    version: number,
    currentVersion: number
): Promise<ApiResult<Workflow>> {
    return send(
        api.POST('/api/v1/workflows/{id}/versions/{version}/restore', {
            params: { path: { id, version } },
            body: { currentVersion },
        })
    );
}

/** The export file's address: a plain link downloads it (the cookies sign it). */
export const workflowExportUrl = (id: string, version?: number) =>
    `/api/v1/workflows/${encodeURIComponent(id)}/export${version ? `?version=${version}` : ''}`;

/** A new workflow from an export file, turned off: in the package given, or a new one of its own. */
export function importWorkflow(
    file: File,
    packageId?: string
): Promise<ApiResult<WorkflowImport>> {
    return send(
        api.POST('/api/v1/workflows/import/file', {
            body: multipart({ File: file, PackageId: packageId || undefined }),
        })
    );
}
