import { For } from 'solid-js';
import Avatar from '@shared/ui/Avatar';
import BrandMark from '@shared/ui/BrandMark';
import { DevGrid, DevSample, DevSection } from './DevKit';

const sizes = [20, 24, 32, 40, 64, 96];

const people = [
    { id: 'u1', name: 'Ann Lee' },
    { id: 'u2', name: 'Bob Stone' },
    { id: 'u3', name: 'Chen Wu' },
    { id: 'u4', name: 'Dana Moss' },
    { id: 'u5', name: 'Émile Roux' },
    { id: 'u6', name: 'Юлия' },
    { id: 'u7', name: '' },
    { id: 'u8', name: 'Zed' },
];

/** Avatar in each size and with each seed, and BrandMark. */
export default function ContentPage() {
    return (
        <>
            <DevSection
                title="Avatar"
                note="Without a picture, a gradient from the seed (the user's id). The samples have no picture: a picture is a real request."
            >
                <DevGrid wide>
                    <DevSample title="Sizes, with the initial">
                        <div class="dev-row">
                            <For each={sizes}>
                                {(size) => (
                                    <Avatar
                                        name="Ann Lee"
                                        seed="u1"
                                        size={size}
                                        initial
                                    />
                                )}
                            </For>
                        </div>
                        <p class="muted">{sizes.join(', ')} px</p>
                    </DevSample>
                    <DevSample title="Gradients, by seed">
                        <ul class="dev-plain">
                            <For each={people}>
                                {(person) => (
                                    <li class="dev-row">
                                        <Avatar
                                            name={person.name}
                                            seed={person.id}
                                            size={32}
                                            initial
                                        />
                                        <span>
                                            {person.name || '(no name)'}{' '}
                                            <span class="muted">
                                                {person.id}
                                            </span>
                                        </span>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </DevSample>
                    <DevSample title="Without the initial">
                        <div class="dev-row">
                            <For each={people}>
                                {(person) => (
                                    <Avatar
                                        name={person.name}
                                        seed={person.id}
                                    />
                                )}
                            </For>
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="BrandMark"
                note="The mark in the current colour, 1em in size."
            >
                <DevGrid>
                    <DevSample title="Sizes, in the accent">
                        <div class="dev-row dev-brand">
                            <BrandMark style={{ 'font-size': '16px' }} />
                            <BrandMark style={{ 'font-size': '24px' }} />
                            <BrandMark style={{ 'font-size': '48px' }} />
                            <BrandMark style={{ 'font-size': '96px' }} />
                        </div>
                    </DevSample>
                    <DevSample title="On a tile, and in the text colour">
                        <div class="dev-row">
                            <span class="dev-brand--tile">
                                <BrandMark style={{ 'font-size': '40px' }} />
                            </span>
                            <BrandMark style={{ 'font-size': '40px' }} />
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>
        </>
    );
}
