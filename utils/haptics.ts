import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const isIOS = Platform.OS === "ios";

/** Feedback leve — uso geral em botões, chips, tabs */
export function tapLight() {
  if (!isIOS) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Feedback médio — ações importantes, swipe completado */
export function tapMedium() {
  if (!isIOS) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Feedback pesado — long press, ação destrutiva iniciada */
export function tapHeavy() {
  if (!isIOS) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Notificação de sucesso — toast success, tarefa concluída */
export function notifySuccess() {
  if (!isIOS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Notificação de erro — toast error, falha de ação */
export function notifyError() {
  if (!isIOS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Notificação de aviso — ação irreversível confirmada */
export function notifyWarning() {
  if (!isIOS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
