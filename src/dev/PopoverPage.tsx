import { createSignal, createUniqueId, For } from 'solid-js';
import Button from '@shared/ui/Button';
import Popover, {
    type PopoverAlign,
    type PopoverMode,
    type PopoverSide,
} from '@shared/ui/Popover';
import { DevGrid, DevSample, DevSection } from './DevKit';

type Variant = {
    title: string;
    side: PopoverSide;
    align: PopoverAlign;
    mode: PopoverMode;
};

const variants: Variant[] = [
    { title: 'Bottom, start', side: 'bottom', align: 'start', mode: 'auto' },
    { title: 'Bottom, end', side: 'bottom', align: 'end', mode: 'auto' },
    { title: 'Right, start', side: 'right', align: 'start', mode: 'auto' },
    { title: 'Right, end', side: 'right', align: 'end', mode: 'auto' },
    {
        title: 'Bottom, start, manual',
        side: 'bottom',
        align: 'start',
        mode: 'manual',
    },
];

/** One trigger and its panel: the trigger says aria-expanded and aria-controls. */
function Sample(props: Variant) {
    const [open, setOpen] = createSignal(false);
    const id = createUniqueId();
    let trigger: HTMLButtonElement | undefined;

    return (
        <DevSample title={props.title}>
            <div class="actions-row">
                <Button
                    ref={trigger}
                    variant="ghost"
                    aria-expanded={open()}
                    aria-controls={id}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open() ? 'Close the panel' : 'Open the panel'}
                </Button>
            </div>
            <p class="muted">
                {props.mode === 'auto'
                    ? 'A press outside, Escape, or another auto panel closes it.'
                    : 'Only the trigger or the button in the panel closes it.'}
            </p>
            <Popover
                open={open()}
                onClose={() => setOpen(false)}
                anchor={() => trigger}
                side={props.side}
                align={props.align}
                mode={props.mode}
                gap={6}
                id={id}
                class="dev-popover-panel"
                role="dialog"
                label={props.title}
            >
                <p>
                    <strong>{props.title}</strong>
                </p>
                <p class="muted">
                    Side {props.side}, align {props.align}, mode {props.mode}.
                </p>
                <div class="actions-row actions-row--end">
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </div>
            </Popover>
        </DevSample>
    );
}

/** Popover in each placement and mode. */
export default function PopoverPage() {
    return (
        <DevSection
            title="Popover"
            note="The panel is in the top layer: no parent with an overflow clips it. Near the edge of the window it opens above or moves in."
        >
            <DevGrid>
                <For each={variants}>
                    {(variant) => <Sample {...variant} />}
                </For>
            </DevGrid>
        </DevSection>
    );
}
