import type { JobsConfig } from "payload";

export function overrideJobs(
  jobsConfig: JobsConfig | undefined,
  queue: string
): JobsConfig {
  const existingJobsCollectionOverrides = jobsConfig?.jobsCollectionOverrides;

  return {
    ...jobsConfig,
    jobsCollectionOverrides: ({ defaultJobsCollection }) => {
      const baseJobsCollection = existingJobsCollectionOverrides
        ? existingJobsCollectionOverrides({ defaultJobsCollection })
        : defaultJobsCollection;

      return {
        ...baseJobsCollection,
        hooks: {
          ...baseJobsCollection.hooks,
          beforeChange: [
            ...(baseJobsCollection.hooks?.beforeChange ?? []),
            ({ data }) => {
              if (data.taskSlug === "schedulePublish") {
                return { ...data, queue };
              }

              return data;
            },
          ],
        },
      };
    },
    runHooks: true,
  };
}
