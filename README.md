
# Worldview Backend

## 1. Project Overview

### Purpose
Worldview is a quadratic voting platform based on World mini-apps that allows users to create, manage, and participate in polls. The platform enables community-driven decision making through a weighted voting system, giving users the ability to express preference strength across multiple options.

### Key Features
- Poll creation with draft capability
- Quadratic voting system for more representative outcomes
- User authentication using World ID
- Poll searching, filtering, and sorting
- Vote management for users
- Anonymous voting option

### Live Links
- Production: https://backend.worldview.fyi
- Staging: https://backend.staging.worldview.fyi

## 2. Architecture Overview

### Tech Stack
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT, World ID integration
- **Voting System**: Quadratic voting with normalization options
- **Docker**: Container-based deployment

### System Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Frontend App   │<────>│  NestJS API     │<────>│  PostgreSQL DB  │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                 │
                                 │
                         ┌───────▼───────┐
                         │               │
                         │  World ID     │
                         │  Integration  │
                         │               │
                         └───────────────┘
```

### Data Flow
1. Users authenticate via World ID
2. Authenticated users can create polls (draft or published)
3. Users can vote on active polls using quadratic voting
4. The system normalizes and calculates voting weights (based on feature flag)
5. Poll results are available for viewing based on permissions

## 3. Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- Yarn package manager

### Installation Steps
```bash
# Install dependencies
$ yarn install

# Generate Prisma client
$ npx prisma generate

# Run database migrations
$ npx prisma migrate dev
```

### Configuration
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL="postgresql://user:password@localhost:5432/worldview"
JWT_SECRET="your-secret-key"
WHITELISTED_ORIGINS="localhost:3000,yourdomain.com"
ENABLE_VOTE_NORMALIZATION=true
TUNNEL_DOMAINS="localtunnel.me,ngrok.io"
```

## 4. Usage Instructions

### Running the Application
```bash
# Development mode
$ yarn run start:dev

# Production mode
$ yarn run build
$ yarn run start:prod
```

### Database Migrations
```bash
# Generate a new migration
$ yarn migration:generate

# Apply migrations (production)
$ yarn migration:prod
```

## 5. API Endpoints

### Authentication
- `GET /auth/nonce` - Get a nonce for World ID authentication
- `POST /auth/verifyWorldId` - Verify World ID and authenticate user

### Polls
- `POST /poll` - Create a new published poll
- `PATCH /poll/draft` - Create or update a draft poll
- `GET /poll/draft` - Get user's draft poll
- `GET /poll` - Get polls with filtering and pagination
  - Query params: page, limit, isActive, userVoted, userCreated, search, sortBy, sortOrder
- `GET /poll/:id` - Get detailed information about a specific poll
- `DELETE /poll/:id` - Delete a poll (if owner)

### Users
- `GET /user/getUserData` - Get user profile data
- `GET /user/getUserActivities` - Get user activities
- `GET /user/getUserVotes` - Get user's voting history
- `POST /user/setVote` - Cast a vote on a poll
- `POST /user/editVote` - Edit an existing vote
- `POST /user/createUser` - Create a new user

## 6. Database Schema

### Main Entities

#### User
```prisma
model User {
  id                     Int          @id @default(autoincrement())
  worldID                String       @unique
  name                   String?
  profilePicture         String?
  pollsCreatedCount      Int          @default(0)
  pollsParticipatedCount Int          @default(0)
  createdPolls           Poll[]       @relation("PollAuthor")
  actions                UserAction[]
  votes                  Vote[]
}
```

#### Poll
```prisma
model Poll {
  pollId           Int                      @id @default(autoincrement())
  authorUserId     Int
  title            String?
  description      String?
  options          String[]
  creationDate     DateTime                 @default(now())
  startDate        DateTime?
  endDate          DateTime?
  tags             String[]
  isAnonymous      Boolean                  @default(false)
  participantCount Int                      @default(0)
  voteResults      Json
  searchVector     Unsupported("tsvector")?
  status           PollStatus               @default(PUBLISHED)
  author           User                     @relation("PollAuthor", fields: [authorUserId], references: [id])
  userAction       UserAction[]
  votes            Vote[]
}
```

