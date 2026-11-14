import {
    createContext,
    useContext,
    ParentComponent,
    createSignal,
    createResource,
    onCleanup,
    Accessor,
} from 'solid-js';
import type {
    User,
    LoginCredentials,
    RegisterData,
    ProfileUpdate,
} from './types';
import { CsrfService } from './csrf';
import { api, dataOr, onUnauthorized, send, type ApiResult } from './client';

interface AuthContextValue {
    /** undefined while loading, null when signed out. */
    user: Accessor<User | null | undefined>;
    roles: Accessor<string[] | null | undefined>;
    refetchUser: () =>
        User | null | undefined | Promise<User | null | undefined>;
    isAuthenticated: Accessor<boolean>;
    /** True while signing in, up or out: the session changes. */
    isLoading: Accessor<boolean>;
    login: (credentials: LoginCredentials) => Promise<ApiResult<void>>;
    register: (data: RegisterData) => Promise<ApiResult<void>>;
    /** The answer's data is the user as saved. */
    updateProfile: (data: ProfileUpdate) => Promise<ApiResult<User>>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>();

export const AuthProvider: ParentComponent = (props) => {
    const [isLoading, setIsLoading] = createSignal(false);

    const [user, { refetch: refetchUser, mutate: setUser }] =
        createResource<User | null>(async () => {
            const result = await send(api.GET('/api/v1/auth/me'));
            return dataOr(result, null);
        });

    const isAuthenticated = () => !!user();

    // The session ended under us: signed out, so guarded pages send to /auth.
    onCleanup(
        onUnauthorized(() => {
            CsrfService.clearToken();
            setUser(null);
        })
    );

    const [roles, { refetch: refetchRoles }] = createResource(
        isAuthenticated,
        async (): Promise<string[] | null> => {
            const result = await send(api.GET('/api/v1/roles/me'));
            return dataOr(result, null);
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
    const signedIn = async <T,>(result: ApiResult<T>) => {
        if (result.ok) {
            await refetchUser();
            await refetchRoles();
        }
        return result;
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

    // Changes the signed-in user's name and/or time zone; omitted fields
    // stay. The form shows its own busy state: the session does not change.
    const updateProfile = async (data: ProfileUpdate) => {
        const result = await send(api.PATCH('/api/v1/auth/me', { body: data }));
        if (result.ok) setUser(result.data);
        return result;
    };

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
