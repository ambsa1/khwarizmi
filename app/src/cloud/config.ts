// Cloud settings (Supabase). The project URL and the anon key are public by design: every visitor's browser needs
// them to send error reports and the family's progress. What protects the data is the database's own row-level
// security (tools/cloud/schema.sql): visitors can only ADD rows; only the developer account can READ them.
// Leave url empty and the app works exactly as before, fully offline, with nothing sent anywhere.
export const CLOUD = {
  url: '',            // e.g. https://abcdefgh.supabase.co
  anonKey: '',        // the project's "anon public" key
  devEmail: '',       // the developer account created in the Supabase dashboard (its password is the developer code)
};
export const cloudOn = () => !!(CLOUD.url && CLOUD.anonKey);

/** The developer gate: only a slow salted hash of the developer code ships with the app (PBKDF2-SHA256). */
export const DEV_GATE = { salt: 'u4hMw2oICXb4JWrGBd9MaA==', hash: 'AcvQj1Gz0jhbLb9VFzLF+csWEjEo5CSOzxzDm2MR7C4=', iter: 250000 };
