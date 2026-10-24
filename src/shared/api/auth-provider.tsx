import {
    createContext,
    useContext,
    ParentComponent,
    createSignal,
    createResource,
    Accessor,
} from 'solid-js';
import type {
    User,
    LoginCredentials,
    RegisterData,
    ProfileUpdate,
    ErrorItem,
} from './types';
import { CsrfService } from './csrf';
import { api, send, type ApiResult } from './client';

type Outcome = { success: boolean; error?: ErrorItem[] };

interface AuthContextValue {
    /** undefined while loading, null when signed out. */
    user: Accessor<User | null | undefined>;
    roles: Accessor<string[] | null | undefined>;
    refetchUser: () =>
        User | null | undefined | Promise<User | null | undefined>;
    isAuthenticated: Accessor<boolean>;
    isLoading: Accessor<boolean>;
    login: (credentials: LoginCredentials) => Promise<Outcome>;
    register: (data: RegisterData) => Promise<Outcome>;
    updateProfile: (data: ProfileUpdate) => Promise<Outcome>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>();

const outcome = (result: ApiResult<unknown>): Outcome =>
    result.ok ? { success: true } : { success: false, error: result.errors };

export const AuthProvider: ParentComponent = (props) => {
    const [isLoading, setIsLoading] = createSignal(false);

    const [user, { refetch: refetchUser, mutate: setUser }] =
        createResource<User | null>(async () => {
            const result = await send(api.GET('/api/v1/auth/me'));
            return result.ok ? result.data : null;
        });

    const isAuthenticated = () => !!user();

    const [roles, { refetch: refetchRoles }] = createResource(
        isAuthenticated,
        async (): Promise<string[] | null> => {
            const result = await send(api.GET('/api/v1/roles/me'));
            return result.ok ? result.data : null;
        }
    );

    const busy = async <T,>(work: () => Promise<T>): Promise<T> => {
        setIsLoading(true);
        try {
            return await work();
        } finally {
            setIsLoading(false);
        }
    };

    // The CSRF token comes with the answer (the client keeps it).
    const signedIn = async (result: ApiResult<unknown>) => {
        if (result.ok) {
            await refetchUser();
            await refetchRoles();
        }
        return outcome(result);
    };

    const login = (credentials: LoginCredentials) =>
        busy(async () =>
            signedIn(
                await send(
                    api.POST('/api/v1/auth/login', { body: credentials })
                )
            )
        );

    // Registering also signs in: same cookies and CSRF token as login.
    const register = (data: RegisterData) =>
        busy(async () =>
            signedIn(
                await send(api.POST('/api/v1/auth/register', { body: data }))
            )
        );

    // Changes the signed-in user's name and/or time zone; omitted fields stay.
    const updateProfile = (data: ProfileUpdate) =>
        busy(async () => {
            const result = await send(
                api.PATCH('/api/v1/auth/me', { body: data })
            );
            if (result.ok) setUser(result.data);
            return outcome(result);
        });

    const logout = () =>
        busy(async () => {
            // Revokes this device's session and clears the token cookies.
            const result = await send(api.DELETE('/api/v1/sessions/current'));
            if (!result.ok) console.error('Logout failed:', result.errors);
            CsrfService.clearToken();
            await refetchUser();
            await refetchRoles();
        });

    const value: AuthContextValue = {
        user,
        roles,
        refetchUser,
        isAuthenticated,
        isLoading,
        login,
        register,
        updateProfile,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {props.children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
