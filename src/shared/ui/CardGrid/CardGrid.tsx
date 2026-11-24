import { Index, Show, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import Card from '@shared/ui/Card';
import { useSkeleton, type SkeletonProps } from '@shared/ui/Skeleton';
import './card-grid.scss';

export type CardGridProps = {
    /**
     * The narrowest a column goes: 'small' (16rem: notes, short texts) or
     * 'medium' (20rem: cards with a meta line, packages). Small by default.
     */
    size?: 'small' | 'medium';
    /**
     * Few cards fill the row (a brand page, a fixed set): the columns grow
     * into the room the missing cards leave. Otherwise they keep their
     * width, so a short list looks as a long one does.
     */
    stretch?: boolean;
    /** 'ul' when the cards are a list (then each child is an <li>). */
    as?: 'div' | 'ul';
    /** Empty cards in the loading form (6 by default). */
    skeletonCards?: number;
    class?: string;
    children?: JSX.Element;
} & SkeletonProps;

/**
 * Cards of one size side by side, as many columns as fit, each at least
 * its `size`; one row's cards as tall as its tallest; one column on a
 * phone. For cards of very different heights, use Masonry.
 *
 * Its loading form (in a `SkeletonScope` that loads) is the same grid of
 * empty cards, in place of the children.
 */
export default function CardGrid(props: CardGridProps) {
    const loading = useSkeleton(props);
    const tag = () => props.as ?? 'div';
    return (
        <Dynamic
            component={tag()}
            class={[
                'card-grid',
                `card-grid--${props.size ?? 'small'}`,
                props.stretch && 'card-grid--stretch',
                props.class,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <Show when={loading()} fallback={props.children}>
                <Index each={Array.from({ length: props.skeletonCards ?? 6 })}>
                    {() =>
                        tag() === 'ul' ? (
                            <li>
                                <Card />
                            </li>
                        ) : (
                            <Card />
                        )
                    }
                </Index>
            </Show>
        </Dynamic>
    );
}
