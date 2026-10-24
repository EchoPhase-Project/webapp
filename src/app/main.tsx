import { render } from 'solid-js/web';
import Root from './Root';
import Layout from './Layout';
import RouterComponent from './Router';
import { startErrorReporting } from '@shared/lib/error-reporting';

// In parallel with the first render; a no-op without a DSN.
void startErrorReporting();

render(
    () => (
        <Root>
            <RouterComponent root={Layout} />
        </Root>
    ),
    document.getElementById('root') as HTMLElement
);
