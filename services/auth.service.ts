import {
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
  const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
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
      "Authorization": `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, ...(phone ? { phone } : {}) }),
  });

  if (!response.ok) {
    // Reverte: remove o usuário recém-criado para evitar conta sem perfil
    await result.user.delete();
    const body = await response.json().catch(() => null);
    const message =
      body?.message ?? body?.error ?? `Erro ${response.status}: ${response.statusText}`;
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
  if (!result.user.displayName && (fullName?.givenName || fullName?.familyName)) {
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

export async function getIdToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

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
  await linkWithCredential(firebaseAuth.currentUser!, credential);
  // Force-refresh so the ID token carries the phone_number claim
  await firebaseAuth.currentUser!.getIdToken(true);
  return api.patch<BackendUser>("/users/me", { phone: phoneNumber });
}
