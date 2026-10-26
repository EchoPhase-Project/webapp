import { render } from 'solid-js/web';
import Root from './Root';
import Layout from './Layout';
import RouterComponent from './Router';
import { followConsent } from '@shared/lib/optional-services';
import { reloadOnStaleBuild } from '@shared/lib/stale-build';

// Statistics and error reports, in parallel with the first render: only what
// the visitor allowed in the cookie banner, and only what the deployment
// switches on (/config.json).
followConsent();

// A deploy while this tab was open: the next page it opens reloads it.
reloadOnStaleBuild();

render(
    () => (
        <Root>
            <RouterComponent root={Layout} />
        </Root>
    ),
    document.getElementById('root') as HTMLElement
);
