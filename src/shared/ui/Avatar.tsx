import { createSignal, Show } from 'solid-js';
import { contentUrl } from '@shared/api/files';
import { avatarBackground } from '@shared/lib/avatar-gradient';
import './avatar.scss';

/**
 * A user's picture, or without one (or when it does not load) a gradient of
 * their own, from their id. Decorative: the name is next to it or in the
 * page; `initial` puts the name's first letter on the gradient where the
 * avatar stands alone.
 */
export default function Avatar(props: {
    name: string;
    /** Picks the gradient: the user's id (the name when there is none). */
    seed?: string;
    fileId?: string | null;
    /** Side in pixels; 40 by default. */
    size?: number;
    /** The first letter on the gradient. */
    initial?: boolean;
}) {
    // Keyed by file, so a new picture gets a new chance to load.
    const [failed, setFailed] = createSignal<string | null>(null);
    const letter = () => props.name.trim().charAt(0).toUpperCase() || '?';
    const picture = () =>
        props.fileId && failed() !== props.fileId ? props.fileId : null;

    return (
        <span
            class="avatar"
            classList={{ 'avatar--generated': !picture() }}
            style={{
                '--avatar-size': `${props.size ?? 40}px`,
                background: picture()
                    ? undefined
                    : avatarBackground(props.seed ?? props.name),
            }}
            aria-hidden="true"
        >
            <Show
                when={picture()}
                fallback={
                    <Show when={props.initial}>
                        <span class="avatar-initial">{letter()}</span>
                    </Show>
                }
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
