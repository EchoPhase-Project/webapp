import { createSignal, Show } from 'solid-js';
import { contentUrl } from '@shared/api/files';
import './avatar.scss';

/**
 * A user's picture, or the first letter of their name on the accent when
 * there is none (or it does not load). Decorative: the name is next to it.
 */
export default function Avatar(props: {
    name: string;
    fileId?: string | null;
    /** Side in pixels; 40 by default. */
    size?: number;
}) {
    // Keyed by file, so a new picture gets a new chance to load.
    const [failed, setFailed] = createSignal<string | null>(null);
    const initial = () => props.name.trim().charAt(0).toUpperCase() || '?';

    return (
        <span
            class="avatar"
            style={{ '--avatar-size': `${props.size ?? 40}px` }}
            aria-hidden="true"
        >
            <Show
                when={props.fileId && failed() !== props.fileId && props.fileId}
                fallback={initial()}
            >
                {(id) => (
                    <img
                        src={contentUrl(id())}
                        alt=""
                        onError={() => setFailed(id())}
                    />
                )}
            </Show>
        </span>
    );
}
