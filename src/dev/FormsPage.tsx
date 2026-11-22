import { createSignal, Show } from 'solid-js';
import { mutationOptions } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import { FORM, type FormErrors } from '@shared/api/errors';
import type { ErrorItem } from '@shared/api/types';
import Checkbox from '@shared/ui/forms/Checkbox';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import RadioGroup from '@shared/ui/forms/RadioGroup';
import Select from '@shared/ui/forms/Select';
import TextArea from '@shared/ui/forms/TextArea';
import { createForm } from '@shared/ui/forms/form';
import Button from '@shared/ui/Button';
import FilePicker from '@shared/ui/FilePicker';
import Combobox from '@shared/ui/Combobox';
import Switch from '@shared/ui/Switch';
import { IconLock, IconUser } from '@shared/ui/icons';
import { DevGrid, DevLog, DevSample, DevSection } from './DevKit';

// Codes with no translation: the message shows as it is.
const error = (message: string): ErrorItem[] => [
    { code: 'dev_example', message },
];

const plans = [
    { value: 'free', label: 'Free', description: 'Three workflows.' },
    {
        value: 'team',
        label: 'Team',
        description: 'Shared packages and roles.',
    },
    {
        value: 'enterprise',
        label: 'Enterprise',
        description: 'Not for sale yet.',
        disabled: true,
    },
] as const;

type Plan = (typeof plans)[number]['value'];

const regions = [
    { value: 'eu', label: 'Europe' },
    { value: 'us', label: 'United States' },
    { value: 'ap', label: 'Asia Pacific', disabled: true },
] as const;

type Region = (typeof regions)[number]['value'];

const sizes = [
    { value: 's', label: 'Small' },
    { value: 'm', label: 'Medium' },
    { value: 'l', label: 'Large' },
];

const cities = ['Berlin', 'Chișinău', 'Lisbon', 'Oslo', 'Tokyo'].map(
    (city) => ({ value: city, label: city })
);

type Signup = {
    userName: string;
    region: Region;
    plan: Plan;
    bio: string;
    terms: boolean;
};

/**
 * A fake save, as a feature's description gives it; no request goes out.
 * "taken" is a taken username; "down" fails the whole form.
 */
const signupMutation = () =>
    mutationOptions({
        mutationFn: (values: Signup) =>
            new Promise<Signup>((resolve, reject) =>
                setTimeout(() => {
                    if (values.userName.trim() === 'taken')
                        reject(
                            new ApiError(
                                [
                                    {
                                        code: 'dev_example',
                                        message: 'This username is taken.',
                                        field: 'userName',
                                    },
                                ],
                                409
                            )
                        );
                    else if (values.userName.trim() === 'down')
                        reject(
                            new ApiError(
                                [
                                    {
                                        code: 'dev_example',
                                        message:
                                            'The server did not answer. Try again.',
                                    },
                                ],
                                503
                            )
                        );
                    else resolve(values);
                }, 600)
            ),
    });

/** A whole form on createForm: bindings, check, server errors, done. */
function CreateFormSample() {
    const form = createForm({
        id: 'dev-signup',
        initial: (): Signup => ({
            userName: '',
            region: 'eu',
            plan: 'free',
            bio: '',
            terms: false,
        }),
        check: (v) => ({
            userName: v.userName.trim() ? undefined : 'Enter a username.',
            terms: v.terms ? undefined : 'Accept the terms to go on.',
        }),
    });
    const signup = form.mutation(signupMutation);
    const save = form.onSubmit((values) => signup.run(values));

    return (
        <form class="vert-form" onSubmit={save} noValidate>
            <ErrorSummary {...form.summary} />
            <Field
                {...form.input('userName')}
                label="Username (try “taken” or “down”)"
                showLabel
                autocomplete="off"
            />
            <Select
                {...form.control('region')}
                label="Region"
                showLabel
                options={regions}
            />
            <RadioGroup
                {...form.control('plan')}
                legend="Plan"
                showLegend
                options={plans}
            />
            <TextArea
                {...form.input('bio')}
                label="About you"
                showLabel
                rows={3}
            />
            <Checkbox {...form.toggle('terms')} label="I accept the terms" />
            <div class="actions-row">
                <Button
                    type="submit"
                    busy={form.busy()}
                    disabled={!form.dirty()}
                >
                    Sign up
                </Button>
                <Button
                    variant="ghost"
                    disabled={!form.dirty() || form.busy()}
                    onClick={() => form.reset()}
                >
                    Reset
                </Button>
                <span class="muted" role="status">
                    {form.done() ? 'Signed up' : ''}
                </span>
            </div>
        </form>
    );
}

