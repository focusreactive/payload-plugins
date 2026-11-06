/**
 * What a runner can do beyond accepting work.
 *
 * Declared by the provider rather than read off a runner: routes are registered while the config is
 * being built, before any `payload` exists. A capability left false means the route is not
 * registered and the admin draws no control for it, so no button answers 404.
 *
 * `assertTaskRunnerContract` asserts that a declared capability is really implemented.
 *
 * @since 1.0.0
 */
export type RunnerCapabilities = {
  stop: boolean;
  run: boolean;
};
