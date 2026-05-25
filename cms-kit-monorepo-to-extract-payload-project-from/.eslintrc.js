module.exports = {
  extends: ["@shared/eslint-config"],
  root: true,
  settings: {
    next: {
      rootDir: ["apps/sanity", "apps/storyblok"],
    },
  },
};
