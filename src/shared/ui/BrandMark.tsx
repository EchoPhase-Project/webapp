import type { JSX } from 'solid-js';

/**
 * The EchoPhase mark without its tile: a wave and its fainter echo a quarter
 * period behind (static/assets/icons/icon.svg), in the current colour.
 */
export default function BrandMark(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
    return (
        <svg
            viewBox="6 6 52 52"
            width="1em"
            height="1em"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            aria-hidden="true"
            {...props}
        >
            <path
                d="M-1 32q11-20 22 0t22 0 22 0"
                stroke-width="4.5"
                opacity=".45"
            />
            <path d="M10 32q11-20 22 0t22 0" stroke-width="6" />
        </svg>
    );
}
