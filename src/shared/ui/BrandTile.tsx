import BrandMark from './BrandMark';
import './brand-tile.scss';

/**
 * The amber mark on a tile of the page's background: the logo where it
 * stands on another surface (the sidebar). 1em square, so it takes the size
 * of its text.
 */
export default function BrandTile(props: { class?: string }) {
    return (
        <span
            class={['brand-tile', props.class].filter(Boolean).join(' ')}
            aria-hidden="true"
        >
            <BrandMark />
        </span>
    );
}
