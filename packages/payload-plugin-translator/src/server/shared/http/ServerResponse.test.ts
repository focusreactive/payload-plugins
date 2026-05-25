import { describe, it, expect } from "vitest";

import { ServerResponse } from "./ServerResponse";

describe("ServerResponse", () => {
  describe("success responses", () => {
    it("success returns 200 with data", async () => {
      const response = ServerResponse.success({ id: 1 });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { id: 1 } });
    });

    it("success returns 200 with null data by default", async () => {
      const response = ServerResponse.success();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: null });
    });

    it("created returns 201 with data", async () => {
      const response = ServerResponse.created({ id: "new-id" });
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ data: { id: "new-id" } });
    });

    it("accepted returns 202 with message", async () => {
      const response = ServerResponse.accepted("Processing started");
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ message: "Processing started" });
    });

    it("noContent returns 204 with no body", async () => {
      const response = ServerResponse.noContent();
      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });
  });

  describe("client error responses", () => {
    it("badRequest returns 400", async () => {
      const response = ServerResponse.badRequest("Invalid input");
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ message: "Invalid input" });
    });

    it("badRequest includes details when provided", async () => {
      const response = ServerResponse.badRequest("Validation failed", {
        fields: ["name"],
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        details: { fields: ["name"] },
        message: "Validation failed",
      });
    });

    it("unauthorized returns 401", async () => {
      const response = ServerResponse.unauthorized();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Unauthorized" });
    });

    it("forbidden returns 403", async () => {
      const response = ServerResponse.forbidden("Access denied");
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ message: "Access denied" });
    });

    it("notFound returns 404", async () => {
      const response = ServerResponse.notFound();
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: "Resource not found" });
    });

    it("methodNotAllowed returns 405", async () => {
      const response = ServerResponse.methodNotAllowed();
      expect(response.status).toBe(405);
      expect(await response.json()).toEqual({ message: "Method not allowed" });
    });

    it("conflict returns 409", async () => {
      const response = ServerResponse.conflict("Resource already exists");
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        message: "Resource already exists",
      });
    });

    it("unprocessableEntity returns 422", async () => {
      const response = ServerResponse.unprocessableEntity("Cannot process", {
        reason: "invalid",
      });
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        details: { reason: "invalid" },
        message: "Cannot process",
      });
    });

    it("tooManyRequests returns 429", async () => {
      const response = ServerResponse.tooManyRequests();
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ message: "Too many requests" });
    });
  });

  describe("server error responses", () => {
    it("internalServerError returns 500", async () => {
      const response = ServerResponse.internalServerError();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: "Internal server error",
      });
    });

    it("notImplemented returns 501", async () => {
      const response = ServerResponse.notImplemented();
      expect(response.status).toBe(501);
      expect(await response.json()).toEqual({ message: "Not implemented" });
    });

    it("badGateway returns 502", async () => {
      const response = ServerResponse.badGateway();
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ message: "Bad gateway" });
    });

    it("serviceUnavailable returns 503", async () => {
      const response = ServerResponse.serviceUnavailable();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ message: "Service unavailable" });
    });

    it("gatewayTimeout returns 504", async () => {
      const response = ServerResponse.gatewayTimeout();
      expect(response.status).toBe(504);
      expect(await response.json()).toEqual({ message: "Gateway timeout" });
    });
  });

  describe("validation helpers", () => {
    it("validationError returns 400 with details array", async () => {
      const errors = [{ field: "name", message: "required" }];
      const response = ServerResponse.validationError(errors);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        details: errors,
        message: "Validation error",
      });
    });

    it("invalidInput returns 400 with field name", async () => {
      const response = ServerResponse.invalidInput(
        "email",
        "Must be a valid email"
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        field: "email",
        message: "Must be a valid email",
      });
    });

    it("invalidInput uses default message", async () => {
      const response = ServerResponse.invalidInput("age");
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        field: "age",
        message: "Invalid value for field: age",
      });
    });

    it("missingRequiredField returns 400", async () => {
      const response = ServerResponse.missingRequiredField("username");
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        field: "username",
        message: "Missing required field: username",
      });
    });
  });

  describe("custom response", () => {
    it("custom returns specified status and message", async () => {
      const response = ServerResponse.custom("Custom message", 418);
      expect(response.status).toBe(418);
      expect(await response.json()).toEqual({ message: "Custom message" });
    });

    it("custom includes data when provided", async () => {
      const response = ServerResponse.custom("With data", 200, {
        extra: "info",
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        data: { extra: "info" },
        message: "With data",
      });
    });
  });
});
