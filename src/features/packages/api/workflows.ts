import {
    api,
    dataOr,
    multipart,
    send,
    type ApiResult,
} from '@shared/api/client';
import type {
    Workflow,
    WorkflowImport,
    WorkflowSummary,
    WorkflowVersion,
} from '@shared/api/types';

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
