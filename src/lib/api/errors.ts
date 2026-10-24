import type { ErrorItem } from './types';

/** Errors keyed by input name; errors not tied to an input are under FORM. */
export type FormErrors = Record<string, ErrorItem[]>;

export const FORM = 'form';

/**
 * Groups errors by the input they are about. A field the form does not show
 * falls back to FORM, so no error is ever silently dropped.
 */
export function groupErrors(
    items: ErrorItem[],
    fields: readonly string[]
): FormErrors {
    const grouped: FormErrors = {};
    for (const item of items) {
        const key =
            item.field && fields.includes(item.field) ? item.field : FORM;
        (grouped[key] ??= []).push(item);
    }
    return grouped;
}
