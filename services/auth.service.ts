import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  PhoneAuthProvider,
  User,
  createUserWithEmailAndPassword,
  linkWithCredential,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  unlink,
  updatePhoneNumber,
  updateProfile,
  type ApplicationVerifier,
  type ConfirmationResult,
} from "firebase/auth";

import { api } from "./api";
import { firebaseAuth } from "./firebase";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Garante que o usuário existe no banco local do backend.
 * Chamado após qualquer autenticação (login ou registro via Google).
 * Ignora 409 (usuário já registrado) — operação idempotente.
 */
async function ensureUserRegistered(user: User): Promise<void> {
  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`${BASE_URL}/users/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: user.displayName || user.email || "Usuário",
      }),
    });

    // 409 = usuário já existe no backend (esperado no login normal)
    if (!response.ok && response.status !== 409) {
      // Não lança erro — permite que o login continue mesmo se a sincronização falhar
    }
  } catch {}
}

export async function loginWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  );
  await ensureUserRegistered(result.user);
  return result;
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  phone?: string,
) {
  // Passo 1: cria conta no Firebase
  const result = await createUserWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  );
  await updateProfile(result.user, { displayName: name });

  // Passo 2: registra perfil no backend com o token recém-gerado
  const idToken = await result.user.getIdToken();

  const response = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, ...(phone ? { phone } : {}) }),
  });

  if (!response.ok) {
    // Reverte: remove o usuário recém-criado para evitar conta sem perfil
    await result.user.delete();
    const body = await response.json().catch(() => null);
    const message =
      body?.message ??
      body?.error ??
      `Erro ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  return result;
}

export async function loginWithGoogleIdToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(firebaseAuth, credential);
  await ensureUserRegistered(result.user);
  return result;
}

export async function loginWithApple(
  identityToken: string,
  fullName?: { givenName?: string | null; familyName?: string | null } | null,
) {
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({ idToken: identityToken });
  const result = await signInWithCredential(firebaseAuth, credential);

  // Apple só envia fullName no primeiro login — não sobrescrever se já existe
  if (
    !result.user.displayName &&
    (fullName?.givenName || fullName?.familyName)
  ) {
    const displayName = [fullName.givenName, fullName.familyName]
      .filter(Boolean)
      .join(" ");
    if (displayName) await updateProfile(result.user, { displayName });
  }

  await ensureUserRegistered(result.user);
  return result;
}

export async function requestPasswordReset(email: string) {
  return sendPasswordResetEmail(firebaseAuth, email);
}

export async function logout() {
  return signOut(firebaseAuth);
}

export async function sendCurrentUserEmailVerification(): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.email) {
    throw new Error("Usuário sem e-mail para verificação.");
  }
  await user.sendEmailVerification();
}

export async function refreshCurrentUser(): Promise<User | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  await user.reload();
  return firebaseAuth.currentUser;
}

export { getIdToken } from "./token";

// ─── Phone Verification ───────────────────────────────────────────────────────

export interface BackendUser {
  id: string;
  name: string;
  phone?: string | null;
  phoneVerifiedAt?: string | null;
}

export async function sendPhoneCode(
  phoneNumber: string,
  recaptchaVerifier: ApplicationVerifier,
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptchaVerifier);
}

export async function linkPhoneWithCode(
  verificationId: string,
  code: string,
  phoneNumber: string,
): Promise<BackendUser> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  try {
    await linkWithCredential(firebaseAuth.currentUser!, credential);
  } catch (err: unknown) {
    const errorCode =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : "";
    if (errorCode === "auth/provider-already-linked") {
      // Phone already linked — update it instead of linking
      await updatePhoneNumber(firebaseAuth.currentUser!, credential);
    } else {
      throw err; // auth/credential-already-in-use etc. bubble up to the modal
    }
  }
  // Force-refresh so the ID token carries the updated phone_number claim
  await firebaseAuth.currentUser!.getIdToken(true);
  return api.patch<BackendUser>("/users/me", { phone: phoneNumber });
}

export async function unlinkPhone(): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Usuário não encontrado.");
  try {
    await unlink(user, PhoneAuthProvider.PROVIDER_ID);
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : "";
    if (code !== "auth/no-such-provider") throw err;
  }
  await user.getIdToken(true);
  await api.patch("/users/me", { phone: null });
}

/**
 * Finaliza o cadastro com telefone já verificado.
 * Deve ser chamado dentro do onVerified do PhoneVerifyModal, após confirm() ter
 * criado um usuário phone-auth temporário no Firebase.
 * Vincula email+senha a esse usuário, atualiza o displayName e registra no backend.
 * O token gerado já carrega o claim phone_number, então o backend seta phoneVerifiedAt=NOW.
 */
export async function completeRegistrationWithPhone(
  email: string,
  password: string,
  name: string,
  phoneNumber: string, // E.164 ex: "+5511999998888"
): Promise<void> {
  const phoneUser = firebaseAuth.currentUser!; // definido pelo confirm() no modal
  const emailCredential = EmailAuthProvider.credential(email, password);
  try {
    await linkWithCredential(phoneUser, emailCredential);
  } catch (err: unknown) {
    // Se falhar (ex: email já em uso), remove o usuário phone temporário e relança
    await signOut(firebaseAuth);
    throw err;
  }
  await updateProfile(phoneUser, { displayName: name });
  // Force-refresh para o token carregar o claim phone_number
  const idToken = await phoneUser.getIdToken(true);
  const response = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, phone: phoneNumber }),
  });
  if (!response.ok) {
    await signOut(firebaseAuth);
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? body?.error ?? `Erro ${response.status}`);
  }
}
