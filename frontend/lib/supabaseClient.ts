import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// A chave pública do Supabase é exposta como NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase não configuradas: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY são obrigatórias.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
