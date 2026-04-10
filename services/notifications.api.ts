import { api } from "@/services/api";
import type {
  PushTokenRegistrationDto,
  PushTokenRevokeDto,
  PushTokenTouchDto,
} from "@/services/notifications.types";

const REGISTER_PUSH_TOKEN_PATH = "/v1/notifications/push-tokens";
const REVOKE_PUSH_TOKEN_PATH = "/v1/notifications/push-tokens/revoke";
const TOUCH_PUSH_TOKEN_PATH = "/v1/notifications/push-tokens/touch";

export const notificationsApi = {
  registerPushToken: (payload: PushTokenRegistrationDto) =>
    api.post(REGISTER_PUSH_TOKEN_PATH, payload),

  revokePushToken: (payload: PushTokenRevokeDto) =>
    api.post<void>(REVOKE_PUSH_TOKEN_PATH, payload),

  touchPushToken: (payload: PushTokenTouchDto) =>
    api.patch(TOUCH_PUSH_TOKEN_PATH, payload),
};
