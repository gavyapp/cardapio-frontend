// Dados do supabase/seed.sql usados pelos testes. Ninguém altera estes
// registros num teste: quem precisa de dados próprios cria com nome único.

export const SEED_STORE = {
  name: "Stack Burguer",
  slug: "stack-burguer",
};

export const SEED_OWNER = {
  email: "dono@stackburguer.test",
  password: "stack1234",
};

export const OWNER_STORAGE_STATE = "e2e/.auth/owner.json";
