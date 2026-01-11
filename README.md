# Real-Time Transaction Reconciliation System

A production-style real-time reconciliation engine that ingests transaction events
from merchants, gateways, and banks, detects mismatches, classifies failure scenarios,
and visualizes results live via a dashboard.

## Features

- Real-time ingestion API
- Redis-based buffering
- Rule-based reconciliation engine
- Scenario classification (amount mismatch, status conflict, etc.)
- Live WebSocket dashboard
- Transaction simulator for chaos testing

## Tech Stack

- Node.js, Express
- MongoDB
- Redis
- Socket.IO
- Chart.js

## How to Run

1. Start MongoDB and Redis
2. Start backend (`node server.js`)
3. Serve frontend (`npx serve .`)
4. Run simulator (`node simulate.js`)
