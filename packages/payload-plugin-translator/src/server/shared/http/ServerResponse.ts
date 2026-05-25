export class ServerResponse {
  static success(data: unknown = null): Response {
    return Response.json({ data }, { status: 200 })
  }

  static created(data: unknown = null): Response {
    return Response.json({ data }, { status: 201 })
  }

  static accepted(message = 'Request accepted'): Response {
    return Response.json({ message }, { status: 202 })
  }

  static noContent(): Response {
    return new Response(null, { status: 204 })
  }

  static badRequest(message = 'Bad request', details?: unknown): Response {
    const body = details ? { message, details } : { message }
    return Response.json(body, { status: 400 })
  }

  static unauthorized(message = 'Unauthorized'): Response {
    return Response.json({ message }, { status: 401 })
  }

  static forbidden(message = 'Forbidden'): Response {
    return Response.json({ message }, { status: 403 })
  }

  static notFound(message = 'Resource not found'): Response {
    return Response.json({ message }, { status: 404 })
  }

  static methodNotAllowed(message = 'Method not allowed'): Response {
    return Response.json({ message }, { status: 405 })
  }

  static conflict(message = 'Conflict'): Response {
    return Response.json({ message }, { status: 409 })
  }

  static unprocessableEntity(message = 'Unprocessable entity', details?: unknown): Response {
    const body = details ? { message, details } : { message }
    return Response.json(body, { status: 422 })
  }

  static tooManyRequests(message = 'Too many requests'): Response {
    return Response.json({ message }, { status: 429 })
  }

  static internalServerError(message = 'Internal server error'): Response {
    return Response.json({ message }, { status: 500 })
  }

  static notImplemented(message = 'Not implemented'): Response {
    return Response.json({ message }, { status: 501 })
  }

  static badGateway(message = 'Bad gateway'): Response {
    return Response.json({ message }, { status: 502 })
  }

  static serviceUnavailable(message = 'Service unavailable'): Response {
    return Response.json({ message }, { status: 503 })
  }

  static gatewayTimeout(message = 'Gateway timeout'): Response {
    return Response.json({ message }, { status: 504 })
  }

  static validationError<D = unknown>(details: D[]): Response {
    return Response.json({ message: 'Validation error', details }, { status: 400 })
  }

  static invalidInput(field: string, message?: string): Response {
    const errorMessage = message || `Invalid value for field: ${field}`
    return Response.json({ message: errorMessage, field }, { status: 400 })
  }

  static missingRequiredField(field: string): Response {
    return Response.json({ message: `Missing required field: ${field}`, field }, { status: 400 })
  }

  static custom(message: string, status: number, data?: unknown): Response {
    const body = data ? { message, data } : { message }
    return Response.json(body, { status })
  }
}
