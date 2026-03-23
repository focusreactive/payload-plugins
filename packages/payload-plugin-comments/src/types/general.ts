export type LoadingStatus = "idle" | "loading" | "error" | "success";

export type Response<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };
