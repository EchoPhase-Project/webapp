import { render } from 'solid-js/web';
import Root from './Root';
import Layout from './Layout';
import RouterComponent from './Router';
import { followConsent } from '@shared/lib/optional-services';

// Statistics and error reports, in parallel with the first render: only what
// the visitor allowed in the cookie banner, and only what the deployment
// switches on (/config.json).
followConsent();

render(
    () => (
        <Root>
            <RouterComponent root={Layout} />
        </Root>
    ),
    document.getElementById('root') as HTMLElement
);
