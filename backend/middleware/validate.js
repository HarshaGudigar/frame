/**
 * Zod Validation Middleware — Validates request body/params/query against a Zod schema.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), handler);
 *
 * On validation failure, returns a clean 400 response with field-level errors.
 */

/**
 * Creates validation middleware for an Express route.
 *
 * @param {Object} schemas - Zod schemas to validate against
 * @param {import('zod').ZodSchema} [schemas.body]   - Validate req.body
 * @param {import('zod').ZodSchema} [schemas.params] - Validate req.params
 * @param {import('zod').ZodSchema} [schemas.query]  - Validate req.query
 */
function validate(schemas) {
    return (req, res, next) => {
        const errors = [];

        for (const [source, schema] of Object.entries(schemas)) {
            if (!schema) continue;

            const result = schema.safeParse(req[source]);

            if (!result.success) {
                result.error.issues.forEach((issue) => {
                    errors.push({
                        field: issue.path.join('.') || source,
                        message: issue.message,
                        source,
                    });
                });
            } else {
                // Replace with parsed (and transformed) data
                req[source] = result.data;
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
        }

        next();
    };
}

module.exports = { validate };
