import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qajclxkxhrtdxrbmrsly.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_UkKgW4hLem-j2kR30XWTGg_wx9bSrfX";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
