import { createSignal, Show, type JSX } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import { useI18n } from '@shared/i18n/i18n-context';
import FieldError from '@shared/ui/forms/FieldError';
import Markdown from '@shared/ui/Markdown';
import Tabs, { tabPanelProps } from '@shared/ui/Tabs';
import TextArea from '@shared/ui/forms/TextArea';
import './markdown-editor.scss';

type Mode = 'write' | 'preview';

/**
 * Markdown text with Write and Preview tabs: a TextArea, or the text as it
 * will show. The errors show under both.
 */
export default function MarkdownEditor(props: {
    /** The text area's id; the tabs' ids start with it. */
    id: string;
    name?: string;
    /** What the text is (e.g. "README"): the tabs' and the text area's name. */
    label: string;
    /** The label before the tabs; otherwise for screen readers only. */
    showLabel?: boolean;
    /** After the tabs, on their line (a hint such as "Markdown works"). */
    aside?: JSX.Element;
    value: string;
    onInput: (value: string) => void;
    placeholder?: string;
    rows?: number;
    maxLength?: number;
    disabled?: boolean;
    errors?: ErrorItem[];
}) {
    const i18n = useI18n();
    const [mode, setMode] = createSignal<Mode>('write');
    const tabsId = () => `${props.id}-tabs`;

    return (
        <div class="markdown-editor">
            <Tabs
                id={tabsId()}
                label={props.label}
                showLabel={props.showLabel}
                value={mode()}
                onChange={setMode}
                tabs={[
                    { value: 'write', label: i18n.t('ui.write', 'Write') },
                    {
                        value: 'preview',
                        label: i18n.t('ui.preview', 'Preview'),
                    },
                ]}
                aside={props.aside}
            />
            <div {...tabPanelProps(tabsId(), mode())}>
                <Show
                    when={mode() === 'write'}
                    fallback={
                        <>
                            <div class="markdown-editor-preview">
                                <Show
                                    when={props.value.trim()}
                                    fallback={
                                        <p class="muted">
                                            {i18n.t(
                                                'ui.nothing_to_preview',
                                                'Nothing to preview yet'
                                            )}
                                        </p>
                                    }
                                >
                                    <Markdown text={props.value} />
                                </Show>
                            </div>
                            <FieldError for={props.id} errors={props.errors} />
                        </>
                    }
                >
                    <TextArea
                        id={props.id}
                        name={props.name}
                        label={props.label}
                        errors={props.errors}
                        placeholder={props.placeholder}
                        rows={props.rows}
                        maxLength={props.maxLength}
                        disabled={props.disabled}
                        value={props.value}
                        onInput={(e) => props.onInput(e.currentTarget.value)}
                    />
                </Show>
            </div>
        </div>
    );
}
