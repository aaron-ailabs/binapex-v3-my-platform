import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client'

export const registry = new Registry()
collectDefaultMetrics({ register: registry })

export const httpRequests = new Counter({ name: 'http_requests_total', help: 'Total HTTP requests', registers: [registry], labelNames: ['method','route','status'] })
export const httpDuration = new Histogram({ name: 'http_request_duration_ms', help: 'HTTP request duration in ms', registers: [registry], buckets: [50,100,200,500,1000,2000], labelNames: ['method','route','status'] })
export const tradeExecutionDuration = new Histogram({ name: 'trade_execution_duration_ms', help: 'Trade execution duration in ms', registers: [registry], buckets: [1000,5000,10000,30000,60000,120000] })
