import type { Preview } from "@storybook/react-vite";
// Pull in the app's full Tailwind v4 layer + shadcn design tokens so stories
// render with the real theme. The dark variant is class-based
// (`@custom-variant dark (&:is(.dark *))`), so the decorator wraps stories in a
// `.dark` element to exercise dark-mode styles.
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "todo" },
  },
  globalTypes: {
    theme: {
      description: "App theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme === "dark";
      return (
        <div className={dark ? "dark" : ""}>
          <div className="bg-background text-foreground p-6">
            <Story />
          </div>
        </div>
      );
    },
  ],
};

export default preview;
