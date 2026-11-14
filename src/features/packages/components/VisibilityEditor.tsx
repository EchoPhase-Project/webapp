import { createEffect, createSignal } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import type { PackageVisibility, WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import RadioGroup from '@shared/ui/RadioGroup';
import SettingsCard from '@shared/ui/SettingsCard';
import { updatePackageMutation } from '@features/packages/api/packages';
import VisibilityBadge from './VisibilityBadge';

const VISIBILITIES: PackageVisibility[] = ['Private', 'Unlisted', 'Public'];

/** Who sees a package: one of three, saved on its own. */
export default function VisibilityEditor(props: { pkg: WorkflowPackage }) {
    const t = useLocalizer('packages');
    const tw = useLocalizer('workflows');
    const [visibility, setVisibility] =
        createSignal<PackageVisibility>('Private');
    createEffect(() => setVisibility(props.pkg.visibility));
    const { busy, errors, mutation } = createSubmit(['visibility']);
    const updating = mutation(updatePackageMutation);

    async function save(e: Event) {
        e.preventDefault();
        await updating.run({
            pkg: props.pkg,
            patch: { visibility: visibility() },
        });
    }

    return (
        <SettingsCard
            title={tw('settings.visibility', 'Visibility')}
            badge={<VisibilityBadge visibility={props.pkg.visibility} />}
            onSubmit={(e) => void save(e)}
            hint={tw(
                'settings.visibility_hint',
                'Others see published versions only.'
            )}
            actions={
                <Button
                    type="submit"
                    variant="ghost"
                    busy={busy()}
                    disabled={visibility() === props.pkg.visibility}
                >
                    {tw('settings.save', 'Save')}
                </Button>
            }
        >
            <ErrorSummary
                errors={errors()}
                inputId={() => 'package-visibility'}
            />
            <RadioGroup
                id="package-visibility"
                legend={t('editor.visibility', 'Who sees it')}
                name="visibility"
                value={visibility()}
                onChange={setVisibility}
                disabled={busy()}
                options={VISIBILITIES.map((option) => ({
                    value: option,
                    label: t(`visibility.${option}`, option),
                    description: {
                        Private: t(
                            'visibility.Private_hint',
                            'You and the people you share it with'
                        ),
                        Unlisted: t(
                            'visibility.Unlisted_hint',
                            'Anyone signed in who has the link'
                        ),
                        Public: t(
                            'visibility.Public_hint',
                            'Everyone, listed in Explore'
                        ),
                    }[option],
                }))}
            />
        </SettingsCard>
    );
}
