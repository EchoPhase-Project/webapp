import { Navigate, useLocation, useSearchParams } from '@solidjs/router';
import { LOGIN_PATH, SIGNUP_PATH } from '@shared/api/auth-guards';
import { authHref, type AuthSearch } from './components/AuthShell';

/**
 * Addresses from before /auth/login and /auth/signup: /auth (and its
 * ?mode=signup) and /auth/register go on to the page they meant, ?next= kept.
 */
export default function AuthRedirect() {
    const location = useLocation();
    const [search] = useSearchParams<AuthSearch>();
    const signup = () =>
        location.pathname === '/auth/register' || search.mode === 'signup';
    return (
        <Navigate
            href={authHref(signup() ? SIGNUP_PATH : LOGIN_PATH, search.next)}
        />
    );
}
