import * as React from 'react';
import { auth } from '../../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';

type AuthContextType = {
    user: User | null;
    loading: boolean;
    error: string | null;
    register: (email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const ctx = React.useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => {
            setUser(u);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    async function register(email: string, password: string) {
        setError(null);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            setError(e.message ?? 'Registration failed');
            throw e;
        }
    }

    async function login(email: string, password: string) {
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            setError(e.message ?? 'Login failed');
            throw e;
        }
    }

    async function logout() {
        setError(null);
        try {
            await signOut(auth);
        } catch (e: any) {
            setError(e.message ?? 'Logout failed');
            throw e;
        }
    }

    const val: AuthContextType = { user, loading, error, register, login, logout };
    return <AuthContext.Provider value={val}>{children}</AuthContext.Provider>;
}
