import { api, send, type ApiResult } from '@shared/api/client';
import type {
    BlockRunDetails,
    BlockRunPage,
    RunStarted,
    Workflow,
    WorkflowImport,
    WorkflowSummary,
    WorkflowVersion,
} from '@shared/api/types';

export async function listWorkflows(): Promise<WorkflowSummary[]> {
    const result = await send(api.GET('/api/v1/workflows'));
    return result.ok ? result.data : [];
}

export function getWorkflow(id: string): Promise<ApiResult<Workflow>> {
    return send(
        api.GET('/api/v1/workflows/{id}', { params: { path: { id } } })
    );
}

/** Turns its triggers on or off; saves only over the version shown (409 otherwise). */
export function setActive(
    workflow: Workflow,
    active: boolean
): Promise<ApiResult<Workflow>> {
    return send(
        api.PUT('/api/v1/workflows/{id}', {
            params: { path: { id: workflow.id } },
            body: {
                name: workflow.name,
                program: workflow.program,
                active,
                version: workflow.version,
            },
        })
    );
}

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

export function listRuns(
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

export async function listVersions(id: string): Promise<WorkflowVersion[]> {
    const result = await send(
        api.GET('/api/v1/workflows/{id}/versions', { params: { path: { id } } })
    );
    return result.ok ? result.data : [];
}

/** Makes an old version current again, as a new one on top. */
export function restoreVersion(
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
export const exportUrl = (id: string, version?: number) =>
    `/api/v1/workflows/${encodeURIComponent(id)}/export${version ? `?version=${version}` : ''}`;

/** A new workflow from an export file, turned off. */
export function importWorkflow(file: File): Promise<ApiResult<WorkflowImport>> {
    const form = new FormData();
    form.append('File', file);
    return send(
        api.POST('/api/v1/workflows/import/file', {
            body: form as unknown as { File: string; Name?: string },
        })
    );
}
