import { createSignal, For, type Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import Field from '@shared/ui/forms/Field';
import * as icons from '@shared/ui/icons';
import type { IconProps } from '@shared/ui/icons';
import { DevSection } from './DevKit';

/** Every icon that icons.ts exports, by name. */
const all = Object.entries(icons)
    .filter(
        (entry): entry is [string, Component<IconProps>] =>
            entry[0].startsWith('Icon') && typeof entry[1] === 'function'
    )
    .sort(([a], [b]) => a.localeCompare(b));

/** A grid of all icons with their names, and a filter. */
export default function IconsPage() {
    const [filter, setFilter] = createSignal('');
    const shown = () => {
        const text = filter().trim().toLowerCase();
        return text
            ? all.filter(([name]) => name.toLowerCase().includes(text))
            : all;
    };

    return (
        <DevSection
            title={`All icons (${all.length})`}
            note="Import each from @shared/ui/icons. They are aria-hidden unless they get a name."
        >
            <Field
                id="dev-icons-filter"
                name="filter"
                label="Filter by name"
                showLabel
                autocomplete="off"
                value={filter()}
                onInput={(e) => setFilter(e.currentTarget.value)}
            />
            <ul class="dev-icons">
                <For
                    each={shown()}
                    fallback={<li class="muted">No icon has this name.</li>}
                >
                    {([name, icon]) => (
                        <li class="dev-icon">
                            <Dynamic component={icon} size={24} />
                            <code>{name}</code>
                        </li>
                    )}
                </For>
            </ul>
        </DevSection>
    );
}
