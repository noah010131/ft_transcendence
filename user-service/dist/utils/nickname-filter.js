"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeNickname = normalizeNickname;
exports.isNicknameAllowed = isNicknameAllowed;
const bannedWords = [
    '씨발',
    'fuck',
    'bonjour',
    'AI_BOT',
];
function normalizeNickname(value) {
    return value
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9가-힣]/g, '');
}
function isNicknameAllowed(nickname) {
    const normalized = normalizeNickname(nickname);
    if (!normalized)
        return false;
    return !bannedWords.some((word) => normalized.includes(normalizeNickname(word)));
}
//# sourceMappingURL=nickname-filter.js.map