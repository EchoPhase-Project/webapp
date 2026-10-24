import { splitProps, type JSX } from 'solid-js';

type CardProps = JSX.HTMLAttributes<HTMLDivElement> & {
    /** The flowing-lines pattern: for brand moments, not working surfaces. */
    patterned?: boolean;
};

/** A surface that is one thing (a notice, a panel), set off by shadow. */
export default function Card(props: CardProps) {
    const [own, rest] = splitProps(props, ['patterned', 'class']);
    return (
        <div
            class={['card', own.patterned && 'patterned', own.class]
                .filter(Boolean)
                .join(' ')}
            {...rest}
        />
    );
}
