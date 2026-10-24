import { render } from 'solid-js/web';
import Root from './Root';
import Layout from './Layout';
import RouterComponent from './Router';
import { startErrorReporting } from '@shared/lib/error-reporting';
import { startAnalytics } from '@shared/lib/analytics';

// In parallel with the first render; each a no-op unless the deployment
// switches it on (/config.json).
void startErrorReporting();
void startAnalytics();

render(
    () => (
        <Root>
            <RouterComponent root={Layout} />
        </Root>
    ),
    document.getElementById('root') as HTMLElement
);
