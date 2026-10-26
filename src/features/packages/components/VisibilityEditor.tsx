import { createEffect, createSignal, For } from 'solid-js';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { PackageVisibility, WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import { inputOf, updatePackage } from '@features/packages/api';
import SettingsCard from './SettingsCard';
import VisibilityBadge from './VisibilityBadge';

const VISIBILITIES: PackageVisibility[] = ['Private', 'Unlisted', 'Public'];

/** Who sees a package: one of three, saved on its own. */
export default function VisibilityEditor(props: {
    pkg: WorkflowPackage;
    onSaved: (pkg: WorkflowPackage) => void;
}) {
    const t = useLocalizer('packages');
    const tw = useLocalizer('workflows');
    const [visibility, setVisibility] =
        createSignal<PackageVisibility>('Private');
    createEffect(() => setVisibility(props.pkg.visibility));
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    async function save(e: Event) {
        e.preventDefault();
        setBusy(true);
        try {
            const result = await updatePackage(props.pkg.id, {
                ...inputOf(props.pkg),
                visibility: visibility(),
            });
            if (!result.ok) {
                setErrors(groupErrors(result.errors, ['visibility']));
                return;
            }
            setErrors({});
            props.onSaved(result.data);
        } finally {
            setBusy(false);
        }
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
            <fieldset id="package-visibility" class="choices">
                <legend class="visually-hidden">
                    {t('editor.visibility', 'Who sees it')}
                </legend>
                <For each={VISIBILITIES}>
                    {(option) => (
                        <label class="choice">
                            <input
                                type="radio"
                                name="visibility"
                                value={option}
                                checked={visibility() === option}
                                disabled={busy()}
                                onChange={() => setVisibility(option)}
                            />
                            <span class="choice-text">
                                <strong>
                                    {t(`visibility.${option}`, option)}
                                </strong>
                                <span class="muted">
                                    {
                                        {
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
                                        }[option]
                                    }
                                </span>
                            </span>
                        </label>
                    )}
                </For>
            </fieldset>
        </SettingsCard>
    );
}
