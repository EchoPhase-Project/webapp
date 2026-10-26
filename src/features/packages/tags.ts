/** A tag's capsule class: one of six colours, always the same for the same name. */
export function tagClass(tag: string): string {
    let hash = 0;
    for (const char of tag) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    const n = (Math.abs(hash) % 6) + 1;
    return n === 1 ? 'package-tag' : `package-tag package-tag--${n}`;
}
