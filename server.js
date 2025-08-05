import Fastify from 'fastify'
import cors from '@fastify/cors'
import reportRoutes from './routes/report.js'

const fastify = Fastify()

await fastify.register(cors, {
  origin: true
})

fastify.register(reportRoutes)

const PORT = process.env.PORT || 3000
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
})
