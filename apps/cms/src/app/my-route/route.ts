import { getPayloadClient } from "@/dal";

export const GET = async (request: Request) => {
  const payload = await getPayloadClient();

  return Response.json({
    message: "This is an example of a custom route.",
  });
};
