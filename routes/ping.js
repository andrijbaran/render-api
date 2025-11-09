export default async function (fastify) {
  fastify.get('/api/ping', async (_, reply) => {
    console.log('🔔 Ping endpoint called');
    try {
      return { status: 'ok', time: new Date().toISOString() };
    } catch (err) {
      console.error('❌ Ping error:', err);
      return reply.status(500).send({ error: err.message });
    }
  });
}