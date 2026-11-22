import { Show } from 'solid-js';
import { IconPencil, IconPlus } from '@shared/ui/icons';
import type { Workflow } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import Modal from '@shared/ui/Modal';
import { Cell, Row, Table } from '@shared/ui/Table';
import RemoveButton from '@shared/ui/RemoveButton';
import TimeZoneField from '@shared/ui/forms/TimeZoneField';
import { createForm } from '@shared/ui/forms/form';
import { updateWorkflowMutation } from '@features/packages/api/workflows';
import {
    addTrigger,
    setParams,
    setTimeZone,
} from '@features/packages/program-edit';
import { useProgramSave } from '@features/packages/program-save';

type Schedule = Workflow['schedules'][number];

/**
 * A workflow's schedules (its ScheduleTriggers) as a table: the cron, the
 * zone it is read in, when it fires next; adding one (it starts the
 * workflow where its other triggers do), editing or deleting one.
 */
export default function ScheduleTable(props: { workflow: Workflow }) {
    const t = useLocalizer('workflows');
    const date = useDateFormat();
    // Editing: null, closed; 'new', adding; a schedule, editing it.
    const { editing, setEditing, deletion } = useProgramSave<
        Schedule,
        Schedule | 'new'
    >(() => props.workflow);

    // Read in render: the namespace may arrive after the first one.
    const column = () => ({
        cron: t('schedule.cron', 'Schedule'),
        zone: t('ui.time_zone', 'Time zone'),
        next: t('schedule.next', 'Next run'),
        actions: t('ui.actions', 'Actions'),
    });

    return (
        <section class="workflow-panel">
            <div class="workflow-panel-head">
                <p class="muted">
                    {t(
                        'schedule.lead',
                        'When it runs on its own, while it is on.'
                    )}
                </p>
                <Button variant="ghost" onClick={() => setEditing('new')}>
                    <IconPlus />
                    {t('schedule.add', 'Add a schedule')}
                </Button>
            </div>
            <Table
                data={props.workflow.schedules}
                headers={Object.values(column())}
                placeholder={() => <>{t('schedule.none', 'No schedules.')}</>}
                tableProps={{ class: 'workflow-table' }}
                render={({ item: schedule }) => (
                    <Row>
                        <Cell label={column().cron}>
                            <code class="workflow-code">{schedule.cron}</code>
                        </Cell>
                        <Cell label={column().zone} text={schedule.timeZone} />
                        <Cell label={column().next}>
                            {date(schedule.nextRunAt)}
                        </Cell>
                        <Cell
                            label={column().actions}
                            props={{ class: 'actions' }}
                        >
                            <span class="workflow-actions-cell">
                                <Button
                                    variant="icon"
                                    aria-label={t(
                                        'schedule.edit',
                                        'Edit the schedule'
                                    )}
                                    title={t(
                                        'schedule.edit',
                                        'Edit the schedule'
                                    )}
                                    disabled={deletion.busy()}
                                    onClick={() => setEditing(schedule)}
                                >
                                    <IconPencil />
                                </Button>
                                <RemoveButton
                                    label={t(
                                        'schedule.delete',
                                        'Delete the schedule'
                                    )}
                                    disabled={deletion.busy()}
                                    onClick={() => deletion.ask(schedule)}
                                />
                            </span>
                        </Cell>
                    </Row>
                )}
            />

            <Modal
                open={!!editing()}
                title={
                    editing() === 'new'
                        ? t('schedule.add', 'Add a schedule')
                        : t('schedule.edit', 'Edit the schedule')
                }
                onClose={() => setEditing(null)}
            >
                <Show when={editing()}>
                    {(target) => (
                        <ScheduleForm
                            workflow={props.workflow}
                            target={target()}
                            onSaved={() => setEditing(null)}
                        />
                    )}
                </Show>
            </Modal>
            <ConfirmDialog
                {...deletion.dialog}
                title={t('schedule.delete_title', 'Delete this schedule?')}
                confirm={t('ui.delete', 'Delete')}
            >
                {t(
                    'schedule.delete_body',
                    'It stops running the workflow. It is a change of the workflow, saved as a new version.'
                )}
            </ConfirmDialog>
        </section>
    );
}

/** A new schedule or one to edit, and the zone of all; it saves the program. */
function ScheduleForm(props: {
    workflow: Workflow;
    target: Schedule | 'new';
    onSaved: () => void;
}) {
    const t = useLocalizer('workflows');
    const form = createForm({
        id: 'schedule',
        initial: () => ({
            cron: props.target === 'new' ? '' : props.target.cron,
            zone: props.workflow.program.settings.timeZone ?? '',
        }),
    });
    const updating = form.mutation(updateWorkflowMutation);
    const save = form.onSubmit(({ cron, zone }) => {
        const target = props.target;
        let program = setTimeZone(props.workflow.program, zone);
        program =
            target === 'new'
                ? addTrigger(program, 'ScheduleTrigger', { cron: cron.trim() })
                : setParams(program, target.blockId, { cron: cron.trim() });
        return updating.run(
            { workflow: props.workflow, changes: { program } },
            () => props.onSaved()
        );
    });

    return (
        <form class="vert-form" noValidate onSubmit={save}>
            <ErrorSummary {...form.summary} />
            <Field
                {...form.input('cron')}
                label={t(
                    'schedule.cron_label',
                    'Cron (minute hour day month weekday)'
                )}
                showLabel
                type="text"
                spellcheck={false}
                autocomplete="off"
                placeholder="0 9 * * 1-5"
            />
            <p class="muted package-hint">
                {t(
                    'schedule.cron_hint',
                    '“0 9 * * 1-5”: weekdays at 9:00; “*/15 * * * *”: every 15 minutes.'
                )}
            </p>
            <TimeZoneField
                {...form.control('zone')}
                label={t(
                    'schedule.zone_label',
                    'Time zone (all its schedules)'
                )}
                showLabel
                optional
                placeholder={t('schedule.zone_yours', 'Yours')}
            />
            <Button
                type="submit"
                busy={form.busy()}
                disabled={!form.values.cron.trim()}
            >
                {t('settings.save', 'Save')}
            </Button>
        </form>
    );
}
