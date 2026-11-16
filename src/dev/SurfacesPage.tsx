import { createSignal } from 'solid-js';
import { ApiError } from '@shared/api/client';
import BackLink from '@shared/ui/BackLink';
import Button from '@shared/ui/Button';
import Card from '@shared/ui/Card';
import EmptyState from '@shared/ui/EmptyState';
import Field from '@shared/ui/forms/Field';
import LoadError from '@shared/ui/LoadError';
import Masonry from '@shared/ui/Masonry';
import PageHeader from '@shared/ui/PageHeader';
import SettingsCard from '@shared/ui/SettingsCard';
import { SkeletonScope } from '@shared/ui/Skeleton';
import { DevGrid, DevLog, DevSample, DevSection } from './DevKit';

const apiError = new ApiError(
    [
        {
            code: 'dev_example',
            message: 'The package is not there any more.',
        },
    ],
    404
);

const notes = [
    'A short note.',
    'A longer note that takes two or three lines, so that the cards have different heights.',
    'Medium length: one line and a bit more.',
    'Short.',
    'The longest note of all. It goes on and on, to show that Masonry packs the cards without gaps, in reading order: left to right, then down. The Tab key goes the same way.',
    'Another short one.',
    'Two lines of text, more or less, on a wide screen.',
];

/** The surfaces a page is made of, in their variants. */
export default function SurfacesPage() {
    const [log, setLog] = createSignal('');
    const [retrying, setRetrying] = createSignal(false);
    const [name, setName] = createSignal('deploy-tools');

    function retry() {
        setRetrying(true);
        setTimeout(() => {
            setRetrying(false);
            setLog('Asked again (it fails again)');
        }, 800);
    }

    return (
        <>
            <DevLog>{log()}</DevLog>

            <DevSection title="Card">
                <DevGrid>
                    <Card>
                        <p>
                            A card: one thing (a notice, a panel), set off by a
                            shadow.
                        </p>
                    </Card>
                    <Card patterned>
                        <p>A patterned card: only for brand areas.</p>
                    </Card>
                </DevGrid>
            </DevSection>

            <DevSection title="SettingsCard">
                <div class="page-stack">
                    <SettingsCard
                        title="Plain"
                        description="A title, a line on what it is, and its content."
                    >
                        <p>The content.</p>
                    </SettingsCard>
                    <SettingsCard
                        title="As a form"
                        badge={<span class="badge">Beta</span>}
                        description="With onSubmit it is a form; the action submits it."
                        hint={
                            <>
                                A short hint. <a href="/docs">Read more</a>
                            </>
                        }
                        actions={<Button type="submit">Save</Button>}
                        onSubmit={(e) => {
                            e.preventDefault();
                            setLog(`Saved the name “${name()}”`);
                        }}
                    >
                        <Field
                            id="dev-surfaces-name"
                            name="name"
                            label="Name"
                            showLabel
                            value={name()}
                            onInput={(e) => setName(e.currentTarget.value)}
                        />
                    </SettingsCard>
                    <SettingsCard
                        title="Hint only"
                        description="The footer shows with a hint and no action."
                        hint="Changes save at once."
                    />
                    <SettingsCard
                        title="Delete the package"
                        description="Danger: what cannot be undone."
                        danger
                        hint="The workflows and runs go too."
                        actions={
                            <Button
                                variant="danger-outline"
                                onClick={() => setLog('Clicked delete')}
                            >
                                Delete
                            </Button>
                        }
                    />
                </div>
            </DevSection>

            <DevSection title="EmptyState">
                <DevGrid>
                    <EmptyState>No workflows yet.</EmptyState>
                    <EmptyState
                        action={
                            <Button onClick={() => setLog('Clicked new')}>
                                New workflow
                            </Button>
                        }
                    >
                        No workflows yet. Make the first one.
                    </EmptyState>
                </DevGrid>
            </DevSection>

            <DevSection title="LoadError">
                <DevGrid wide>
                    <DevSample title="The API's error">
                        <LoadError
                            error={apiError}
                            busy={retrying()}
                            onRetry={retry}
                        />
                    </DevSample>
                    <DevSample title="Anything else: a network error">
                        <LoadError
                            error={new Error('fetch failed')}
                            onRetry={retry}
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="PageHeader and BackLink"
                note="Each page starts with a PageHeader (this page has one). The sample below has every part."
            >
                <Card>
                    <div class="page-stack">
                        <BackLink href="/dev" label="Back to the packages" />
                        <PageHeader
                            eyebrow="Packages"
                            title="deploy-tools"
                            description="A sample header with every part."
                            docs="packages"
                            meta="Updated 3 days ago · 12 runs"
                            actions={<Button>Run now</Button>}
                        />
                    </div>
                </Card>
            </DevSection>

            <DevSection
                title="Loading forms"
                note="In a SkeletonScope that loads, Card, SettingsCard and PageHeader keep their frame and show bars for what is not there yet. Each one, with a switch, is on /dev/skeleton."
            >
                <SkeletonScope when>
                    <DevGrid>
                        <Card>
                            <p>Content</p>
                        </Card>
                        <SettingsCard
                            title="Details"
                            actions={<Button>Save</Button>}
                        >
                            <p>Content</p>
                        </SettingsCard>
                    </DevGrid>
                </SkeletonScope>
            </DevSection>

            <DevSection
                title="Masonry"
                note="Cards of different heights, as many columns as fit."
            >
                <Masonry each={notes}>
                    {(note, index) => (
                        <Card class="dev-masonry-card">
                            <p>
                                <strong>Note {index() + 1}</strong>
                            </p>
                            <p>{note}</p>
                        </Card>
                    )}
                </Masonry>
            </DevSection>
        </>
    );
}
