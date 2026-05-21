import type { Messages } from '../../types/i18n';

export const en: Messages = {
	//랜딩페이지에서 사용할 내용
  landing: {
	title: 'Welcome to Inflexion',
	login: 'Login',
	register: 'Register',
	},

	//로그인
	login: {
  title: 'Login',
  subtitle: 'Enter your credentials to continue',
	id: 'ID',
  submit: 'Login',
  password: 'Password',
  submitting: 'Logging in...',
  footerText: "Don't have an account? ",
  footerLink: 'Register',
	},
	guest: {
	entryText: 'Want to play without an account? ',
  blockedTitle: 'Guest mode',
  entryLink: 'Continue as guest',
  disabledTooltip: 'Not available in guest mode',
  blockedBody: 'This feature is not available in guest mode. Please sign up to continue.',
	},

	//회원가입
  register: {
  title: 'Sign Up',
  subtitle: 'Create an account to get started',
  id: 'Id (1–20 characters, letters and numbers)',
  nick: 'Nickname (1–20 characters, letters and numbers)',
  password: 'Password (4–20 characters, letters and numbers)',
  confirmPassword: 'Confirm Password',
  submit: 'Sign Up',
  submitting: 'Processing...',
  footerText: 'Already have an account?',
  footerLink: 'Log In',
  },

	//하단
	footer: {
  terms: 'Terms',
  privacy: 'Privacy',
	},

  //네비바
  navbar: {
  pong: 'Pong',
  social: 'Social',
  mySpace: 'My Space',
  logout: 'Logout',
  },
  //홈
  HomePage: {
  pong: 'Play Pong',
  summary: 'Play Pong online with other players or against AI.',
  match: 'Find Match',
  aiGame: 'Play vs AI',
  gameRule: 'Game Rules',
  rule: 'Get the ball past your opponent’s paddle and score 5 points to win',
  matchFound: 'Match found, joining game...',
  escCancel: 'Press ESC to cancel matchmaking',
  },

  game: {
  connectGameJoin: 'Entering the matchmaking queue...',
  connectGameServer: 'Connecting to Game server',
  preparingAiMatch: 'Preparing an AI opponent...',
  matchingError: 'Matching Error',
  movePaddle: 'Press W / S to move the paddle.',
  winner: '🏆 YOU WIN!',
  loser: '💀 YOU LOSE',
  backHome: 'Go Back Home',
  matchFoundReady: 'Opponent found! Press Start when you are ready.',
  startGameButton: 'Start Game',
  waitingOpponentReady: 'Waiting for the opponent to get ready...',
  invitingFriend: 'Waiting for your friend to respond...',
  invitedByFriend: 'You have been invited to a game. Hold on...',
  },
    //소셜
  social: {
  title: 'Friends',
  addPlaceholder: 'Enter nickname',
  add: 'Add',
  sendMessage: 'Message',
  startGame: 'Start Game',
  noFriends: 'No friends yet',
  remove: 'Remove',
  requestsTitle: 'Friend Requests',
  noRequests: 'No requests',
  accept: 'Accept',
  reject: 'Reject',
  alertTitle: 'Notice',
  requestSent: 'Friend request sent.',
  },

  //채팅
  chat: {
  inputPlaceholder: 'Type a message',
  send: 'Send',
  },

  //프로필
  mySpace: {
  title: "{userId}'s Space",
  editAvatar: 'Edit Avatar',
  selectAvatar: 'Select Avatar',
  submitting: 'Changing...',
  nickname: 'Nickname',
  nicknamePlaceholder: 'Enter your nickname',
  save: 'Save',
  gameHistory: 'Game History (latest 5 match)',
  noGames: 'No games played yet',
  win: 'Win',
  lose: 'Lose',
  me: 'me',
  Loading: 'Loading',
  cancel: 'cancel',
  },

  privacy: {
  title: 'Privacy Policy',
  updatedAt: 'Last updated: 2026-04-15',
  backButton: 'Back',
  section1Title: '1. Personal Data We Collect',
  section1Body:
    'To provide account and core features, we may collect email, nickname, account identifier, selected profile image value, and login session data (IP address, User-Agent, token session information).',
  section2Title: '2. Purpose of Processing',
  section2Body:
    'We use personal data for user identification, login/authentication, friend and social features, account security, and service operations including troubleshooting.',
  section3Title: '3. Retention and Deletion',
  section3Body:
    'When an account is deleted, personal data is deleted without delay except where retention is required by law or internal security policy. Auth session/blacklist data is automatically removed after its security retention period.',
  section4Title: '4. Third-Party Sharing and Entrustment',
  section4Body:
    'We do not provide personal data to third parties without user consent, except when required by applicable law.',
  section5Title: '5. User Rights',
  section5Body:
    'Users may request access, correction, deletion, or suspension of processing of their personal data through account settings or by contacting the project team.',
  section6Title: '6. Cookies and Sessions',
  section6Body:
    'We use cookies (Access/Refresh Token) to maintain login sessions. Cookies are used only for authentication and security purposes and can be deleted in browser settings.',
  section7Title: '7. Contact',
  section7Body: 'For privacy-related inquiries, please contact the project operation team.',
  },
  termsPage: {
  title: 'Terms of Service',
  effectiveDate: 'Effective date: 2026-04-15',
  backButton: 'Back',
  section1Title: '1. Purpose',
  section1Body:
    'These Terms define the conditions of use, rights, obligations, and liabilities related to the Pong service.',
  section2Title: '2. Account and User Responsibility',
  section2Body:
    'Users must provide accurate information and are responsible for managing their accounts and authentication data. Suspected unauthorized use must be reported immediately.',
  section3Title: '3. Service Usage',
  section3Body:
    'Users must use game/social features in compliance with these Terms and applicable laws. Service may be temporarily interrupted for maintenance, updates, or incident response.',
  section4Title: '4. Prohibited Conduct',
  section4Body:
    'Account theft, service attacks, abnormal traffic generation, abusive/hateful language, illegal content posting, and system abuse are prohibited. Violations may result in restrictions or account suspension.',
  section5Title: '5. Intellectual Property',
  section5Body:
    'Rights to software, designs, trademarks, and contents related to the service belong to the operator or rightful owners, and may not be reproduced or distributed without prior consent.',
  section6Title: '6. Disclaimer and Limitation of Liability',
  section6Body:
    'The operator is not liable for damages caused by force majeure or user fault, except where liability cannot be excluded under applicable law.',
  section7Title: '7. Changes to These Terms',
  section7Body:
    'These Terms may be changed within the scope of applicable law. Material changes will be announced in the service. Continued use after changes constitutes acceptance.',
  },
	errors: {
	USER_NOT_FOUND: "Invalid ID or password.",
	INVALID_PASSWORD: "Invalid ID or password.",
  ID_REQUIRED: "Please enter your ID.",
  PASSWORD_REQUIRED: "Please enter your password.",
  CONFIRM_PASSWORD_REQUIRED: "Please confirm your password.",
  INVALID_PASSWORD_FORMAT: "Password must be 4-32 characters using only letters and numbers.",
  INVALID_ID_FORMAT: "ID must be 1-20 characters using only letters and numbers.",
  ALREADY_ONLINE: "This account is already online. Please close the existing session and try again.",
  INVALID_NICKNAME_FORMAT: "Nickname must be 1-20 characters using only letters and numbers.",
	USER_ALREADY_EXISTS: "This ID is already registered.",
  NICKNAME_ALREADY_EXISTS: "This nickname is already in use.",
  USER_PROFILE_INIT_FAILED: "Signup failed while creating your profile. Please try again.",
	SERVER_ERROR: "Internal server error. Please try again later.",
  CANNOT_ADD_SELF: "You cannot add yourself as a friend.",
  ALREADY_FRIENDS_OR_REQUESTED: "You are already friends or a request is pending.",
  REQUEST_NOT_FOUND: "Friend request not found.",
  REQUEST_NOT_PENDING: "This request is no longer pending.",
  FRIEND_NOT_FOUND: "Friend not found.",
  NOT_ACCEPTED_FRIENDSHIP: "This is not an accepted friendship.",
  FORBIDDEN: "You don't have permission to do this.",
  NICKNAME_REQUIRED: "Please enter a nickname.",
  NICKNAME_NOT_ALLOWED: "This nickname is not allowed.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  IMAGE_FORMAT_NOT_ALLOWED: "This image format is not allowed",
  TOO_BIG_FILE:"Too big file. (5MB max)",
  USER_SERVICE_UNAVAILABLE: "This feature is temporarily unavailable. Please try again later.",
  UNAUTHENTICATED: "Authentication required. Please log in again.",
  ALREADY_IN_GAME: "You are already in an ongoing game.",
  KICKED_BY_NEW_TAB: "Connection closed because a new session started in another tab.",
  CANNOT_INVITE_SELF: "You cannot invite yourself.",
  TARGET_ALREADY_INVITED: "Your friend already has a pending invite.",
  ALREADY_INVITING: "You already have a pending invite out.",
  TARGET_BUSY: "Your friend is currently in another game.",
  INVITE_TIMEOUT: "Your friend did not respond in time.",
  INVITE_TARGET_LEFT: "Your friend declined or disconnected.",
  INVITE_INVITER_GONE: "The inviter is no longer connected.",
  INVALID_INVITE_TARGET: "Invalid invite target.",
  },

  errorPage: {
  errorCode: "Error code",
  retry: "Retry",
  goHome: "Go home",
  reload: "Reload",
  variants: {
    notFound: {
    status: "Not Found",
    title: "Page not found",
    body: "The address you requested is invalid, or the page may have been removed.",
    errorCode: "PAGE_NOT_FOUND",
    },
    serverError: {
    status: "Internal Server Error",
    title: "Something went wrong",
    body: "Please try again in a moment. If the problem persists, contact the team.",
    errorCode: "UNEXPECTED_ERROR",
    },
    serviceUnavailable: {
    status: "Service Unavailable",
    title: "Cannot reach the server",
    body: "The user service is not responding. Please try again in a moment.",
    errorCode: "USER_SERVICE_UNAVAILABLE",
    },
    network: {
    status: "Offline",
    title: "Network unavailable",
    body: "Check your internet connection and try again.",
    errorCode: "NETWORK_UNAVAILABLE",
    },
  },
  },
  result: {
  success: "Success",
  false: "OK",
  goLogin: "Go to Login",
  },
};
