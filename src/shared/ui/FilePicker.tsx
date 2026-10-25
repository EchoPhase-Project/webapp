import type { JSX } from 'solid-js';
import Button from './Button';

/**
 * A button that opens the file dialog and hands over the chosen file. The
 * input is cleared after each pick, so the same file can be picked again.
 */
export default function FilePicker(props: {
    /** The input's accept list, e.g. "image/png,image/jpeg". */
    accept?: string;
    variant?: 'primary' | 'ghost';
    busy?: boolean;
    disabled?: boolean;
    onPick: (file: File) => void;
    children: JSX.Element;
}) {
    let input: HTMLInputElement | undefined;

    return (
        <>
            <input
                ref={input}
                type="file"
                class="visually-hidden"
                tabindex="-1"
                aria-hidden="true"
                accept={props.accept}
                onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (file) props.onPick(file);
                }}
            />
            <Button
                variant={props.variant}
                busy={props.busy}
                disabled={props.disabled}
                onClick={() => input?.click()}
            >
                {props.children}
            </Button>
        </>
    );
}
