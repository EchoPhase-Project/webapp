// @vitest-environment jsdom
import { createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { mutationOptions } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import { FORM } from '@shared/api/errors';
import type { ErrorItem } from '@shared/api/types';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { renderPage, withSession } from '@shared/testing/render-page';
import Checkbox from './Checkbox';
import ErrorSummary from './ErrorSummary';
import Field from './Field';
import RadioGroup from './RadioGroup';
import { createForm, orNull, same, type Form } from './form';

type Plan = 'free' | 'team';
type Values = {
    name: string;
    newPassword: string;
    plan: Plan;
    news: boolean;
    tags: string[];
};

const saved = (over: Partial<Values> = {}): Values => ({
    name: 'Ann',
    newPassword: '',
    plan: 'free',
    news: false,
    tags: ['a'],
    ...over,
});

const plans = [
    { value: 'free', label: 'Free' },
    { value: 'team', label: 'Team' },
] as const;

const refusal = (...items: ErrorItem[]) => new ApiError(items, 400);

/** A promise that the test settles. */
function later<T>() {
    let settle: { ok: (value: T) => void; fail: (e: unknown) => void } = {
        ok: () => {},
        fail: () => {},
    };
    const promise = new Promise<T>((ok, fail) => (settle = { ok, fail }));
    return { promise, ...settle };
}

/**
 * A sample form with each kind of binding. `save` answers the send; the
 * form comes back through `made`, for the test to drive.
 */
function renderSample(
    options: {
        initial?: () => Values;
        save?: (values: Values) => Promise<Values>;
        check?: Parameters<typeof createForm<Values>>[0]['check'];
        locked?: () => boolean;
        reset?: boolean;
    } = {}
) {
    const made: { form?: Form<Values> } = {};
    const save = vi.fn(
        options.save ?? ((values: Values) => Promise.resolve(values))
    );
    function Sample() {
        const form = createForm({
            id: 'sample',
            initial: options.initial ?? (() => saved()),
            check: options.check,
            locked: options.locked,
            serverFields: { password: 'newPassword' },
        });
        made.form = form;
        const update = form.mutation(() =>
            mutationOptions({ mutationFn: save })
        );
        const submit = form.onSubmit((values) =>
            update.run(values, () => {
                if (options.reset) form.reset();
            })
        );
        // Kept in a variable: only its getters keep it live. A spread of a
        // call (the others) is made again by Solid on each read.
        const name = form.input('name');
        return (
            <form onSubmit={submit} noValidate aria-label="Sample">
                <ErrorSummary {...form.summary} />
                <Field {...name} label="Name" showLabel />
                <Field
                    {...form.input('newPassword')}
                    label="New password"
                    type="password"
                    showLabel
                />
                <RadioGroup
                    {...form.control('plan')}
                    legend="Plan"
                    options={plans}
                />
                <Checkbox {...form.toggle('news')} label="Newsletter" />
                <button type="submit">Save</button>
                <span role="status">{form.done() ? 'Saved' : ''}</span>
            </form>
        );
    }
    renderPage(() => <Sample />);
    const form = made.form;
    if (!form) throw new Error('the sample did not make its form');
    return { form, save };
}

const input = (label: string) => screen.getByLabelText<HTMLInputElement>(label);
const submit = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('createForm bindings', () => {
    it('give the id, the name, the value and the field errors', async () => {
        renderSample({
            save: () =>
                Promise.reject(
                    refusal(
                        {
                            code: 'Taken',
                            message: 'Name taken.',
                            field: 'name',
                        },
                        { code: 'Down', message: 'Try again.' }
                    )
                ),
        });
        const name = input('Name');
        expect(name.id).toBe('sample-name');
        expect(name.name).toBe('name');
        expect(name.value).toBe('Ann');
        expect(screen.getByRole('group', { name: 'Plan' }).id).toBe(
            'sample-plan'
        );
        expect(input('Newsletter').id).toBe('sample-news');

        submit();

        await waitFor(() =>
            expect(name.getAttribute('aria-invalid')).toBe('true')
        );
        expect(document.getElementById('sample-name-error')?.textContent).toBe(
            'Name taken.'
        );
        expect((await screen.findByRole('alert')).textContent).toBe(
            'Try again.'
        );
        await expectNoA11yViolations();
    });

    it('show a server field under the form field it means', async () => {
        renderSample({
            save: () =>
                Promise.reject(
                    refusal({
                        code: 'Weak',
                        message: 'Too weak.',
                        field: 'password',
                    })
                ),
        });
        submit();

        await waitFor(() =>
            expect(input('New password').getAttribute('aria-invalid')).toBe(
                'true'
            )
        );
        expect(
            document.getElementById('sample-newPassword-error')?.textContent
        ).toBe('Too weak.');
        expect(screen.queryByRole('alert')).toBe(null);
        expect(document.activeElement).toBe(input('New password'));
    });

    it('stay reactive when spread: the DOM follows the store and the input', () => {
        const { form } = renderSample();

        form.set('name', 'Bob');
        form.set('plan', 'team');
        form.set('news', true);
        expect(input('Name').value).toBe('Bob');
        expect(input('Team').checked).toBe(true);
        expect(input('Newsletter').checked).toBe(true);

        fireEvent.input(input('Name'), { target: { value: 'Cy' } });
        fireEvent.click(input('Free'));
        fireEvent.click(input('Newsletter'));
        expect(form.values.name).toBe('Cy');
        expect(form.values.plan).toBe('free');
        expect(form.values.news).toBe(false);

        form.setErrors({
            name: [{ code: 'X', message: 'Bad.', field: 'name' }],
        });
        expect(input('Name').getAttribute('aria-invalid')).toBe('true');
    });

    it('are disabled while busy and while locked', async () => {
        const answer = later<Values>();
        const [locked, setLocked] = createSignal(true);
        const { form } = renderSample({
            save: () => answer.promise,
            locked,
        });
        expect(input('Name').disabled).toBe(true);
        expect(input('Newsletter').disabled).toBe(true);

        setLocked(false);
        expect(input('Name').disabled).toBe(false);

        submit();
        await waitFor(() => expect(form.busy()).toBe(true));
        expect(input('Name').disabled).toBe(true);
        expect(input('Team').disabled).toBe(true);

        answer.ok(saved());
        await waitFor(() => expect(input('Name').disabled).toBe(false));
    });
});

describe('createForm onSubmit', () => {
    it('lets check block the send: its message under the field, the focus on it', async () => {
        const { save } = renderSample({
            // The keys out of page order: the focus still goes to the first.
            check: (v) =>
                v.newPassword.length < 3 && {
                    newPassword: 'Too short.',
                    name: v.name === 'Ann' ? 'Pick another.' : undefined,
                },
        });
        submit();

        expect(
            document.getElementById('sample-newPassword-error')?.textContent
        ).toBe('Too short.');
        await waitFor(() => expect(document.activeElement).toBe(input('Name')));
        expect(save).not.toHaveBeenCalled();

        fireEvent.input(input('Name'), { target: { value: 'Bo' } });
        fireEvent.input(input('New password'), { target: { value: 'long' } });
        submit();
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    });

    it('sends nothing while busy; a submit of the form (Enter) sends', async () => {
        const answer = later<Values>();
        const { save } = renderSample({ save: () => answer.promise });

        fireEvent.submit(screen.getByRole('form', { name: 'Sample' }));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        submit();
        fireEvent.submit(screen.getByRole('form', { name: 'Sample' }));
        expect(save).toHaveBeenCalledTimes(1);

        answer.ok(saved());
        await screen.findByText('Saved');
    });

    it('sends a copy of the values, not the store', async () => {
        const { form, save } = renderSample();
        form.set('tags', ['a', 'b']);
        submit();
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        const sent = save.mock.calls[0][0];
        expect(sent).toEqual({ ...saved(), tags: ['a', 'b'] });
        form.set('name', 'Later');
        expect(sent.name).toBe('Ann');
    });

    it('is done after a success, and not after the next edit', async () => {
        const { form } = renderSample();
        submit();
        expect(await screen.findByText('Saved')).toBeTruthy();
        expect(form.done()).toBe(true);

        fireEvent.input(input('Name'), { target: { value: 'Bo' } });
        expect(form.done()).toBe(false);
        expect(screen.queryByText('Saved')).toBe(null);
    });

    it('is not done after a failure', async () => {
        const { form } = renderSample({
            save: () =>
                Promise.reject(refusal({ code: 'Down', message: 'Down.' })),
        });
        submit();
        await screen.findByRole('alert');
        expect(form.done()).toBe(false);
    });

    it('may reset in onOk: the values go back, the errors go, done shows', async () => {
        const { form } = renderSample({ reset: true });
        fireEvent.input(input('New password'), { target: { value: 'secret' } });
        form.setErrors({ [FORM]: [{ code: 'Old', message: 'Old.' }] });
        submit();

        expect(await screen.findByText('Saved')).toBeTruthy();
        expect(input('New password').value).toBe('');
        expect(form.errors()).toEqual({});
        expect(form.dirty()).toBe(false);
    });
});

describe('createForm state', () => {
    const make = (initial: () => Values = () => saved()) =>
        withSession(() => createForm({ id: 'state', initial }));

    it('dirty() trims texts and compares lists by item', () => {
        const form = make();
        expect(form.dirty()).toBe(false);
        form.set('name', '  Ann ');
        expect(form.dirty()).toBe(false);
        form.set('tags', ['a']);
        expect(form.dirty()).toBe(false);
        form.set('tags', ['a', 'b']);
        expect(form.dirty()).toBe(true);
        form.set('tags', ['a']);
        form.set('news', true);
        expect(form.dirty()).toBe(true);
    });

    it('changed() gives only the changed fields', () => {
        const form = make();
        form.set('name', 'Bob');
        form.set('plan', 'team');
        form.set('newPassword', ' ');
        expect(form.changed()).toEqual({ name: 'Bob', plan: 'team' });
    });

    it('filled() needs a text in each text field', () => {
        const form = make();
        expect(form.filled()).toBe(false);
        form.set('newPassword', '  ');
        expect(form.filled()).toBe(false);
        form.set('newPassword', 'x');
        expect(form.filled()).toBe(true);
    });

    it('reset() restores the values and clears the errors', () => {
        const form = make();
        form.set('name', 'Bob');
        form.set('tags', ['x']);
        form.setErrors({ name: [{ code: 'X', message: 'x', field: 'name' }] });
        form.reset();
        expect(form.values.name).toBe('Ann');
        expect(form.values.tags).toEqual(['a']);
        expect(form.errors()).toEqual({});
        expect(form.dirty()).toBe(false);
    });

    it('an untouched field follows initial; a changed one keeps the edit', () => {
        const [entity, setEntity] = createSignal(saved());
        const form = withSession(() =>
            createForm({ id: 'state', initial: () => entity() })
        );
        form.set('plan', 'team');

        setEntity(saved({ name: 'Ann Lee', plan: 'free', tags: ['b'] }));
        expect(form.values.name).toBe('Ann Lee');
        expect(form.values.tags).toEqual(['b']);
        expect(form.values.plan).toBe('team');
        expect(form.changed()).toEqual({ plan: 'team' });

        // The other card saved the same choice: nothing is left to save.
        setEntity(saved({ name: 'Ann Lee', plan: 'team', tags: ['b'] }));
        expect(form.dirty()).toBe(false);
        // From now on the field follows again.
        setEntity(saved({ plan: 'free' }));
        expect(form.values.plan).toBe('free');
    });

    it('does not share a list with initial', () => {
        const tags = ['a'];
        const form = make(() => saved({ tags }));
        form.set('tags', [...form.values.tags, 'b']);
        expect(tags).toEqual(['a']);
    });

    it('shows the saved value after a save that changed initial', async () => {
        const [entity, setEntity] = createSignal(saved());
        const { form, save } = withSession(() => {
            const form = createForm({ id: 'saved', initial: () => entity() });
            // The server keeps names in lower case.
            const update = form.mutation(() =>
                mutationOptions({
                    mutationFn: (v: Values) =>
                        Promise.resolve({ ...v, name: v.name.toLowerCase() }),
                    onSuccess: (value: Values) => setEntity(value),
                })
            );
            return { form, save: form.onSubmit((v) => update.run(v)) };
        });
        form.set('name', 'BOB');
        save();
        await waitFor(() => expect(form.done()).toBe(true));
        expect(form.values.name).toBe('bob');
        expect(form.dirty()).toBe(false);
    });

    it('keeps an edit made during a save that changed initial', async () => {
        const [entity, setEntity] = createSignal(saved());
        const answer = later<Values>();
        const { form, save } = withSession(() => {
            const form = createForm({ id: 'during', initial: () => entity() });
            const update = form.mutation(() =>
                mutationOptions({
                    mutationFn: (_sent: Values) => answer.promise,
                    onSuccess: (value: Values) => setEntity(value),
                })
            );
            return { form, save: form.onSubmit((v) => update.run(v)) };
        });
        form.set('name', 'Bob');
        save();
        // Another card's control, or a store write: not blocked by busy.
        form.set('plan', 'team');
        answer.ok({ ...saved(), name: 'bob' });
        await waitFor(() => expect(form.done()).toBe(true));
        expect(form.values.name).toBe('bob');
        expect(form.values.plan).toBe('team');
        expect(form.changed()).toEqual({ plan: 'team' });
    });
});

describe('createForm helpers', () => {
    it('same() trims texts and compares lists by item', () => {
        expect(same(' a ', 'a')).toBe(true);
        expect(same(['a', 'b'], ['a', 'b'])).toBe(true);
        expect(same(['a'], ['a', 'b'])).toBe(false);
        expect(same(true, false)).toBe(false);
    });

    it('orNull() trims a changed text and gives null for no change', () => {
        expect(orNull(' x ')).toBe('x');
        expect(orNull('')).toBe('');
        expect(orNull(undefined)).toBe(null);
    });
});

// Types only: a wrong field name, or a binding for another kind of value,
// does not compile. Never called.
export function typeChecks(form: Form<Values>) {
    // @ts-expect-error: no field "nmae".
    form.input('nmae');
    // @ts-expect-error: input() takes a text field, "news" is a flag.
    form.input('news');
    // @ts-expect-error: toggle() takes a flag, "name" is a text.
    form.toggle('name');
    // @ts-expect-error: no field "colour".
    form.control('colour');
    // @ts-expect-error: a plan is "free" or "team".
    form.set('plan', 'gold');
}
