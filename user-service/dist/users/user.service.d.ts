import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
export declare class UserService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    createUserProfile(id: string, loginId: string | null, nickname: string, role?: string): Promise<User>;
    getMe(userId: string): Promise<User | null>;
    updateProfile(userId: string, data: {
        userPhoto?: string;
        nickname?: string;
    }): Promise<User | null>;
    deleteGuestUser(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    handleFileUpload(userId: string, file: Express.Multer.File): Promise<{
        success: boolean;
        url: string;
        user: User | null;
    }>;
    private assertProfileEditable;
}
