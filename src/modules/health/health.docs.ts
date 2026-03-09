/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check API and database health
 *     responses:
 *       '200':
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       '503':
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
export {};
