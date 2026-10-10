import { type User } from '../lib/api';
export declare function useAuth(): {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<import("../lib/api").LoginResponse>;
    signOut: () => void;
    isAuthenticated: boolean;
};
//# sourceMappingURL=useAuth.d.ts.map