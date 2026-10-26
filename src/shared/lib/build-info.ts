// The contract this build was typed against: the same file CI pulls the
// contract by, so it is never kept by hand twice.
import apiVersion from '/api-version?raw';

declare const __APP_VERSION__: string;

/** This build: its image tag ("0.5.0-3-gabc"), 0.0.0-local for a local one. */
export const APP_VERSION: string = __APP_VERSION__;

/** The API contract it was built for ("0.6.0"). */
export const API_VERSION: string = apiVersion.trim();
