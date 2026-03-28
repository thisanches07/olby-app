const firebaseErrorMap: Record<string, string> = {
  // Credenciais
  "auth/invalid-credential":
    "E-mail ou senha incorretos. Verifique e tente novamente.",
  "auth/wrong-password":
    "Senha incorreta. Verifique e tente novamente.",
  "auth/user-not-found":
    "Nenhuma conta encontrada com este e-mail.",
  "auth/invalid-email":
    "O e-mail informado não é válido.",

  // Cadastro
  "auth/email-already-in-use":
    "Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha.",
  "auth/weak-password":
    "A senha precisa ter pelo menos 6 caracteres.",
  "auth/operation-not-allowed":
    "Este método de login não está habilitado.",

  // Conta
  "auth/user-disabled":
    "Esta conta foi desativada. Entre em contato com o suporte.",
  "auth/too-many-requests":
    "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",

  // Rede
  "auth/network-request-failed":
    "Sem conexão com a internet. Verifique sua rede e tente novamente.",

  // Apple Sign-In (expo-apple-authentication)
  "ERR_REQUEST_CANCELED": "Login com Apple cancelado.",
  "ERR_REQUEST_FAILED":
    "Não foi possível completar o login com Apple. Tente novamente.",
  "ERR_REQUEST_NOT_HANDLED":
    "Login com Apple não está disponível neste dispositivo.",
  "ERR_REQUEST_NOT_INTERACTIVE":
    "Login com Apple requer interação do usuário.",
  "ERR_INVALID_OPERATION": "Operação inválida no login com Apple.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    if (firebaseErrorMap[code]) return firebaseErrorMap[code];
  }
  if (error instanceof Error && error.message) return error.message;
  return "Ocorreu um erro inesperado. Tente novamente.";
}
