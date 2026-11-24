import InlineList from '@shared/ui/InlineList';
import type { ListOption } from './option-list';

/** An option's hint: a text, or its parts with a dot between them. */
export function OptionHint(props: { hint: ListOption<unknown>['hint'] }) {
    return (
        <>
            {Array.isArray(props.hint) ? (
                <InlineList items={props.hint} />
            ) : (
                props.hint
            )}
        </>
    );
}
