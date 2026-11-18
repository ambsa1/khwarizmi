// Cloud settings (Supabase). The project URL and the anon key are public by design: every visitor's browser needs
// them to send error reports and the family's progress. What protects the data is the database's own row-level
// security (tools/cloud/schema.sql): visitors can only ADD rows; only the developer account can READ them.
// Leave url empty and the app works exactly as before, fully offline, with nothing sent anywhere.
export const CLOUD = {
  url: 'https://elkbvztdcahkkeicpxtn.supabase.co',
  anonKey: 'sb_publishable_DLZ1qv3-0DhhOwfUwkeF8g_RFB9VR_A',   // the project's publishable key (public by design)
  // the developer account's e-mail, sealed with the developer code (opened only after the right code is entered)
  devEmailSealed: { salt: 'ml3HrEErC9RP/7xfM5SwXw==', data: 'tmJNbpMnMkQ9fn+ThSAII/y6OM5gWhcf/QY4yoEs8V40E4vFasMYn1Ob6NG+rB1Qf29dLXq8m6VClQ==' },
};
export const cloudOn = () => !!(CLOUD.url && CLOUD.anonKey);

/** The developer gate: only a slow salted hash of the developer code ships with the app (PBKDF2-SHA256). */
export const DEV_GATE = { salt: 'u4hMw2oICXb4JWrGBd9MaA==', hash: 'AcvQj1Gz0jhbLb9VFzLF+csWEjEo5CSOzxzDm2MR7C4=', iter: 250000 };
