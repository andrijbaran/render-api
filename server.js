import Fastify from 'fastify';
import cors from '@fastify/cors';
import pingRoutes from './routes/ping.js';
import reportRoutes from './routes/report.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true
})

fastify.register(pingRoutes);
fastify.register(reportRoutes);

const PORT = process.env.PORT || 0;

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1)
  }
  console.log(`Server listening on port ${PORT}`);  
})