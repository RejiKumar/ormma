const tokens = new Set();
let permissionStatus = "authorized";
let tokenValue = "test-fcm-token";

const messagingInstance = {
  getToken: jest.fn(async () => tokenValue),
  requestPermission: jest.fn(async () => permissionStatus),
  onTokenRefresh: jest.fn((cb) => {
    if (typeof cb === "function") tokens.add(cb);
    return () => tokens.delete(cb);
  }),
  onMessage: jest.fn(() => () => {}),
};

const messaging = jest.fn(() => messagingInstance);

messaging.AuthorizationStatus = {
  AUTHORIZED: "authorized",
  PROVISIONAL: "provisional",
  DENIED: "denied",
  NOT_DETERMINED: "not_determined",
};

const getMessaging = jest.fn(() => messagingInstance);
const getToken = jest.fn(async () => tokenValue);
const requestPermission = jest.fn(async () => permissionStatus);
const onTokenRefresh = jest.fn((messagingArg, cb) => {
  if (typeof cb === "function") tokens.add(cb);
  return () => tokens.delete(cb);
});
const onMessage = jest.fn(() => () => {});

module.exports = messaging;
module.exports.default = messaging;
module.exports.getMessaging = getMessaging;
module.exports.getToken = getToken;
module.exports.requestPermission = requestPermission;
module.exports.onTokenRefresh = onTokenRefresh;
module.exports.onMessage = onMessage;
module.exports.AuthorizationStatus = messaging.AuthorizationStatus;

module.exports.__setToken = (t) => {
  tokenValue = t;
  getToken.mockResolvedValue(t);
  messagingInstance.getToken.mockResolvedValue(t);
};
module.exports.__setPermissionStatus = (s) => {
  permissionStatus = s;
  requestPermission.mockResolvedValue(s);
  messagingInstance.requestPermission.mockResolvedValue(s);
};
module.exports.__emitTokenRefresh = (t) => {
  tokenValue = t;
  getToken.mockResolvedValue(t);
  for (const cb of tokens) cb(t);
};
module.exports.__resetMessaging = () => {
  tokens.clear();
  permissionStatus = "authorized";
  tokenValue = "test-fcm-token";
  getMessaging.mockClear();
  getMessaging.mockReturnValue(messagingInstance);
  getToken.mockClear();
  getToken.mockResolvedValue(tokenValue);
  requestPermission.mockClear();
  requestPermission.mockResolvedValue(permissionStatus);
  onTokenRefresh.mockClear();
  onTokenRefresh.mockImplementation((_m, cb) => {
    if (typeof cb === "function") tokens.add(cb);
    return () => tokens.delete(cb);
  });
  onMessage.mockClear();
  onMessage.mockImplementation(() => () => {});
  messaging.mockClear();
  messaging.mockReturnValue(messagingInstance);
  messagingInstance.getToken.mockClear();
  messagingInstance.getToken.mockResolvedValue(tokenValue);
  messagingInstance.requestPermission.mockClear();
  messagingInstance.requestPermission.mockResolvedValue(permissionStatus);
  messagingInstance.onTokenRefresh.mockClear();
  messagingInstance.onTokenRefresh.mockImplementation((cb) => {
    if (typeof cb === "function") tokens.add(cb);
    return () => tokens.delete(cb);
  });
  messagingInstance.onMessage.mockClear();
  messagingInstance.onMessage.mockImplementation(() => () => {});
};
