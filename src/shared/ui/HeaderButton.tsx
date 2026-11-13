import { splitProps, type JSX } from 'solid-js';
import './header.scss';

type HeaderButtonProps = Omit<
    JSX.ButtonHTMLAttributes<HTMLButtonElement>,
    'aria-label' | 'title'
> & {
    /** Said to screen readers and shown on hover: the button is an icon only. */
    label: string;
};

/**
 * A square icon button in the top bar (new note, notifications, theme): its
 * own size and shape, not the app's `.btn`; type "button".
 */
export default function HeaderButton(props: HeaderButtonProps) {
    const [own, rest] = splitProps(props, ['label', 'class']);
    return (
        <button
            type="button"
            class={['header-button', own.class].filter(Boolean).join(' ')}
            aria-label={own.label}
            title={own.label}
            {...rest}
        />
    );
}
