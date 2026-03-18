export interface SchedulePublicationPluginConfig {
  /** Collection slugs to enable scheduled publishing for.
   * @example ['posts', 'page']
   */
  collections?: string[]
  /** Global slugs to enable scheduled publishing for.
   * @example ['site-settings']
   */
  globals?: string[]
  /**
   * Queue name to isolate schedulePublish jobs.
   * When set, jobs are routed to this queue and the /scheduled-publish/run endpoint will only process this queue.
   * @default "scheduled-publish"
   */
  queue?: string
  /** Bearer token used to authenticate calls to the /api/scheduled-publish/run endpoint */
  secret: string
}
