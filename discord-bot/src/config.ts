import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  discordClientId: required("DISCORD_CLIENT_ID"),
  discordGuildId: required("DISCORD_GUILD_ID"),
  hllrconBaseUrl: required("HLLRCON_BASE_URL").replace(/\/+$/, ""),
  hllrconAppUsername: process.env.HLLRCON_APP_USERNAME ?? "",
  hllrconAppPassword: process.env.HLLRCON_APP_PASSWORD ?? "",
  hllServerHost: required("HLL_SERVER_HOST"),
  hllServerPort: Number(process.env.HLL_SERVER_PORT ?? "28015"),
  hllServerPassword: required("HLL_SERVER_PASSWORD"),
  categoryName: process.env.HLL_DISCORD_CATEGORY_NAME ?? "HLL Control",
  defaultAdminName: process.env.HLL_DEFAULT_ADMIN_NAME ?? "Discord Bot",
  stateFile: path.resolve(process.env.HLL_STATE_FILE ?? "./data/state.json"),
  roleObserver: process.env.HLL_ROLE_OBSERVER ?? "HLL Observer",
  roleModerator: process.env.HLL_ROLE_MODERATOR ?? "HLL Moderator",
  roleSeniorAdmin: process.env.HLL_ROLE_SENIOR_ADMIN ?? "HLL Senior Admin",
  roleAdmin: process.env.HLL_ROLE_ADMIN ?? "HLL Admin"
};
