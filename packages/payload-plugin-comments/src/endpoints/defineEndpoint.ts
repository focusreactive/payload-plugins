import type { Endpoint } from "payload";
import { PLUGIN_NAME } from "../constants";
import type { Response as ServiceResponse, ServiceContext } from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";

type EndpointService<TArgs, TData> = (
  context: ServiceContext,
  args: TArgs
) => Promise<ServiceResponse<TData>>;

export function defineEndpoint<TArgs, TData>(
  path: string,
  service: EndpointService<TArgs, TData>
): Endpoint {
  return {
    path,
    method: "post",
    handler: async (req) => {
      if (!req.user) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }

      let args: TArgs;

      try {
        args = (await req.json?.()) as TArgs;
      } catch {
        return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
      }

      try {
        const result = await service(
          { payload: req.payload, user: req.user, headers: req.headers },
          args
        );

        return Response.json(result, { status: result.success ? 200 : 400 });
      } catch (err) {
        req.payload.logger.error({ err, msg: `[${PLUGIN_NAME}] ${path} failed` });

        return Response.json(
          { success: false, error: getDefaultErrorMessage(err) },
          { status: 500 }
        );
      }
    },
  };
}
