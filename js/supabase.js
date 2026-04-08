// Supabase client — reads credentials from config.js (window.APP_CONFIG)
(function () {
  var config = window.APP_CONFIG;
  if (!config || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    console.error("APP_CONFIG missing. Make sure config.js is loaded before supabase.js.");
    window.supabaseClient = null;
    return;
  }
  if (typeof supabase === "undefined") {
    console.error("Supabase CDN not loaded. Add: <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"><\/script>");
    window.supabaseClient = null;
    return;
  }
  window.supabaseClient = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
})();
