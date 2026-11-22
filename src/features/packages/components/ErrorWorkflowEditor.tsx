import { A } from '@solidjs/router';
import type { WorkflowPackage, WorkflowSummary } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Select from '@shared/ui/forms/Select';
import { createForm } from '@shared/ui/forms/form';
import SettingsCard from '@shared/ui/SettingsCard';
import { updatePackageMutation } from '@features/packages/api/packages';

/** Which workflow of the package starts when an automatic run fails. */
export default function ErrorWorkflowEditor(props: {
    pkg: WorkflowPackage;
    workflows: WorkflowSummary[];
}) {
    const t = useLocalizer('workflows');
    // A save in another card keeps an unsaved choice here: a field the
    // user changed does not follow the new package.
    // The id stays package-error-workflow: the field is `workflow`.
    const form = createForm({
        id: 'package-error',
        initial: () => ({ workflow: props.pkg.errorWorkflow ?? '' }),
        serverFields: { errorWorkflow: 'workflow' },
    });
    const updating = form.mutation(updatePackageMutation);
    const save = form.onSubmit((values) =>
        updating.run({
            pkg: props.pkg,
            patch: { errorWorkflow: values.workflow || null },
        })
    );

    return (
        <SettingsCard
            title={t('settings.errors', 'When a run fails')}
            description={t(
                'settings.errors_hint',
                'The workflow started when an automatic run fails.'
            )}
            onSubmit={save}
            hint={
                <>
                    {t('settings.error_needs', 'It needs an ErrorTrigger.')}{' '}
                    <A class="page-more" href="/docs/packages">
                        {t('ui.more', 'Read more')}
                    </A>
                </>
            }
            actions={
                <Button
                    type="submit"
                    variant="ghost"
                    busy={form.busy()}
                    disabled={!form.dirty()}
                >
                    {t('settings.save', 'Save')}
                </Button>
            }
        >
            <ErrorSummary {...form.summary} />
            <Select
                {...form.control('workflow')}
                label={t('settings.errors', 'When a run fails')}
                options={[
                    {
                        value: '',
                        label: t('settings.no_error_workflow', 'None'),
                    },
                    ...props.workflows.map((w) => ({
                        value: w.key,
                        label: w.name,
                    })),
                ]}
            />
        </SettingsCard>
    );
}
