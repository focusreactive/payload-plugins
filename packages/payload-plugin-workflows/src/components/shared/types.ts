/** What the plugin passes every admin component (`clientProps`, also on `admin.custom.workflows`). */
export interface WorkflowsClientProps {
  instancesSlug: string;
  /** Relative to the API route. */
  endpoints: {
    state: string;
    start: string;
    fire: string;
    abort: string;
    instances: string;
    definitions: string;
  };
  /** Relative to the admin route. */
  viewPath: string;
}
