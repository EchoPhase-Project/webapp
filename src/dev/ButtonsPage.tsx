import { createSignal, For } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import Button, { LinkButton } from '@shared/ui/Button';
import HeaderButton from '@shared/ui/HeaderButton';
import RemoveButton from '@shared/ui/RemoveButton';
import Switch from '@shared/ui/Switch';
import Tabs, { NavTabs, tabPanelProps } from '@shared/ui/Tabs';
import {
    IconBell,
    IconCopy,
    IconDownload,
    IconMoon,
    IconPencil,
    IconTrash,
} from '@shared/ui/icons';
import { DevGrid, DevLog, DevSample, DevSection } from './DevKit';

const textVariants = [
    'primary',
    'ghost',
    'ghost-danger',
    'danger',
    'danger-outline',
] as const;

const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'runs', label: 'Runs' },
    { value: 'settings', label: 'Settings' },
] as const;

type Tab = (typeof tabs)[number]['value'];

/** Buttons and the small controls next to them, in each state. */
export default function ButtonsPage() {
    const [log, setLog] = createSignal('');
    const [files, setFiles] = createSignal(['report.pdf', 'logo.png', 'a.csv']);
    const [notify, setNotify] = createSignal(true);
    const [publicPage, setPublicPage] = createSignal(false);
    const [tab, setTab] = createSignal<Tab>('overview');
    const [params] = useSearchParams();
    const navTab = () => {
        const value = params.tab;
        return tabs.some((t) => t.value === value)
            ? (value as Tab)
            : 'overview';
    };

    return (
        <>
            <DevLog>{log()}</DevLog>

            <DevSection
                title="Button"
                note="Busy disables the button and sets aria-busy. Type is button unless told otherwise."
            >
                <DevGrid>
                    <For each={textVariants}>
                        {(variant) => (
                            <DevSample title={variant}>
                                <div class="actions-row">
                                    <Button
                                        variant={variant}
                                        onClick={() =>
                                            setLog(`Clicked ${variant}`)
                                        }
                                    >
                                        Save
                                    </Button>
                                    <Button variant={variant} busy>
                                        Busy
                                    </Button>
                                    <Button variant={variant} disabled>
                                        Disabled
                                    </Button>
                                </div>
                            </DevSample>
                        )}
                    </For>
                    <DevSample title="icon">
                        <div class="actions-row">
                            <Button
                                variant="icon"
                                aria-label="Copy"
                                onClick={() => setLog('Clicked copy')}
                            >
                                <IconCopy />
                            </Button>
                            <Button variant="icon" aria-label="Download" busy>
                                <IconDownload />
                            </Button>
                            <Button variant="icon" aria-label="Edit" disabled>
                                <IconPencil />
                            </Button>
                        </div>
                    </DevSample>
                    <DevSample title="icon-danger">
                        <div class="actions-row">
                            <Button
                                variant="icon-danger"
                                aria-label="Delete"
                                onClick={() => setLog('Clicked delete')}
                            >
                                <IconTrash />
                            </Button>
                            <Button
                                variant="icon-danger"
                                aria-label="Delete (busy)"
                                busy
                            >
                                <IconTrash />
                            </Button>
                            <Button
                                variant="icon-danger"
                                aria-label="Delete (disabled)"
                                disabled
                            >
                                <IconTrash />
                            </Button>
                        </div>
                    </DevSample>
                    <DevSample title="link">
                        <p>
                            The run failed.{' '}
                            <Button
                                variant="link"
                                onClick={() => setLog('Clicked try again')}
                            >
                                Try again
                            </Button>{' '}
                            or open the logs.
                        </p>
                    </DevSample>
                    <DevSample title="With an icon">
                        <div class="actions-row">
                            <Button>
                                <IconDownload /> Export
                            </Button>
                            <Button variant="ghost">
                                <IconCopy /> Copy
                            </Button>
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="LinkButton"
                note="A link with the look of a Button: a move to another page, a download or another site. No disabled and no busy: a link that cannot be followed is not shown."
            >
                <div class="actions-row">
                    <LinkButton href="/dev">To the index</LinkButton>
                    <LinkButton variant="ghost" href="/dev/forms">
                        Forms
                    </LinkButton>
                    <LinkButton
                        variant="ghost"
                        href="https://github.com/EchoPhase-Project"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Another site
                    </LinkButton>
                </div>
            </DevSection>

            <DevSection
                title="HeaderButton"
                note="A square icon button of the top bar. Its label is the accessible name and the tooltip."
            >
                <DevGrid>
                    <DevSample title="Usual and disabled">
                        <div class="dev-row">
                            <HeaderButton
                                label="Notifications"
                                onClick={() => setLog('Clicked notifications')}
                            >
                                <IconBell />
                            </HeaderButton>
                            <HeaderButton label="Theme">
                                <IconMoon />
                            </HeaderButton>
                            <HeaderButton label="New note" disabled>
                                <IconPencil />
                            </HeaderButton>
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection title="RemoveButton">
                <DevGrid>
                    <DevSample title="At the end of a row">
                        <ul class="dev-plain">
                            <For
                                each={files()}
                                fallback={<li class="muted">No files.</li>}
                            >
                                {(file) => (
                                    <li class="dev-row">
                                        <span>{file}</span>
                                        <RemoveButton
                                            label={`Delete ${file}`}
                                            onClick={() => {
                                                setFiles((all) =>
                                                    all.filter(
                                                        (f) => f !== file
                                                    )
                                                );
                                                setLog(`Removed ${file}`);
                                            }}
                                        />
                                    </li>
                                )}
                            </For>
                        </ul>
                        <div class="actions-row">
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    setFiles([
                                        'report.pdf',
                                        'logo.png',
                                        'a.csv',
                                    ])
                                }
                            >
                                Reset
                            </Button>
                        </div>
                    </DevSample>
                    <DevSample title="Disabled">
                        <div class="dev-row">
                            <span>locked.txt</span>
                            <RemoveButton
                                label="Delete locked.txt"
                                disabled
                                onClick={() => setLog('Never')}
                            />
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection title="Switch">
                <DevGrid>
                    <DevSample title="With a description">
                        <Switch
                            label="Email notifications"
                            description="Send me an email when a run fails."
                            checked={notify()}
                            onChange={setNotify}
                        />
                    </DevSample>
                    <DevSample title="Label only">
                        <Switch
                            label="Public profile"
                            checked={publicPage()}
                            onChange={setPublicPage}
                        />
                    </DevSample>
                    <DevSample title="Disabled, on and off">
                        <Switch
                            label="Saving (on)"
                            checked
                            disabled
                            onChange={() => {}}
                        />
                        <Switch
                            label="Saving (off)"
                            checked={false}
                            disabled
                            onChange={() => {}}
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="Tabs and NavTabs"
                note="Tabs: the arrows, Home and End move to a tab and select it. NavTabs are links (here, ?tab= on this page)."
            >
                <DevGrid wide>
                    <DevSample title="Tabs, with a label and an aside">
                        <Tabs
                            id="dev-tabs"
                            label="Package"
                            showLabel
                            value={tab()}
                            onChange={setTab}
                            tabs={tabs}
                            aside={<span class="muted">An aside</span>}
                        />
                        <div {...tabPanelProps('dev-tabs', tab())}>
                            <p>The panel of “{tab()}”.</p>
                        </div>
                    </DevSample>
                    <DevSample title="Tabs, label for screen readers only">
                        <Tabs
                            id="dev-tabs-hidden"
                            label="Run"
                            value={tab()}
                            onChange={setTab}
                            tabs={tabs}
                        />
                        <div {...tabPanelProps('dev-tabs-hidden', tab())}>
                            <p>The same value as the tabs above.</p>
                        </div>
                    </DevSample>
                    <DevSample title="NavTabs">
                        <NavTabs
                            label="Package parts"
                            value={navTab()}
                            tabs={tabs.map((t) => ({
                                ...t,
                                href: `/dev/buttons?tab=${t.value}`,
                            }))}
                        />
                        <p>The current part: {navTab()}.</p>
                    </DevSample>
                </DevGrid>
            </DevSection>
        </>
    );
}
