import { OnModuleInit } from '@nestjs/common';
import { PresenceService } from './presence.service';
export declare class PresenceModule implements OnModuleInit {
    private readonly presenceService;
    constructor(presenceService: PresenceService);
    onModuleInit(): Promise<void>;
}