/** The form controls, with the server's errors on or off. */
export default function FormsPage() {
    const [showErrors, setShowErrors] = createSignal(false);
    const [userName, setUserName] = createSignal('');
    const [bio, setBio] = createSignal('');
    const [region, setRegion] = createSignal<Region>('eu');
    const [terms, setTerms] = createSignal(false);
    const [news, setNews] = createSignal(true);
    const [plan, setPlan] = createSignal<Plan>('free');
    const [alerts, setAlerts] = createSignal(false);
    const [size, setSize] = createSignal<string | undefined>('m');
    const [city, setCity] = createSignal<string | undefined>(undefined);
    const [log, setLog] = createSignal('');
    const [picking, setPicking] = createSignal(false);

    const errs = (message: string) =>
        showErrors() ? error(message) : undefined;
    const summary = (): FormErrors =>
        showErrors()
            ? {
                  [FORM]: [
                      ...error('The server did not answer. Try again.'),
                      ...error('A second error about the whole form.'),
                  ],
              }
            : {};

    function pick(file: File) {
        setPicking(true);
        setLog(`Picked ${file.name} (${file.size} bytes)`);
        setTimeout(() => setPicking(false), 800);
    }

    return (
        <>
            <Switch
                label="Show errors"
                description="Gives each control the server's errors. ErrorSummary takes the focus when its errors show."
                checked={showErrors()}
                onChange={setShowErrors}
            />
            <DevLog>{log()}</DevLog>

            <DevSection title="ErrorSummary">
                <DevGrid wide>
                    <DevSample title="Errors about no field">
                        <ErrorSummary errors={summary()} />
                        <Show when={!showErrors()}>
                            <p class="muted">Nothing shows without errors.</p>
                        </Show>
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection title="Field">
                <DevGrid>
                    <DevSample title="Label above">
                        <Field
                            id="dev-forms-username"
                            name="userName"
                            label="Username"
                            showLabel
                            autocomplete="off"
                            value={userName()}
                            onInput={(e) => setUserName(e.currentTarget.value)}
                            errors={errs('This username is taken.')}
                        />
                    </DevSample>
                    <DevSample title="Label as placeholder, with an icon">
                        <Field
                            id="dev-forms-login"
                            name="login"
                            label="Email or username"
                            icon={IconUser}
                            errors={errs('Enter your email or username.')}
                        />
                        <Field
                            id="dev-forms-password"
                            name="password"
                            type="password"
                            label="Password"
                            icon={IconLock}
                            errors={errs('The password is too short.')}
                        />
                    </DevSample>
                    <DevSample title="Disabled">
                        <Field
                            id="dev-forms-disabled"
                            name="disabled"
                            label="Read-only value"
                            showLabel
                            value="Cannot change"
                            disabled
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection title="TextArea">
                <DevGrid wide>
                    <DevSample title="Label above">
                        <TextArea
                            id="dev-forms-bio"
                            label="About you"
                            showLabel
                            rows={4}
                            placeholder="A few words"
                            value={bio()}
                            onInput={(e) => setBio(e.currentTarget.value)}
                            errors={errs('The text is too long.')}
                        />
                    </DevSample>
                    <DevSample title="Disabled, label hidden">
                        <TextArea
                            id="dev-forms-bio-disabled"
                            label="Notes"
                            rows={3}
                            value="Saving…"
                            disabled
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection title="Select">
                <DevGrid>
                    <DevSample title="Label above">
                        <Select
                            id="dev-forms-region"
                            label="Region"
                            showLabel
                            value={region()}
                            onChange={setRegion}
                            options={regions}
                            errors={errs('This region is full.')}
                        />
                    </DevSample>
                    <DevSample title="Disabled">
                        <Select
                            id="dev-forms-region-disabled"
                            label="Region (disabled)"
                            showLabel
                            value="us"
                            onChange={() => {}}
                            options={regions}
                            disabled
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="Checkbox"
                note="A card for an option of a form. A setting that saves at once is a Switch."
            >
                <DevGrid>
                    <DevSample title="With a description and errors">
                        <Checkbox
                            id="dev-forms-terms"
                            label="I accept the terms"
                            description="You can read them on the Terms page."
                            checked={terms()}
                            onChange={setTerms}
                            errors={errs('Accept the terms to go on.')}
                        />
                    </DevSample>
                    <DevSample title="Label only, and with a badge">
                        <Checkbox
                            label="Send me the newsletter"
                            checked={news()}
                            onChange={setNews}
                        />
                        <Checkbox
                            label={
                                <>
                                    deploy.yaml <span class="badge">main</span>
                                </>
                            }
                            checked={false}
                            onChange={() => {}}
                        />
                    </DevSample>
                    <DevSample title="Disabled, on and off">
                        <Checkbox
                            label="Locked on"
                            checked
                            disabled
                            onChange={() => {}}
                        />
                        <Checkbox
                            label="Locked off"
                            checked={false}
                            disabled
                            onChange={() => {}}
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="RadioGroup"
                note="Its errors show under the options. The group takes the focus from an ErrorSummary."
            >
                <DevGrid wide>
                    <DevSample title="Legend above, an option disabled, errors">
                        <RadioGroup
                            id="dev-forms-plan"
                            legend="Plan"
                            showLegend
                            name="plan"
                            value={plan()}
                            onChange={setPlan}
                            options={plans}
                            errors={errs('Choose a plan you can pay for.')}
                        />
                    </DevSample>
                    <DevSample title="All disabled, legend hidden">
                        <RadioGroup
                            legend="Plan (disabled)"
                            name="plan-disabled"
                            value="team"
                            onChange={() => {}}
                            options={plans}
                            disabled
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="Switch and Combobox"
                note="They take a form binding too: id, name and errors. The errors show under the control, wired with aria-invalid and aria-describedby."
            >
                <DevGrid>
                    <DevSample title="Switch with errors">
                        <Switch
                            id="dev-forms-alerts"
                            name="alerts"
                            label="Email me when a run fails"
                            description="At most one email an hour."
                            checked={alerts()}
                            onChange={setAlerts}
                            errors={errs('Add an email address first.')}
                        />
                    </DevSample>
                    <DevSample title="Combobox, select-only, with errors">
                        <label id="dev-forms-size-label" class="field-label">
                            Size
                        </label>
                        <Combobox
                            id="dev-forms-size"
                            name="size"
                            labelledBy="dev-forms-size-label"
                            options={sizes}
                            value={size()}
                            onChange={setSize}
                            errors={errs('This size is sold out.')}
                        />
                    </DevSample>
                    <DevSample title="Combobox, editable, with errors">
                        <label
                            id="dev-forms-city-label"
                            for="dev-forms-city"
                            class="field-label"
                        >
                            City
                        </label>
                        <Combobox
                            editable
                            id="dev-forms-city"
                            name="city"
                            labelledBy="dev-forms-city-label"
                            options={cities}
                            value={city()}
                            onChange={setCity}
                            placeholder="Type a city"
                            noResults="Nothing found"
                            errors={errs('We do not ship to this city.')}
                        />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="createForm"
                note="A form from @shared/ui/forms/form: the bindings spread on the controls, check in the browser, the server's errors, reset and done."
            >
                <DevGrid wide>
                    <DevSample title="Sign up (a fake save)">
                        <CreateFormSample />
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="FilePicker"
                note="Opens the file dialog. The same file can be picked again."
            >
                <DevGrid>
                    <DevSample title="Primary and ghost">
                        <div class="actions-row">
                            <FilePicker onPick={pick} busy={picking()}>
                                Upload a file
                            </FilePicker>
                            <FilePicker
                                variant="ghost"
                                accept="image/png,image/jpeg"
                                onPick={pick}
                            >
                                Choose an image
                            </FilePicker>
                        </div>
                    </DevSample>
                    <DevSample title="Busy and disabled">
                        <div class="actions-row">
                            <FilePicker busy onPick={pick}>
                                Uploading
                            </FilePicker>
                            <FilePicker disabled onPick={pick}>
                                Disabled
                            </FilePicker>
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>
        </>
    );
}
