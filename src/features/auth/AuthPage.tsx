import { Show } from 'solid-js';
import { Navigate, useSearchParams } from '@solidjs/router';
import { useAuth } from '@shared/api/auth-provider';
import { safeNext } from '@shared/api/auth-guards';
import BrandMark from '@shared/ui/BrandMark';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import './auth.scss';

type AuthSearch = { next?: string; mode?: string };

/**
 * Sign-in and sign-up on one card: its two sides, turned by the link under
 * each form. ?mode=signup opens on the sign-up side (the About page links
 * there); the side out of view is inert, so Tab never reaches it.
 */
export default function AuthPage() {
    const auth = useAuth();
    const [search, setSearch] = useSearchParams<AuthSearch>();
    const isRegister = () => search.mode === 'signup';

    let card: HTMLDivElement | undefined;

    const turn = (register: boolean) => {
        setSearch({ mode: register ? 'signup' : undefined }, { replace: true });
        // Focus follows to the side now in view, once it is no longer inert.
        queueMicrotask(() =>
            card
                ?.querySelector<HTMLInputElement>(
                    `.${register ? 'auth-back' : 'auth-front'} input`
                )
                ?.focus()
        );
    };

    return (
        <Show
            when={!auth.isAuthenticated()}
            fallback={<Navigate href={safeNext(search.next)} />}
        >
            <div class="auth-wrapper">
                <div
                    ref={card}
                    class="auth-card"
                    classList={{ 'auth-card--back': isRegister() }}
                >
                    <div
                        class="auth-face auth-front patterned"
                        inert={isRegister()}
                    >
                        <BrandMark class="auth-mark" />
                        <LoginForm onSwitch={() => turn(true)} />
                    </div>
                    <div
                        class="auth-face auth-back patterned"
                        inert={!isRegister()}
                    >
                        <BrandMark class="auth-mark" />
                        <RegisterForm onSwitch={() => turn(false)} />
                    </div>
                </div>
            </div>
        </Show>
    );
}
