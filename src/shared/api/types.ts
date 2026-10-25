// Shapes of the server's API, generated from its OpenAPI document into
// schema.d.ts (`npm run gen:api`); do not hand-write response types here.
import type { components, paths } from './schema';

type Schemas = components['schemas'];

export type User = Schemas['MeResponse'];

export type LoginCredentials = Schemas['LoginRequest'];

export type RegisterData = Schemas['RegisterRequest'];

export type ProfileUpdate = Schemas['UpdateProfileRequest'];

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
