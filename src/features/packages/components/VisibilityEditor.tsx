import type { PackageVisibility, WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import RadioGroup from '@shared/ui/forms/RadioGroup';
import { createForm } from '@shared/ui/forms/form';
import SettingsCard from '@shared/ui/SettingsCard';
import { updatePackageMutation } from '@features/packages/api/packages';
import VisibilityBadge from './VisibilityBadge';

const VISIBILITIES: PackageVisibility[] = ['Private', 'Unlisted', 'Public'];

/** Who sees a package: one of three, saved on its own. */
export default function VisibilityEditor(props: { pkg: WorkflowPackage }) {
    const t = useLocalizer('packages');
    const tw = useLocalizer('workflows');
    // A save in another card keeps an unsaved choice here: a field the
    // user changed does not follow the new package.
    const form = createForm({
        id: 'package',
        initial: () => ({ visibility: props.pkg.visibility }),
    });
    const updating = form.mutation(updatePackageMutation);
    const save = form.onSubmit((values) =>
        updating.run({ pkg: props.pkg, patch: values })
    );

    return (
        <SettingsCard
            title={tw('settings.visibility', 'Visibility')}
            badge={<VisibilityBadge visibility={props.pkg.visibility} />}
            onSubmit={save}
            hint={tw(
                'settings.visibility_hint',
                'Others see published versions only.'
            )}
            actions={
                <Button
                    type="submit"
                    variant="ghost"
                    busy={form.busy()}
                    disabled={!form.dirty()}
                >
                    {tw('settings.save', 'Save')}
                </Button>
            }
        >
            <ErrorSummary {...form.summary} />
            <RadioGroup
                {...form.control('visibility')}
                legend={t('editor.visibility', 'Who sees it')}
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
