import { createSignal } from 'solid-js';
import Markdown from '@shared/ui/Markdown';
import MarkdownEditor from '@shared/ui/MarkdownEditor';
import Switch from '@shared/ui/Switch';
import { DevGrid, DevSample, DevSection } from './DevKit';

// Headings start at h4: the sample sits under the page's h2 and h3.
const sample = `#### A heading

A paragraph with **bold**, _italic_, \`code\` and [a link](https://example.com).

- A list item
- Another, with a sub-list:
  1. one
  2. two

> A quote that goes on long enough to wrap onto a second line on a phone.

\`\`\`js
const greeting = 'Hello';
console.log(greeting);
\`\`\`

| Name | Runs |
| ---- | ---: |
| deploy | 12 |
| backup | 3 |

---

<b>HTML is not rendered</b>: it shows as text.`;

/** MarkdownEditor in its states, and Markdown on a full sample. */
export default function MarkdownPage() {
    const [text, setText] = createSignal(sample);
    const [empty, setEmpty] = createSignal('');
    const [showErrors, setShowErrors] = createSignal(false);

    return (
        <>
            <Switch
                label="Show errors"
                checked={showErrors()}
                onChange={setShowErrors}
            />

            <DevSection
                title="MarkdownEditor"
                note="Write and Preview are tabs. The errors show under both."
            >
                <DevGrid wide>
                    <DevSample title="Label and aside">
                        <MarkdownEditor
                            id="dev-markdown-readme"
                            label="README"
                            showLabel
                            aside={<span class="muted">Markdown works</span>}
                            rows={8}
                            value={text()}
                            onInput={setText}
                            errors={
                                showErrors()
                                    ? [
                                          {
                                              code: 'dev_example',
                                              message:
                                                  'The README is too long.',
                                          },
                                      ]
                                    : undefined
                            }
                        />
                    </DevSample>
                    <DevSample title="Empty (Preview has a hint)">
                        <MarkdownEditor
                            id="dev-markdown-empty"
                            label="Description"
                            placeholder="Write something"
                            rows={4}
                            value={empty()}
                            onInput={setEmpty}
                        />
                    </DevSample>
                    <DevSample title="Disabled">
                        <MarkdownEditor
                            id="dev-markdown-disabled"
                            label="Notes"
                            rows={3}
                            value="Saving…"
                            onInput={() => {}}
                            disabled
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection title="Markdown">
                <DevGrid wide>
                    <DevSample title="Every element">
                        <Markdown text={sample} />
                    </DevSample>
                </DevGrid>
            </DevSection>
        </>
    );
}
