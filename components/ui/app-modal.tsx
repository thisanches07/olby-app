import { ToastRenderer } from "@/components/obra/toast";
import { Modal, ModalProps } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * Substituto drop-in para o <Modal> do React Native.
 * Inclui <ToastRenderer> dentro da camada nativa da modal,
 * garantindo que toasts apareçam na frente do conteúdo da modal
 * em iOS e Android.
 * SafeAreaProvider garante insets corretos dentro da janela nativa do Modal no iOS.
 */
export function AppModal({ children, ...props }: ModalProps) {
  return (
    <Modal {...props}>
      <SafeAreaProvider>
        {children}
      </SafeAreaProvider>
      <ToastRenderer topOffset={16} />
    </Modal>
  );
}
