/**
 * Neon Project Configuration Policy
 * Configures serverless Postgres service for TN Political War Room.
 */
export default {
  services: {
    postgres: {
      tier: "serverless",
    },
  },
};
