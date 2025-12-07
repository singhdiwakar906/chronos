# ⏰ Chronos - Distributed Job Scheduler

A robust and scalable distributed job scheduling system that can execute, manage, and monitor a variety of tasks. Built with Node.js, Express, PostgreSQL, Redis, and BullMQ.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)
![Redis](https://img.shields.io/badge/Redis-7+-red)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Job Types](#-job-types)
- [Scheduling](#-scheduling)
- [Monitoring](#-monitoring)
- [Design Decisions](#-design-decisions)
- [Contributing](#-contributing)

## ✨ Features

### Core Features

- **Job Submission**: Submit jobs for immediate or scheduled execution
- **Recurring Jobs**: Support for cron-based recurring schedules (hourly, daily, weekly, monthly)
- **Job Management**: Full CRUD operations - create, view, update, pause, resume, cancel jobs
- **Failure Handling**: Automatic retries with configurable backoff strategies
- **Notifications**: Email notifications for job failures and completions
- **Logging & Monitoring**: Comprehensive logging and real-time monitoring dashboard

### Technical Features

- **RESTful API**: Well-documented API endpoints with validation
- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (admin/user)
- **Rate Limiting**: Protection against abuse
- **Scalable Architecture**: Horizontal scaling with multiple workers
- **Docker Support**: Easy deployment with Docker Compose

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client/Frontend                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway/Load Balancer                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Chronos API Server                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Routes    │  │ Controllers │  │      Services           │  │
│  │  - Auth     │  │  - Auth     │  │  - Job Scheduler        │  │
│  │  - Jobs     │  │  - Jobs     │  │  - Job Executor         │  │
│  │  - Monitor  │  │  - Monitor  │  │  - Notification Service │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────────┐                 ┌───────────────────────────┐
│    PostgreSQL     │                 │          Redis            │
│  - Users          │                 │  - Job Queue (BullMQ)     │
│  - Jobs           │                 │  - Scheduled Jobs Queue   │
│  - Executions     │                 │  - Rate Limiting          │
│  - Logs           │                 └───────────────────────────┘
└───────────────────┘                               │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │       Chronos Workers         │
                                    │  ┌─────────┐  ┌─────────┐    │
                                    │  │Worker 1 │  │Worker 2 │... │
                                    │  └─────────┘  └─────────┘    │
                                    └───────────────────────────────┘
```

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/chronos.git
cd chronos

# Copy environment file
cp env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

The API will be available at `http://localhost:3000`

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/chronos.git
cd chronos

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Start PostgreSQL and Redis (or use Docker)
docker-compose up -d postgres redis

# Run database migrations
npm run migrate

# Start the API server
npm run dev

# In another terminal, start the worker
npm run dev:worker
```

## 📦 Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chronos.git
   cd chronos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp env.example .env
   ```

4. **Update `.env` with your settings**:
   - Database credentials
   - Redis connection
   - JWT secrets
   - Email configuration (optional)

5. **Start the services**
   ```bash
   # Development mode
   npm run dev        # Start API server
   npm run dev:worker # Start worker (in separate terminal)
   
   # Production mode
   npm start
   npm run worker
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | API server port | 3000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | chronos_db |
| `DB_USER` | Database user | chronos_user |
| `DB_PASSWORD` | Database password | - |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration | 7d |
| `MAX_RETRY_ATTEMPTS` | Default max retries | 3 |
| `RETRY_DELAY_MS` | Default retry delay | 5000 |

## 📚 API Documentation

### Authentication

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Jobs

#### Create Job

```http
POST /api/v1/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Send Weekly Report",
  "type": "http",
  "scheduleType": "recurring",
  "cronExpression": "0 9 * * 1",
  "timezone": "America/New_York",
  "payload": {
    "url": "https://api.example.com/reports",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer api-key"
    },
    "body": {
      "type": "weekly"
    }
  },
  "maxRetries": 3,
  "timeout": 30000
}
```

#### List Jobs
```http
GET /api/v1/jobs?page=1&limit=20&status=active
Authorization: Bearer <token>
```

#### Get Job Details
```http
GET /api/v1/jobs/:id
Authorization: Bearer <token>
```

#### Update Job
```http
PUT /api/v1/jobs/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Job Name",
  "maxRetries": 5
}
```

#### Delete Job
```http
DELETE /api/v1/jobs/:id
Authorization: Bearer <token>
```

#### Job Actions

```http
# Pause a job
POST /api/v1/jobs/:id/pause

# Resume a paused job
POST /api/v1/jobs/:id/resume

# Cancel a job
POST /api/v1/jobs/:id/cancel

# Trigger immediate execution
POST /api/v1/jobs/:id/trigger

# Reschedule a job
POST /api/v1/jobs/:id/reschedule
{
  "cronExpression": "0 */2 * * *"
}
```

#### Get Job Executions
```http
GET /api/v1/jobs/:id/executions?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Job Logs
```http
GET /api/v1/jobs/:id/logs?level=error
Authorization: Bearer <token>
```

### Monitoring

#### Health Check (Public)
```http
GET /api/v1/monitoring/health
```

#### User Dashboard
```http
GET /api/v1/monitoring/dashboard
Authorization: Bearer <token>
```

#### System Metrics (Admin Only)
```http
GET /api/v1/monitoring/metrics
Authorization: Bearer <admin-token>
```

## 🔧 Job Types

### HTTP Job
Execute HTTP requests to external services.

```json
{
  "type": "http",
  "payload": {
    "url": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "data": "value"
    },
    "timeout": 30000
  }
}
```

### Webhook Job
Similar to HTTP but with automatic signature generation.

```json
{
  "type": "webhook",
  "payload": {
    "url": "https://api.example.com/webhook",
    "data": { "event": "job.completed" },
    "secret": "webhook-secret-key"
  }
}
```

### Script Job
Execute shell commands or scripts.

```json
{
  "type": "script",
  "payload": {
    "command": "node",
    "args": ["scripts/process-data.js"],
    "cwd": "/app",
    "timeout": 60000
  }
}
```

### Email Job
Send emails (requires SMTP configuration).

```json
{
  "type": "email",
  "payload": {
    "to": "user@example.com",
    "subject": "Weekly Report",
    "text": "Your weekly report is ready.",
    "html": "<h1>Weekly Report</h1><p>Your report is ready.</p>"
  }
}
```

### Custom Job
Execute custom handlers registered in the application.

```json
{
  "type": "custom",
  "payload": {
    "handler": "processData",
    "data": { "input": "value" }
  }
}
```

## ⏱ Scheduling

### Schedule Types

1. **Immediate**: Execute as soon as possible
   ```json
   { "scheduleType": "immediate" }
   ```

2. **Scheduled**: Execute at a specific time
   ```json
   {
     "scheduleType": "scheduled",
     "scheduledAt": "2024-12-31T23:59:59Z"
   }
   ```

3. **Recurring**: Execute on a cron schedule
   ```json
   {
     "scheduleType": "recurring",
     "cronExpression": "0 9 * * 1-5",
     "timezone": "America/New_York"
   }
   ```

### Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `0 * * * *` | Every hour |
| `0 9 * * *` | Every day at 9 AM |
| `0 9 * * 1` | Every Monday at 9 AM |
| `0 0 1 * *` | First day of every month |
| `0 9 * * 1-5` | Weekdays at 9 AM |

## 📊 Monitoring

### Dashboard Metrics

- Total jobs and status distribution
- Execution statistics (24h)
- Success/failure rates
- Upcoming scheduled jobs
- Failed jobs requiring attention
- Daily execution trends

### System Health

The `/api/v1/monitoring/health` endpoint returns:
- Overall system status
- Database connectivity
- Redis connectivity
- System uptime

### Logging

Logs are stored in:
- `logs/chronos-YYYY-MM-DD.log` - All logs
- `logs/error-YYYY-MM-DD.log` - Error logs only
- `logs/jobs-YYYY-MM-DD.log` - Job-specific logs

## 🎯 Design Decisions

### Why BullMQ?

- **Reliability**: Built on Redis, provides persistent queue storage
- **Scalability**: Supports multiple workers and horizontal scaling
- **Features**: Built-in support for retries, delays, repeatable jobs
- **Performance**: Highly optimized for throughput

### Why PostgreSQL?

- **Reliability**: ACID compliance for data integrity
- **Features**: JSONB support for flexible payload storage
- **Scalability**: Excellent performance for complex queries
- **Ecosystem**: Mature tooling and community support

### Why Separate Workers?

- **Isolation**: API and job processing are decoupled
- **Scalability**: Scale workers independently based on load
- **Reliability**: Worker crashes don't affect API availability

### Retry Strategy

We use exponential backoff by default:
- Attempt 1: Immediate
- Attempt 2: 5 seconds delay
- Attempt 3: 25 seconds delay (5s × 5)
- Attempt 4: 125 seconds delay (5s × 25)

This prevents overwhelming failing services while still retrying.

### Security Considerations

1. **JWT Authentication**: Stateless, scalable authentication
2. **Password Hashing**: bcrypt with salt rounds of 12
3. **Rate Limiting**: Protection against brute force and DoS
4. **Input Validation**: express-validator for all inputs
5. **Helmet.js**: Security headers for protection

## 🛠 Project Structure

```
chronos/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.js      # Main config
│   │   ├── database.js   # Database setup
│   │   └── redis.js      # Redis setup
│   ├── controllers/      # Route controllers
│   │   ├── authController.js
│   │   ├── jobController.js
│   │   └── monitoringController.js
│   ├── middleware/       # Express middleware
│   │   ├── auth.js       # Authentication
│   │   ├── errorHandler.js
│   │   └── validate.js   # Input validation
│   ├── models/           # Sequelize models
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── JobExecution.js
│   │   └── JobLog.js
│   ├── queues/           # BullMQ queue setup
│   │   └── jobQueue.js
│   ├── routes/           # API routes
│   │   ├── auth.js
│   │   ├── jobs.js
│   │   └── monitoring.js
│   ├── services/         # Business logic
│   │   ├── jobScheduler.js
│   │   ├── jobExecutor.js
│   │   └── notificationService.js
│   ├── utils/            # Utilities
│   │   └── logger.js
│   ├── workers/          # Job workers
│   │   └── jobWorker.js
│   └── app.js            # Express app
├── logs/                 # Log files
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# Scale workers
docker-compose up -d --scale worker=4

# View logs
docker-compose logs -f api worker
```

### Production Considerations

1. **Environment Variables**: Use secrets management (Vault, AWS Secrets Manager)
2. **Database**: Use managed PostgreSQL (RDS, Cloud SQL)
3. **Redis**: Use managed Redis (ElastiCache, Redis Cloud)
4. **Logging**: Ship logs to centralized logging (ELK, DataDog)
5. **Monitoring**: Set up alerting for critical metrics
6. **Backup**: Regular database backups
7. **SSL/TLS**: Use HTTPS in production

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For support, email support@chronos.dev or open an issue on GitHub.

---

Built with ❤️ by the Chronos Team

