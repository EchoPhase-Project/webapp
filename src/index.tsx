import { render } from 'solid-js/web';
import Root from './Root';
import Layout from './Layout';
import RouterComponent from './Router';
import { watchApi } from '@lib/maintenance';

// Before the first API call: an outage shows as one screen, not as each
// page failing on its own.
watchApi();

render(
    () => (
        <Root>
            <RouterComponent root={Layout} />
        </Root>
    ),
    document.getElementById('root') as HTMLElement
);
