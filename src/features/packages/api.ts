import { api, send, type ApiResult } from '@shared/api/client';
import type {
    ConnectionSummary,
    PackageContent,
    PackageInput,
    PackageInstall,
    PackagePublish,
    PackageShare,
    PackageVersion,
    WorkflowPackage,
    WorkflowSummary,
} from '@shared/api/types';

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

/** The caller's packages, then those shared with them. */
export async function myPackages(): Promise<WorkflowPackage[]> {
    const result = await send(api.GET('/api/v1/workflow-packages'));
    return result.ok ? result.data : [];
}

export function getPackage(id: string): Promise<ApiResult<WorkflowPackage>> {
    return send(
        api.GET('/api/v1/workflow-packages/{id}', { params: { path: { id } } })
    );
}

export function createPackage(
    pkg: PackageInput,
    publish: PackagePublish
): Promise<ApiResult<WorkflowPackage>> {
    return send(
        api.POST('/api/v1/workflow-packages', {
            body: { package: pkg, publish },
        })
    );
}

export function updatePackage(
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

export function deletePackage(id: string): Promise<ApiResult<unknown>> {
    return send(
        api.DELETE('/api/v1/workflow-packages/{id}', {
            params: { path: { id } },
        })
    );
}

export async function listVersions(id: string): Promise<PackageVersion[]> {
    const result = await send(
        api.GET('/api/v1/workflow-packages/{id}/versions', {
            params: { path: { id } },
        })
    );
    return result.ok ? result.data : [];
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

/** Copies a version's workflows into the caller's, connections mapped by name. */
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

export async function listShares(id: string): Promise<PackageShare[]> {
    const result = await send(
        api.GET('/api/v1/workflow-packages/{id}/shares', {
            params: { path: { id } },
        })
    );
    return result.ok ? result.data : [];
}

export function sharePackage(
    id: string,
    userName: string
): Promise<ApiResult<PackageShare>> {
    return send(
        api.PUT('/api/v1/workflow-packages/{id}/shares', {
            params: { path: { id } },
            body: { userName },
        })
    );
}

/** The owner removes someone, or the caller leaves a package shared with them. */
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

/** The caller's workflows, to choose what to publish. */
export async function myWorkflows(): Promise<WorkflowSummary[]> {
    const result = await send(api.GET('/api/v1/workflows'));
    return result.ok ? result.data : [];
}

/** The caller's connections, to map a package's onto. */
export async function myConnections(): Promise<ConnectionSummary[]> {
    const result = await send(api.GET('/api/v1/connections'));
    return result.ok ? result.data : [];
}
