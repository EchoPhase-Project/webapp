import BrandMark from './BrandMark';
import './brand-tile.scss';

/**
 * The amber mark in a 1em square, so it lines up with the sidebar's icons
 * and takes the size of its text.
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
