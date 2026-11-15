import Button from '@shared/ui/Button';
import { IconX } from '@shared/ui/icons';

/**
 * The cross at the end of a row that removes it (a file, a person, a tag):
 * quiet until hovered, then red. The label names what goes ("Delete
 * report.pdf"); it is also the tooltip.
 */
export default function RemoveButton(props: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    /** Its size where it sits (a tag's cross is as small as the tag). */
    class?: string;
}) {
    return (
        <Button
            variant="icon-danger"
            class={props.class}
            aria-label={props.label}
            title={props.label}
            disabled={props.disabled}
            onClick={() => props.onClick()}
        >
            <IconX aria-hidden="true" />
        </Button>
    );
}
