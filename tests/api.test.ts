import request from 'supertest'
import express from 'express'
import { describe, it, expect } from 'vitest'

const app = express()
app.get('/api/test', (_req, res) => {
  res.json({ message: 'ok' })
})

describe('sample api endpoint', () => {
  it('responds with json', async () => {
    const res = await request(app).get('/api/test')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ message: 'ok' })
  })
})
