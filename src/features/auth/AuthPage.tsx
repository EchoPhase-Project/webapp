import { createSignal, onMount } from 'solid-js';
import { useLocalizer } from '@shared/i18n/i18n-context';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import { BsArrowUpRight } from 'solid-icons/bs';
import { useNav } from '@shared/nav/nav-context';
import './auth.scss';

export default function AuthPages() {
    const [isRegister, setIsRegister] = createSignal(false);
    const { setNavLinks } = useNav();
    const t = useLocalizer('auth');

    onMount(() => {
        setNavLinks([]);
    });

    return (
        <div class="auth-wrapper">
            <div class="auth-section">
                <h6 class="auth-tabs">
                    <span>{t('login', 'Log In')}</span>
                    <span>{t('signup', 'Sign Up')}</span>
                </h6>
                <input
                    class="hidden-checkbox"
                    type="checkbox"
                    id="reg-log"
                    name="reg-log"
                    checked={isRegister()}
                    onInput={(e) => setIsRegister(e.currentTarget.checked)}
                />
                <label for="reg-log">
                    <BsArrowUpRight class="arrow" />
                </label>
                <div class="card-3d-wrap">
                    <div class="card-3d-wrapper">
                        <div class="card-front">
                            <div class="center-wrap">
                                <LoginForm />
                            </div>
                        </div>
                        <div class="card-back">
                            <div class="center-wrap">
                                <RegisterForm />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
