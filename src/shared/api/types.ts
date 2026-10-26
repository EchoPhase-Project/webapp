// Shapes of the server's API, generated from its OpenAPI document into
// schema.d.ts (`npm run gen:api`); do not hand-write response types here.
import type { components, paths } from './schema';

type Schemas = components['schemas'];

export type User = Schemas['MeResponse'];

export type LoginCredentials = Schemas['LoginRequest'];

export type RegisterData = Schemas['RegisterRequest'];

export type ProfileUpdate = Schemas['UpdateProfileRequest'];

export type PasswordChange = Schemas['ChangePasswordRequest'];

/** The API's error body. `field` names the input it is about. */
export type ErrorItem = Schemas['ErrorBody'];

/** Query of GET /api/v1/sessions (cursor pagination). */
export type CursorOptions = NonNullable<
    paths['/api/v1/sessions']['get']['parameters']['query']
>;

export type Session = Schemas['SessionResponse'];

export type SessionsResponse = Schemas['SessionResponseCursorPageResponse'];

/** A stored file as the API describes it (no content). */
export type StoredFile = Schemas['FileResponse'];

/** What a file is for: decides its limits and who may read it. */
export type FilePurpose = Schemas['FilePurpose'];

/** A note as the caller sees it (their access included). */
export type Note = Schemas['NoteResponse'];

/** What the caller may do with a note: Owner, Edit or Read. */
export type NoteAccess = Schemas['NoteAccess'];

export type NoteInput = Schemas['NoteRequest'];

export type NoteShare = Schemas['NoteShareResponse'];

/** A workflow as listed (no program). */
export type WorkflowSummary = Schemas['WorkflowSummaryResponse'];

/** A workflow with its program, webhooks and schedules. */
export type Workflow = Schemas['WorkflowResponse'];

export type WorkflowVersion = Schemas['WorkflowVersionResponse'];

export type WorkflowImport = Schemas['WorkflowImportResponse'];

/** A run of a block program (a workflow's or not), without its result. */
export type BlockRun = Schemas['BlockRunResponse'];

export type BlockRunPage = Schemas['BlockRunPageResponse'];

/** A run and, until it expires, its result (output, variables, errors). */
export type BlockRunDetails = Schemas['BlockRunDetailsResponse'];

export type RunStarted = Schemas['RunStartedResponse'];

/** One of the caller's connections (provider, name, status). */
export type ConnectionSummary = Schemas['ConnectionSummary'];

/** A package as the caller sees it: their own (its workflows live in it) or someone else's published one. */
export type WorkflowPackage = Schemas['PackageResponse'];

/** Private, Unlisted or Public. */
export type PackageVisibility = Schemas['PackageVisibility'];

export type PackageInput = Schemas['PackageRequest'];

export type PackagePublish = Schemas['PublishPackageRequest'];

export type PackageVersion = Schemas['PackageVersionResponse'];

/** A version with its workflows and the connections they need. */
export type PackageContent = Schemas['PackageVersionContentResponse'];

/** A connection a package's workflows use. */
export type PackageConnection = Schemas['PackageConnection'];

export type PackageInstall = Schemas['PackageInstallResponse'];

export type PackageShare = Schemas['PackageShareResponse'];

/** A tag of public packages and how many carry it. */
export type PackageTag = Schemas['PackageTagResponse'];

export type AppNotification = Schemas['NotificationResponse'];

export type NotificationInbox = Schemas['NotificationInboxResponse'];

export type CreateApiClientData = Schemas['CreateApiClientRequest'];

/**
 * An API client as listed. Not in the OpenAPI document: the controller
 * returns a projection (the entity's [Expose] fields, PascalCase).
 */
export interface ApiClient {
    Id: string;
    Name: string;
    ExpiresAt: string | null;
    LastUsedAt: string | null;
    SecretRotatedAt: string | null;
    CreatedAt: string;
}

/** The answer to creating an API client; the secret is shown this once. Not in the OpenAPI document. */
export interface CreatedApiClient {
    clientId: string;
    clientSecret: string;
}
