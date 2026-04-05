import { ToastRenderer } from "@/components/obra/toast";
import { Modal, ModalProps } from "react-native";

/**
 * Substituto drop-in para o <Modal> do React Native.
 * Inclui <ToastRenderer> dentro da camada nativa da modal,
 * garantindo que toasts apareçam na frente do conteúdo da modal
 * em iOS e Android.
 */
export function AppModal({ children, ...props }: ModalProps) {
  return (
    <Modal {...props}>
      {children}
      <ToastRenderer topOffset={16} />
    </Modal>
  );
}
