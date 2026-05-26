import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    private getCurrentUserId;
    uploadPhoto(req: Request, file: Express.Multer.File): Promise<{
        success: boolean;
        url: string;
        user: import("../entities/user.entity").User | null;
    }>;
    initializeUser(data: {
        id: string;
        loginId: string | null;
        nickname: string;
        role?: string;
    }): Promise<{
        success: boolean;
        user: {
            userId: string;
            loginId: string | null;
            nickname: string;
            userPhoto: string;
            role: string;
        };
    }>;
    deleteGuestUser(userId: string, secret?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getMe(req: Request): Promise<{
        success: boolean;
        user: {
            userId: string;
            loginId: string | null;
            nickname: string;
            userPhoto: string;
            role: string;
        };
    }>;
    updateProfile(req: Request, data: {
        userPhoto?: string;
        nickname?: string;
    }): Promise<{
        success: boolean;
        user: {
            userId: string;
            loginId: string | null;
            nickname: string;
            userPhoto: string;
            role: string;
        };
    }>;
}
