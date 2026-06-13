import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import { resolve } from "node:path";

const EVENTS_POLYFILL = resolve(
  import.meta.dirname,
  "../../../../node_modules/.pnpm/events@3.3.0/node_modules/events/events.js",
);

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
  ],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
  // Polyfill Node.js `events` so test/factories.ts (which uses EventEmitter)
  // can be imported in scene stories running in the browser environment.
  viteFinal: async (config) =>
    mergeConfig(config, {
      resolve: {
        alias: { events: EVENTS_POLYFILL },
      },
    }),
};
export default config;
