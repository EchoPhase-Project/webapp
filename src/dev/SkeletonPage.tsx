import { createSignal, For } from 'solid-js';
import Button from '@shared/ui/Button';
import Card from '@shared/ui/Card';
import PageHeader from '@shared/ui/PageHeader';
import PageSkeleton, { type PageSkeletonForm } from '@shared/ui/PageSkeleton';
import SettingsCard from '@shared/ui/SettingsCard';
import {
    SkeletonBlock,
    SkeletonScope,
    SkeletonText,
} from '@shared/ui/Skeleton';
import Switch from '@shared/ui/Switch';
import { Cell, Row, Table } from '@shared/ui/Table';
import { DevGrid, DevSample, DevSection } from './DevKit';

type Session = { id: string; device: string; seen: string };

const SESSIONS: Session[] = [
    { id: 's1', device: 'Firefox on Linux', seen: 'Now' },
    { id: 's2', device: 'echophase-cli', seen: '2 hours ago' },
];

const FORMS: { form: PageSkeletonForm; pages: string }[] = [
    { form: 'header', pages: 'Home, sign-in, old workflow addresses' },
    { form: 'table', pages: 'Files, Sessions, API clients' },
    { form: 'cards', pages: 'Explore, Notes' },
    { form: 'list', pages: 'Packages' },
    { form: 'settings', pages: 'Profile' },
    { form: 'detail', pages: 'About, one package, one workflow' },
    { form: 'document', pages: 'Terms, Privacy, Docs' },
];

/** The loading form of the shared components, and the shapes of pages. */
export default function SkeletonPage() {
    const [loading, setLoading] = createSignal(true);

    return (
        <>
            <Switch
                label="Loading"
                description="On: the samples are in a SkeletonScope that loads. Off: the same samples with their data."
                checked={loading()}
                onChange={setLoading}
            />

            <SkeletonScope when={loading()}>
                <DevSection
                    title="PageHeader"
                    note="Keeps each text it has and a real h1; a bar in place of an empty text. The actions keep their room."
                >
                    <DevGrid wide>
                        <DevSample title="A static title">
                            <PageHeader
                                eyebrow="Settings"
                                title="Active sessions"
                                description="The devices signed in to your account."
                                actions={<Button>Revoke all</Button>}
                            />
                        </DevSample>
                        <DevSample title="A title from the data">
                            <PageHeader
                                eyebrow="Package"
                                title={loading() ? '' : 'deploy-tools'}
                                description={
                                    loading()
                                        ? ''
                                        : 'Workflows that deploy the app.'
                                }
                            />
                        </DevSample>
                    </DevGrid>
                </DevSection>

                <DevSection
                    title="Table"
                    note="The header row stays; rows of bars in the same columns (cards on a phone), never the empty text."
                >
                    <Table
                        data={loading() ? [] : SESSIONS}
                        headers={['Device', 'Last seen']}
                        placeholder={() => <>No sessions.</>}
                        render={({ item }) => (
                            <Row>
                                <Cell label="Device" text={item.device} />
                                <Cell label="Last seen" text={item.seen} />
                            </Row>
                        )}
                    />
                </DevSection>

                <DevSection
                    title="Card and SettingsCard"
                    note="The frame stays; bars in place of the content. SettingsCard keeps its title and hides its action."
                >
                    <DevGrid wide>
                        <Card>
                            <p>A card with its content.</p>
                        </Card>
                        <SettingsCard
                            title="Time zone"
                            description="Times show in this zone."
                            hint="It applies at once."
                            actions={<Button>Save</Button>}
                        >
                            <p>Europe/Chisinau</p>
                        </SettingsCard>
                    </DevGrid>
                </DevSection>
            </SkeletonScope>

            <DevSection
                title="SkeletonText and SkeletonBlock"
                note="Bars with the line height of the text around them; still under prefers-reduced-motion."
            >
                <DevGrid>
                    <DevSample title="Three lines, last 40%">
                        <SkeletonText lines={3} width="40%" />
                    </DevSample>
                    <DevSample title="In a large heading">
                        <p class="dev-skeleton-large">
                            <SkeletonText width="12em" />
                        </p>
                    </DevSample>
                    <DevSample title="Blocks">
                        <div class="actions-row">
                            <SkeletonBlock round />
                            <SkeletonBlock width="6rem" height="4rem" />
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="Page shapes"
                note="What lazyPage shows in <main> while a page's code loads (after 200 ms): the skeleton option in src/app/pages.ts."
            >
                <DevGrid wide>
                    <For each={FORMS}>
                        {(item) => (
                            <DevSample title={`'${item.form}': ${item.pages}`}>
                                <PageSkeleton form={item.form} />
                            </DevSample>
                        )}
                    </For>
                </DevGrid>
            </DevSection>
        </>
    );
}
