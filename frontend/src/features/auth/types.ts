export type UserRole = 'LEARNER' | 'ADMIN';
export interface AuthUser { id: string; email: string; displayName: string; role: UserRole }
export interface AuthResponse { accessToken: string; refreshToken: string; user: AuthUser }

