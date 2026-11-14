import {
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, multipart, request } from '@shared/api/client';
import type {
    Workflow,
    WorkflowImport,
    WorkflowSummary,
    WorkflowVersion,
} from '@shared/api/types';
import { packageKeys } from '@features/packages/api/packages';

// Workflows: always in one of the caller's packages (the list of a
// package's workflows is packageWorkflowsQuery, under its package).

export const workflowKeys = {
    all: ['workflows'] as const,
    detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
    versions: (id: string) => [...workflowKeys.detail(id), 'versions'] as const,
};

/** One workflow with its program, webhooks and schedules. */
export const workflowQuery = (id: string) =>
    queryOptions({
        queryKey: workflowKeys.detail(id),
        queryFn: ({ signal }) =>
            request<Workflow>(
                api.GET('/api/v1/workflows/{id}', {
                    params: { path: { id } },
                    signal,
                })
            ),
    });

/** Its saved versions, newest first: one per change of the program. */
export const workflowVersionsQuery = (id: string) =>
    queryOptions({
        queryKey: workflowKeys.versions(id),
        queryFn: ({ signal }) =>
            request<WorkflowVersion[]>(
                api.GET('/api/v1/workflows/{id}/versions', {
                    params: { path: { id } },
                    signal,
                })
            ),
    });

/**
 * A workflow saved: kept as the server answered it, its row in its
 * package's list changed at once (a switch does not flip back while the
 * list is asked again), its versions and that list asked again.
 */
function savedWorkflow(queryClient: QueryClient, workflow: Workflow) {
    queryClient.setQueryData(workflowKeys.detail(workflow.id), workflow);
    queryClient.setQueryData(
        packageKeys.workflows(workflow.packageId),
        (list: WorkflowSummary[] | undefined) =>
            list?.map((w) =>
                w.id === workflow.id
                    ? {
                          ...w,
                          name: workflow.name,
                          active: workflow.active,
                          version: workflow.version,
                          contentHash: workflow.contentHash,
                          updatedAt: workflow.updatedAt,
                      }
                    : w
            )
    );
    return Promise.all([
        queryClient.invalidateQueries({
            queryKey: workflowKeys.versions(workflow.id),
        }),
        queryClient.invalidateQueries({
            queryKey: packageKeys.workflows(workflow.packageId),
        }),
    ]);
}

type WorkflowChanges = Partial<Pick<Workflow, 'name' | 'program' | 'active'>>;

/** Saves `changes` over the workflow as given; another save meanwhile is a conflict (409). */
function putWorkflow(workflow: Workflow, changes: WorkflowChanges) {
    return request<Workflow>(
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

/** Saves the workflow as shown (name, program, active), only over that version (409 otherwise). */
export const updateWorkflowMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...workflowKeys.all, 'update'] as const,
        mutationFn: (v: { workflow: Workflow; changes: WorkflowChanges }) =>
            putWorkflow(v.workflow, v.changes),
        onSuccess: (workflow) => savedWorkflow(queryClient, workflow),
    });

/**
 * Turns the triggers of the workflow `id` on or off, where only its summary
 * is shown: it is read anew (always: it is saved over the version read),
 * then saved.
 */
export const switchWorkflowMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...workflowKeys.all, 'switch'] as const,
        mutationFn: async (v: { id: string; active: boolean }) =>
            putWorkflow(
                await queryClient.fetchQuery({
                    ...workflowQuery(v.id),
                    staleTime: 0,
                }),
                { active: v.active }
            ),
        onSuccess: (workflow) => savedWorkflow(queryClient, workflow),
    });

/**
 * Deletes it; refused (409) while another of its package calls it or it is
 * the error workflow. Its package's list (and count) is asked again.
 */
export const deleteWorkflowMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...workflowKeys.all, 'delete'] as const,
        mutationFn: (v: { id: string; packageId: string }) =>
            request(
                api.DELETE('/api/v1/workflows/{id}', {
                    params: { path: { id: v.id } },
                })
            ),
        onSuccess: (_, v) => {
            queryClient.removeQueries({ queryKey: workflowKeys.detail(v.id) });
            return Promise.all([
                queryClient.invalidateQueries({
                    queryKey: packageKeys.workflows(v.packageId),
                }),
                queryClient.invalidateQueries({
                    queryKey: packageKeys.mine(),
                }),
            ]);
        },
    });

/**
 * Makes an old version current again, as a new one on top; only over the
 * version shown (`currentVersion`).
 */
export const restoreWorkflowVersionMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...workflowKeys.all, 'restore'] as const,
        mutationFn: (v: {
            id: string;
            version: number;
            currentVersion: number;
        }) =>
            request<Workflow>(
                api.POST('/api/v1/workflows/{id}/versions/{version}/restore', {
                    params: { path: { id: v.id, version: v.version } },
                    body: { currentVersion: v.currentVersion },
                })
            ),
        onSuccess: (workflow) => savedWorkflow(queryClient, workflow),
    });

/** The export file's address: a plain link downloads it (the cookies sign it). */
export const workflowExportUrl = (id: string, version?: number) =>
    `/api/v1/workflows/${encodeURIComponent(id)}/export${version ? `?version=${version}` : ''}`;

/**
 * A new workflow from an export file, turned off: in the package given, or
 * a new one of its own. Kept as the server answered it; its package's list
 * and the caller's packages (one more workflow, or a new package) are
 * asked again.
 */
export const importWorkflowMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...workflowKeys.all, 'import'] as const,
        mutationFn: (v: { file: File; packageId?: string }) =>
            request<WorkflowImport>(
                api.POST('/api/v1/workflows/import/file', {
                    body: multipart({
                        File: v.file,
                        PackageId: v.packageId || undefined,
                    }),
                })
            ),
        onSuccess: ({ workflow }) => {
            queryClient.setQueryData(
                workflowKeys.detail(workflow.id),
                workflow
            );
            return Promise.all([
                queryClient.invalidateQueries({
                    queryKey: packageKeys.workflows(workflow.packageId),
                }),
                queryClient.invalidateQueries({
                    queryKey: packageKeys.mine(),
                }),
            ]);
        },
    });
