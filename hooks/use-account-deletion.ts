import { router } from "expo-router";
import { useCallback, useState } from "react";

import {
  checkSubscriptionStatus,
  deleteAccount as deleteAccountFromBackend,
  type SubscriptionStatusResponse,
} from "@/services/account-deletion.service";
import { ApiError } from "@/services/api";
import { firebaseAuth } from "@/services/firebase";

export type DeleteAccountModalState =
  | null
  | "checking" // Verificando se tem subscrição
  | "no-subscription" // Sem subscrição - mostrar modal de confirmação
  | "has-subscription" // Com subscrição - mostrar modal bloqueante
  | "deleting"; // Deletando conta

export interface UseAccountDeletionReturn {
  /** Estado atual do fluxo de deleção */
  modalState: DeleteAccountModalState;

  /** Dados da subscrição (quando existir) */
  subscriptionStatus: SubscriptionStatusResponse | null;

  /** Mensagem de erro, se houver */
  errorMessage: string | null;

  /**
   * Inicia o fluxo de deleção.
   * Verifica se tem subscrição ativa e abre a modal apropriada.
   */
  startDeletion: () => void;

  /**
   * Confirma a deleção (só para cenário SEM subscrição).
   * Deleta do Firebase e backend, depois redireciona para splash.
   */
  confirmDeletion: () => void;

  /**
   * Callback para "Já Cancelei, Tentar Deletar" (cenário COM subscrição).
   * Volta ao PASSO 1 para refazer a verificação.
   */
  retryAfterCancellation: () => void;

  /** Fecha a modal atual */
  closeModal: () => void;

  /** Clear error state */
  clearError: () => void;
}

/**
 * Hook para gerenciar o fluxo completo de delete de conta com subscrição ativa.
 *
 * FLUXO:
 * 1. startDeletion() → Verifica se tem subscrição ativa (GET /users/me/subscription-status)
 * 2. Se SEM subscrição → Abre modal de confirmação ("no-subscription")
 *    - confirmDeletion() → Deleta (DELETE /users/me + logout Firebase) → Splash
 * 3. Se COM subscrição → Abre modal bloqueante ("has-subscription")
 *    - retryAfterCancellation() → Volta ao passo 1
 * 4. Tratamento de erros:
 *    - 403 Forbidden ao tentar deletar → Mostra erro ("hasActiveSubscription")
 *    - Outros erros → Mostra errorMessage genérica
 */
export function useAccountDeletion(): UseAccountDeletionReturn {
  const [modalState, setModalState] = useState<DeleteAccountModalState>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  /**
   * PASSO 1: Verifica se há subscrição ativa
   */
  const startDeletion = useCallback(async () => {
    setModalState("checking");
    setErrorMessage(null);

    try {
      const status = await checkSubscriptionStatus();
      setSubscriptionStatus(status);

      // CENÁRIO A: SEM subscrição → OK para deletar
      if (!status.hasActiveSubscription) {
        setModalState("no-subscription");
      } else {
        // CENÁRIO B: COM subscrição → PRECISA cancelar primeiro
        setModalState("has-subscription");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao verificar status.";
      setErrorMessage(message);
      setModalState(null);
    }
  }, []);

  /**
   * PASSO 2A: Usuário confirmou deleção (SEM subscrição)
   * Chamados em sequência:
   * 1. DELETE /users/me (backend)
   * 2. deleteUser(Firebase)
   * 3. Limpar token local (automático ao fazer logout do Firebase)
   * 4. Redirecionar para splash/login
   */
  const confirmDeletion = useCallback(async () => {
    setModalState("deleting");
    setErrorMessage(null);

    try {
      // 1. Deleta do backend
      await deleteAccountFromBackend();

      // 2. Deleta do Firebase
      const fbUser = firebaseAuth.currentUser;
      if (fbUser) {
        await fbUser.delete();
      }

      // 3. Token local é limpo automaticamente pelo Firebase
      // (signOut remove o token do localStorage/AsyncStorage)

      // 4. Redireciona para splash/login
      await router.replace("/(auth)/login");
    } catch (err) {
      let message = "Erro ao deletar conta.";

      if (err instanceof ApiError) {
        if (err.status === 403) {
          // 403 Forbidden: Provavelmente a subscrição foi ativada entre a verificação e agora
          message =
            "Sua conta possui uma subscrição ativa. Cancele antes de deletar.";
        } else {
          message = err.message;
        }
      } else if (err instanceof Error) {
        if (err.message.includes("auth/requires-recent-login")) {
          message =
            "Por segurança, saia da conta e entre novamente antes de excluir.";
        } else {
          message = err.message;
        }
      }

      setErrorMessage(message);
      setModalState("no-subscription"); // Volta para a modal de confirmação
    }
  }, []);

  /**
   * PASSO 2B: Usuário clicou em "Já Cancelei, Tentar Deletar"
   * Volta ao PASSO 1 para refazer a verificação
   */
  const retryAfterCancellation = useCallback(async () => {
    // Volta ao PASSO 1
    startDeletion();
  }, [startDeletion]);

  /** Fecha a modal e limpa estados */
  const closeModal = useCallback(() => {
    setModalState(null);
    setErrorMessage(null);
    setSubscriptionStatus(null);
  }, []);

  return {
    modalState,
    subscriptionStatus,
    errorMessage,
    startDeletion,
    confirmDeletion,
    retryAfterCancellation,
    closeModal,
    clearError,
  };
}
