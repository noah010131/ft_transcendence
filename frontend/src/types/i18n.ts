/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   i18n.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:47:28 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/17 11:49:03 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export type Locale = 'en' | 'ko' | 'fr';

export type Messages = {
  landing: {
    title: string;
    login: string;
    register: string;
  };
  login: {
    title: string;
    subtitle: string;
    id: string;
    password: string;
    submit: string;
    submitting: string;
    footerText: string;
    footerLink: string;
  };
  guest: {
    entryText: string;
    entryLink: string;
    blockedTitle: string;
    blockedBody: string;
    disabledTooltip: string;
  };
  register: {
    title: string;
    subtitle: string;
    id: string;
	nick: string;
    password: string;
    confirmPassword: string;
    submit: string;
    submitting: string;
    footerText: string;
    footerLink: string;
  };
  footer: {
    terms: string;
    privacy: string;
  };
  
  navbar: {
    mySpace : string;
    pong : string;
    social : string;
    logout : string;
  };
    HomePage: {
    pong : string;
    summary : string;
    match : string;
    aiGame : string;
    gameRule : string;
    rule : string;
    matchFound: string;
    escCancel: string;
  };
  game: {
    connectGameJoin: string;
    connectGameServer: string;
    preparingAiMatch: string;
    matchingError: string;
    movePaddle: string;
    winner: string;
    loser: string;
    backHome: string;
    // suna : match_found 후 게임 시작 버튼 / ready 핸드셰이크용 문구.
    matchFoundReady: string;
    startGameButton: string;
    waitingOpponentReady: string;
    // suna : 친구 초대 단계 문구.
    invitingFriend: string;
    invitedByFriend: string;
  };
  social: {
    title: string;
    addPlaceholder: string;
    add: string;
    sendMessage: string;
    startGame: string;
    noFriends: string;
    remove: string;
    requestsTitle: string;
    noRequests: string;
    accept: string;
    reject: string;
    alertTitle: string;
    requestSent: string;
  };
  chat: {
    inputPlaceholder: string;
    send: string;
  };
  mySpace: {
    title: string;
    editAvatar: string;
    selectAvatar: string;
    submitting: string;
    nickname: string;
    nicknamePlaceholder: string;
    save: string;
    gameHistory: string;
    noGames: string;
    win: string;
    lose: string;
    me: string;
    Loading: string;
    cancel: string;
  };
  privacy: {
    title: string;
    updatedAt: string;
    backButton: string;
    section1Title: string;
    section1Body: string;
    section2Title: string;
    section2Body: string;
    section3Title: string;
    section3Body: string;
    section4Title: string;
    section4Body: string;
    section5Title: string;
    section5Body: string;
    section6Title: string;
    section6Body: string;
    section7Title: string;
    section7Body: string;
  };
  termsPage: {
    title: string;
    effectiveDate: string;
    backButton: string;
    section1Title: string;
    section1Body: string;
    section2Title: string;
    section2Body: string;
    section3Title: string;
    section3Body: string;
    section4Title: string;
    section4Body: string;
    section5Title: string;
    section5Body: string;
    section6Title: string;
    section6Body: string;
    section7Title: string;
    section7Body: string;
  };
errors: {
    USER_NOT_FOUND: string;
    INVALID_PASSWORD: string;
    ID_REQUIRED: string;
    PASSWORD_REQUIRED: string;
    CONFIRM_PASSWORD_REQUIRED: string;
    INVALID_PASSWORD_FORMAT: string;
    INVALID_ID_FORMAT: string;
    ALREADY_ONLINE: string;
    INVALID_NICKNAME_FORMAT: string;
    USER_ALREADY_EXISTS: string;
    NICKNAME_ALREADY_EXISTS: string;
    USER_PROFILE_INIT_FAILED: string;
    SERVER_ERROR: string;
    CANNOT_ADD_SELF: string;
    ALREADY_FRIENDS_OR_REQUESTED: string;
    REQUEST_NOT_FOUND: string;
    REQUEST_NOT_PENDING: string;
    FRIEND_NOT_FOUND: string;
    NOT_ACCEPTED_FRIENDSHIP: string;
    FORBIDDEN: string;
    NICKNAME_REQUIRED: string;
    NICKNAME_NOT_ALLOWED: string;
    SESSION_EXPIRED: string;
    IMAGE_FORMAT_NOT_ALLOWED: string;
    TOO_BIG_FILE: string;
    USER_SERVICE_UNAVAILABLE: string;
    UNAUTHENTICATED: string;
    ALREADY_IN_GAME: string;
    KICKED_BY_NEW_TAB: string;
    // suna : 친구 초대 관련 에러 코드.
    CANNOT_INVITE_SELF: string;
    TARGET_ALREADY_INVITED: string;
    ALREADY_INVITING: string;
    TARGET_BUSY: string;
    INVITE_TIMEOUT: string;
    INVITE_TARGET_LEFT: string;
    INVITE_INVITER_GONE: string;
    INVALID_INVITE_TARGET: string;
  };
  errorPage: {
    errorCode: string;
    retry: string;
    goHome: string;
    reload: string;
    variants: {
      notFound: {
        status: string;
        title: string;
        body: string;
        errorCode: string;
      };
      serverError: {
        status: string;
        title: string;
        body: string;
        errorCode: string;
      };
      serviceUnavailable: {
        status: string;
        title: string;
        body: string;
        errorCode: string;
      };
      network: {
        status: string;
        title: string;
        body: string;
        errorCode: string;
      };
    };
  };
  result: {
    success: string;
    false: string;
    goLogin: string;
  };
};