#### Vote
```prisma
model Vote {
  voteID                       String @id @default(uuid())
  userId                       Int
  pollId                       Int
  votingPower                  Int
  weightDistribution           Json
  proof                        String
  quadraticWeights             Json?
  normalizedWeightDistribution Json?
  normalizedQuadraticWeights   Json?
  poll                         Poll   @relation(fields: [pollId], references: [pollId], onDelete: Cascade)
  user                         User   @relation(fields: [userId], references: [id])
}
```

#### UserAction
```prisma
model UserAction {
  id        Int        @id @default(autoincrement())
  userId    Int
  pollId    Int
  type      ActionType
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt
  poll      Poll       @relation(fields: [pollId], references: [pollId], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id])
}
```

## 7. File Structure

```
worldview-be
│
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Database model definitions
│   └── migrations/         # Database migration files
│
├── src/
│   ├── auth/               # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.service.ts
│   │   └── jwt-auth.guard.ts
│   │ 
│   ├── poll/               # Poll management module
│   │   ├── poll.controller.ts
│   │   ├── poll.service.ts
│   │   ├── Poll.dto.ts
│   │   └── poll.module.ts
│   │
│   ├── user/               # User management module
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.dto.ts
│   │   └── user.module.ts
│   │
│   ├── common/             # Shared utilities and exceptions
│   │   ├── exceptions.ts
│   │   ├── http-exception.filter.ts
│   │   └── validators.ts
│   │
│   ├── database/           # Database connection module
│   │   └── database.service.ts
│   │
│   ├── app.module.ts       # Main application module
│   ├── app.controller.ts   # Main application controller
│   ├── app.service.ts      # Main application service
│   └── main.ts             # Application entry point
│
├── test/                   # Test files
│
├── .env                    # Environment variables (not in repo)
├── docker-compose.yml      # Docker Compose configuration
└── package.json            # Project dependencies and scripts
```

## 8. Key Features Implementation

### Draft Poll Management
The system allows users to save incomplete polls as drafts before publishing:
- Only one draft poll per user
- Draft polls are not visible to other users
- Fields are optional in draft mode
- Simple conversion from draft to published

Implementation details:
- The Poll entity includes a `status` field with DRAFT/PUBLISHED values
- `patchDraftPoll` endpoint handles creating and updating drafts
- Transaction-based approach ensures only one draft exists per user
- Poll queries include status filters to separate draft and published polls

### Quadratic Voting System
The platform uses quadratic voting for more democratic decision-making:
```
1. Users distribute voting power across options
2. Final weight = square root of allocated points
3. Optional normalization for fair comparison
```

Implementation details:
- Vote entity stores both raw weight distribution and quadratic weights
- Optional normalization can be enabled via environment variable
- PostgreSQL functions calculate quadratic weights and normalization
- Results are aggregated with proper weight calculations

### Authentication Flow
1. User requests a nonce from the server
2. User authenticates with World ID
3. Server verifies World ID proof and issues JWT
4. JWT token is used for subsequent authenticated requests

### Poll Filtering and Search
The API provides comprehensive filtering options:
- Active/inactive status filter based on poll date
- User participation filters (created/voted)
- Full-text search on title and description using PostgreSQL tsvector
- Custom sorting options (end date, participant count, creation date)

### Vote Management
Users can:
- Cast votes with custom weight distribution
- Edit votes during active poll period
- View their voting history
- See vote calculations with quadratic weights

## 9. Development Guidelines

### Code Structure
- **Controllers**: Handle HTTP requests and responses
- **Services**: Implement business logic and database operations
- **DTOs**: Define data transfer objects for request/response validation
- **Guards**: Handle authentication and authorization
- **Exceptions**: Custom error handling and messages

### Contribution Process
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description
4. Pass automated tests
5. Complete code review

## 10. Deployment

### Docker Deployment
```bash
# Build the Docker image
docker-compose build

# Run with Docker Compose
docker-compose up -d
```

### Environment-Specific Configuration
- Development: Uses local database, allows tunnel domains
- Production: Uses secure connections, restricted CORS

## 11. Troubleshooting

### Common Issues
- **Authentication failures**: Check World ID configuration
- **Database connection issues**: Verify DATABASE_URL
- **CORS errors**: Update WHITELISTED_ORIGINS
- **Vote calculation issues**: Check ENABLE_VOTE_NORMALIZATION setting

### Logging
- Application logs are available in both development and production environments via Grafana (For access please reach out to devOps)

