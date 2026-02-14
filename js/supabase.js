// Supabase client - load after: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
(function () {
  const SUPABASE_URL = "https://aaxfzkfelxsizhbtdofo.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_MQ7WTCYKKn_Na3sQNAcbhQ_CgPaj1_z";

  if (typeof supabase === "undefined") {
    console.error("Supabase CDN not loaded. Add: <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"></script>");
    window.supabaseClient = null;
    return;
  }

  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
