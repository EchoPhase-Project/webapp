import { createSignal, Show } from 'solid-js';
import { IconPencil, IconPlus } from '@shared/ui/icons';
import type { FormErrors } from '@shared/api/errors';
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
    const {
        busy,
        errors,
        save,
        remove,
        editing,
        setEditing,
        setDeleting,
        deleting,
    } = useProgramSave<Schedule, Schedule | 'new'>(() => props.workflow);

    async function submit(cron: string, zone: string) {
        const target = editing();
        let program = setTimeZone(props.workflow.program, zone);
        program =
            target === 'new'
                ? addTrigger(program, 'ScheduleTrigger', { cron: cron.trim() })
                : target
                  ? setParams(program, target.blockId, { cron: cron.trim() })
                  : program;
        if (await save(program)) setEditing(null);
    }

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
            <Show when={!editing() && !deleting()}>
                <ErrorSummary errors={errors()} />
            </Show>
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
                                    disabled={busy()}
                                    onClick={() => setEditing(schedule)}
                                >
                                    <IconPencil />
                                </Button>
                                <RemoveButton
                                    label={t(
                                        'schedule.delete',
                                        'Delete the schedule'
                                    )}
                                    disabled={busy()}
                                    onClick={() => setDeleting(schedule)}
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
                            cron={
                                target() === 'new'
                                    ? ''
                                    : (target() as Schedule).cron
                            }
                            zone={
                                props.workflow.program.settings.timeZone ?? ''
                            }
                            busy={busy()}
                            errors={errors()}
                            onSave={(cron, zone) => void submit(cron, zone)}
                        />
                    )}
                </Show>
            </Modal>
            <ConfirmDialog
                item={deleting()}
                title={t('schedule.delete_title', 'Delete this schedule?')}
                confirm={t('ui.delete', 'Delete')}
                busy={busy()}
                errors={errors()}
                onConfirm={(schedule) => void remove(schedule)}
                onCancel={() => setDeleting(null)}
            >
                {t(
                    'schedule.delete_body',
                    'It stops running the workflow. It is a change of the workflow, saved as a new version.'
                )}
            </ConfirmDialog>
        </section>
    );
}

function ScheduleForm(props: {
    cron: string;
    zone: string;
    busy: boolean;
    errors: FormErrors;
    onSave: (cron: string, zone: string) => void;
}) {
    const t = useLocalizer('workflows');
    /* eslint-disable solid/reactivity */
    const [cron, setCron] = createSignal(props.cron);
    const [zone, setZone] = createSignal(props.zone);
    /* eslint-enable solid/reactivity */
    return (
        <form
            class="vert-form"
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                props.onSave(cron(), zone());
            }}
        >
            <ErrorSummary
                errors={props.errors}
                inputId={() => 'schedule-cron'}
            />
            <Field
                id="schedule-cron"
                name="cron"
                label={t(
                    'schedule.cron_label',
                    'Cron (minute hour day month weekday)'
                )}
                showLabel
                type="text"
                spellcheck={false}
                autocomplete="off"
                placeholder="0 9 * * 1-5"
                disabled={props.busy}
                value={cron()}
                onInput={(e) => setCron(e.currentTarget.value)}
            />
            <p class="muted package-hint">
                {t(
                    'schedule.cron_hint',
                    '“0 9 * * 1-5”: weekdays at 9:00; “*/15 * * * *”: every 15 minutes.'
                )}
            </p>
            <TimeZoneField
                id="schedule-zone"
                name="timeZone"
                label={t(
                    'schedule.zone_label',
                    'Time zone (all its schedules)'
                )}
                showLabel
                placeholder={t('schedule.zone_yours', 'Yours')}
                disabled={props.busy}
                value={zone()}
                onInput={(e) => setZone(e.currentTarget.value)}
            />
            <Button type="submit" busy={props.busy} disabled={!cron().trim()}>
                {t('settings.save', 'Save')}
            </Button>
        </form>
    );
}
