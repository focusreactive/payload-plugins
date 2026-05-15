module.exports = {
  extends: ["@repo/eslint-config", "plugin:tailwindcss/recommended"],
  plugins: ["tailwindcss"],
  root: true,
  rules: {
    "tailwindcss/classnames-order": "off",
    "tailwindcss/no-custom-classname": "off",
  },
  settings: {
    tailwindcss: {
      callees: ["cn", "cva"],
      config: "tailwind.config.ts",
    },
  },
};
