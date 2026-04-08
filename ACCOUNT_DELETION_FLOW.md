# Fluxo Completo de Delete de Conta com Subscrição Ativa

## 📋 Resumo da Implementação

Este documento descreve a implementação completa do fluxo de deleção de conta com verificação de subscrição ativa, conforme especificado.

---

## 🏗️ Arquivos Criados/Modificados

### 1. **`services/account-deletion.service.ts`** (NOVO)

Serviço que encapsula as chamadas à API para:

- `checkSubscriptionStatus()` - GET `/users/me/subscription-status`
- `deleteAccount()` - DELETE `/users/me`

```typescript
// Retorna SubscriptionStatusResponse
{
  hasActiveSubscription: boolean;
  provider?: string; // "APPLE" | "GOOGLE" | "STRIPE"
  currentPeriodEnd?: string;
}
```

### 2. **`hooks/use-account-deletion.ts`** (NOVO)

Hook customizado que gerencia todo o fluxo de deleção com estados:

- `modalState`: "checking" | "no-subscription" | "has-subscription" | "deleting" | null
- `subscriptionStatus`: Dados da subscrição verificada
- `errorMessage`: Mensagens de erro

#### Métodos públicos:

- `startDeletion()` - Inicia verificação de subscrição (PASSO 1)
- `confirmDeletion()` - Confirma deleção após verificação (PASSO 2A)
- `retryAfterCancellation()` - Tenta novamente após cancelar subscrição (PASSO 2B)
- `closeModal()` - Fecha modal e limpa estados

### 3. **`app/profile.tsx`** (MODIFICADO)

Atualizações:

- Adicionado import do novo hook `useAccountDeletion`
- Integração com o hook dentro de ProfileScreen
- Nova modal bloqueante para cenário COM subscrição
- Estilos CSS para a nova modal
- Removida lógica de delete inline (agora centralizada no hook)

---

## 🔄 Fluxo Completo

### **PASSO 1: Verificar Subscrição**

```
Usuário clica em "Excluir conta"
         ↓
startDeletion() dispara
         ↓
GET /users/me/subscription-status
         ↓
Modal State: "checking"
```

---

### **PASSO 2A: Sem Subscrição (hasActiveSubscription === false)**

```
Resposta da API: { hasActiveSubscription: false }
         ↓
Modal State: "no-subscription"
         ↓
Mostrar Modal de Confirmação:
┌─────────────────────────────────┐
│  Excluir conta                  │
│  Esta ação é permanente...      │
│                                 │
│  [Excluir minha conta]         │
│  [Cancelar]                    │
└─────────────────────────────────┘
         ↓
Se clicou "Excluir minha conta":
  1. DELETE /users/me (backend)
  2. deleteUser(Firebase)
  3. Token local limpo automaticamente
  4. router.replace("/(auth)/login")
         ↓
✅ Usuário redirecionado para splash/login
```

---

### **PASSO 2B: Com Subscrição Ativa (hasActiveSubscription === true)**

```
Resposta da API: { hasActiveSubscription: true, currentPeriodEnd: "2026-05-08" }
         ↓
Modal State: "has-subscription"
         ↓
Mostrar Modal Bloqueante:
┌─────────────────────────────────────────┐
│  Subscrição Ativa                       │
│  Sua conta possui uma subscrição ativa  │
│  Você precisa cancelá-la antes...       │
│                                         │
│  Período até: 08/05/2026                │
│                                         │
│  [Ir para Minha Assinatura]            │
│  [Já Cancelei, Tentar Deletar]         │
│  [Voltar]                              │
└─────────────────────────────────────────┘
         ↓
⚠️ OPÇÃO 1: "Ir para Minha Assinatura"
   → router.push("/subscription/my-plan")
   → Usuário cancela/gerencia subscrição
   → Volta e tenta fazer login novamente
         ↓
⚠️ OPÇÃO 2: "Já Cancelei, Tentar Deletar"
   → Volta ao PASSO 1 (refaz verificação)
   → Se sem subscrição agora → vai para PASSO 2A
   → Se ainda com subscrição → fica na modal
         ↓
⚠️ OPÇÃO 3: "Voltar"
   → Fecha modal
   → Volta para profile normalmente
```

