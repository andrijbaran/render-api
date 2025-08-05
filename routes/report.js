import { getReport } from '../services/firestore.js'

export default async function (fastify) {
  fastify.get('/api/report/:period/:company', async (req, reply) => {
    const { period, company } = req.params
    const token = req.headers['x-api-key']

    if (token !== process.env.API_KEY) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    try {
      const data = await getReport(period, company)
      if (!data) return reply.status(404).send({ error: 'Not found' })
      return { data }
    } catch (err) {
      console.error(err)
      return reply.status(500).send({ error: 'Server error' })
    }
  })
}
