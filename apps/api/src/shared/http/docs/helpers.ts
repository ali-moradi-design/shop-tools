/** Small builders for the OpenAPI path files. */
export const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
export const json = (schema: object) => ({ content: { 'application/json': { schema } } });
export const data = (schema: object) => json({ type: 'object', properties: { data: schema } });
export const list = (name: string) => data({ type: 'array', items: ref(name) });
export const paged = (name: string) =>
  json({
    type: 'object',
    properties: {
      data: { type: 'array', items: ref(name) },
      meta: {
        type: 'object',
        properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' } },
      },
    },
  });
export const query = (name: string, schema: object, description?: string) => ({
  name,
  in: 'query',
  schema,
  ...(description && { description }),
});
export const path = (name: string, description?: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
  ...(description && { description }),
});
export const signedIn = [{ bearerAuth: [] }, { cookieAuth: [] }];
/** Signed-in user, or a visitor identified by the httpOnly guestCart cookie. */
export const signedInOrGuest = [{ bearerAuth: [] }, { cookieAuth: [] }, { guestCart: [] }, {}];
export const errors = {
  400: { description: 'Validation or business rule error', ...json(ref('Error')) },
  401: { description: 'Sign-in required' },
  403: { description: 'Missing permission or cross-site request blocked' },
  404: { description: 'Not found' },
};
