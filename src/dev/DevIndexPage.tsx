import { For } from 'solid-js';
import { A } from '@solidjs/router';
import type { DevPage } from './routes';

/** The list of the playground pages (routes.ts), each with its line. */
export default function DevIndexPage(props: { pages: readonly DevPage[] }) {
    return (
        <ul class="dev-index">
            <For each={props.pages}>
                {(page) => (
                    <li class="card dev-index-item">
                        <A href={page.path} class="dev-index-link">
                            {page.title}
                        </A>
                        <span class="muted">{page.description}</span>
                    </li>
                )}
            </For>
        </ul>
    );
}