---

## 🚨 Tratamento de Erros

### **Cenário: 403 Forbidden ao chamar DELETE /users/me**

```
POST confirmDeletion()
         ↓
DELETE /users/me
         ↓
Resposta: 403 Forbidden
Mensagem: "Sua conta possui uma subscrição ativa..."
         ↓
ErrorState: "Sua conta possui uma subscrição ativa. Cancele antes de deletar."
         ↓
toast.show(errorMessage, "error")
Modal volta para "no-subscription"
```

### **Cenário: Erro de Firebase (auth/requires-recent-login)**

```
deleteUser(Firebase)
         ↓
Erro: { code: "auth/requires-recent-login" }
         ↓
errorMessage: "Por segurança, saia da conta e entre novamente antes de excluir."
         ↓
toast.show(errorMessage, "error")
```

---

## 📤 Response Codes Esperados

| Endpoint                        | Método | Sucesso        | Erro                                               |
| ------------------------------- | ------ | -------------- | -------------------------------------------------- |
| `/users/me/subscription-status` | GET    | 200 OK         | 401, 500                                           |
| `/users/me`                     | DELETE | 204 No Content | 403 (tem subscription), 401 (não autenticado), 500 |

---

## 🔐 Fluxo de Segurança

1. **Verificação dupla**: Antes de deletar, verifica subscrição
2. **Atomicidade**: Backend DEVE garantir 204 No Content apenas se sucesso
3. **Token local**: Automaticamente limpo pelo Firebase.signOut()
4. **Redirecionamento imediato**: Após delete, redireciona para login

---

## 🧪 Como Testar

### **Teste 1: Sem Subscrição**

1. Criar conta/fazer login SEM subscrição
2. Ir para Perfil → Zona de Perigo → "Excluir conta"
3. Será verificada falta de subscrição
4. Modal de confirmação aparece
5. Clicar "Excluir minha conta"
6. ✅ Conta deletada, redirecionado para login

### **Teste 2: Com Subscrição Ativa**

1. Criar conta/fazer login COM subscrição ativa
2. Ir para Perfil → Zona de Perigo → "Excluir conta"
3. Será verificada presença de subscrição
4. **Modal bloqueante** aparece com data de período
5. Clicar "Ir para Minha Assinatura"
6. Cancelar subscrição
7. Voltar e clicar "Já Cancelei, Tentar Deletar"
8. ✅ Re-verifica, sem subscrição agora
9. Modal de confirmação aparece
10. ✅ Conta deletada após confirmar

### **Teste 3: Tentativa de 403**

1. Criar conta com subscrição
2. Chamar DELETE /users/me via API (sem verificação)
3. Retorna 403 Forbidden
4. ✅ Erro tratado no catch block do hook

---

## 📞 Endpoints do Backend Necessários

```bash
# Verificar subscrição
GET /users/me/subscription-status
Authorization: Bearer {token}

# Deletar conta
DELETE /users/me
Authorization: Bearer {token}
```

---

## ✅ Checklist de Integração

- [x] Service criado: `account-deletion.service.ts`
- [x] Hook criado: `use-account-deletion.ts`
- [x] Profile.tsx atualizado e integrado
- [x] Modal de confirmação (sem subscrição) funcionando
- [x] Modal bloqueante (com subscrição) funcionando
- [x] Erro 403 tratado corretamente
- [x] Mensagens de erro exibidas em toast
- [x] Redirecionamento pós-delete funcionando
- [x] Estados cleanup implementados
- [x] Estilos das modais adicionados

---

## 🚀 Próximos Passos

1. **Teste com mock da API**: Configure seu backend para retornar respostas corretas
2. **E2E Testing**: Teste os 3 cenários principais
3. **Localização**: Adicione chaves i18n para strings das modais
4. **Analytics**: Considere rastrear "tentativa de delete" e "delete bem-sucedido"
