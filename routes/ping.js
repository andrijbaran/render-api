fastify.get('/api/ping', async (_, reply) => {
  return { status: 'ok', time: new Date().toISOString() };
});
