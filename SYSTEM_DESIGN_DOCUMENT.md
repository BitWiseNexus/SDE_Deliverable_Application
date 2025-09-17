# System Design Document
**Mail → Calendar AI Agent**  
**Name:** Aditya Rehpade  
**College:** Indian Institute of Technology Bhilai

**Personal Email:** adityarehpade1@gmail.com  
**Institute Email:** adityapr@iitbhilai.ac.in  
**GitHub:** https://github.com/BitWiseNexus

---

## Table of Contents
1. [Executive Summary](#executive-summary)  
2. [Architecture Overview](#architecture-overview)  
   - [System Architecture (diagram)](#system-architecture)  
   - [Component Breakdown — Frontend (diagram)](#component-breakdown-frontend)  
   - [Backend Architecture (diagram)](#backend-architecture)  
   - [AI Agent Architecture (diagram)](#ai-agent-architecture)  
3. [Data Design](#data-design)  
   - [Database Schema (ER diagram)](#database-schema)  
   - [Data Flow Architecture (sequence diagram)](#data-flow-architecture)  
4. [Technology Stack](#technology-stack)  
5. [Integration & Security](#integration--security)  
6. [Performance & Quality Assurance](#performance--quality-assurance)  
7. [Conclusion, Repository & LLM Logs](#conclusion-repository--llm-logs)  
8. [Appendices](#appendices)

---

## Executive Summary

This project implements an intelligent **Mail → Calendar AI Agent** that converts important emails into calendar events automatically. The system analyzes email content, extracts dates/deadlines, rates importance, and creates Google Calendar events when appropriate. The stack uses React (frontend), Node.js + Express (backend), Gemini (LLM), and Google APIs (Gmail, Calendar).

---

## Architecture Overview

### System Architecture

```mermaid
graph TB

  subgraph Client_Layer["Client Layer"]
    UI["React Frontend<br/>Port 5173"]
  end

  subgraph API_Gateway["API Gateway"]
    Server["Node.js Express Server<br/>Port 5000"]
  end

  subgraph Core_Services["Core Services"]
    Auth["Authentication Service"]
    Gmail["Gmail Service"]
    Calendar["Calendar Service"]
    Agent["AI Agent Service"]
    Database["Database Service"]
  end

  subgraph External_APIs["External APIs"]
    Google["Google OAuth 2.0<br/>Gmail API<br/>Calendar API"]
    Gemini["Gemini API<br/>Email Analysis"]
  end

  subgraph Data_Layer["Data Layer"]
    SQLite["SQLite Database<br/>(users, processed_emails, agent_logs)"]
  end

  UI --> Server
  Server --> Auth
  Server --> Gmail
  Server --> Calendar
  Server --> Agent
  Server --> Database
  Auth --> Google
  Gmail --> Google
  Calendar --> Google
  Agent --> Gemini
  Database --> SQLite

  classDef clientLayer fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
  classDef apiLayer fill:#f1f8e9,stroke:#388e3c,stroke-width:2px
  classDef serviceLayer fill:#fff3e0,stroke:#f57c00,stroke-width:2px
  classDef externalLayer fill:#fce4ec,stroke:#c2185b,stroke-width:2px
  classDef dataLayer fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

  class Client_Layer clientLayer
  class API_Gateway apiLayer
  class Core_Services serviceLayer
  class External_APIs externalLayer
  class Data_Layer dataLayer
```

### Component Breakdown — Frontend

```mermaid
graph LR

  subgraph React_Application["React Application"]
    App["App.jsx<br/>Main Application"]
    Login["Login Screen<br/>OAuth Flow"]
    Dashboard["Dashboard<br/>Main Interface"]
    EmailView["Email View<br/>Display Emails"]
    CalendarView["Calendar View<br/>Show Events"]
  end

  subgraph Context_and_Hooks["Context and Hooks"]
    AppContext["AppContext<br/>Global State"]
    useAuth["useAuth Hook<br/>Authentication"]
    useApi["useApi Hook<br/>API Calls"]
  end

  subgraph Services["Services"]
    AuthService["Auth Service<br/>Auth API"]
    EmailService["Email Service<br/>Email API"]
    CalendarService["Calendar Service<br/>Calendar API"]
    AgentService["Agent Service<br/>Agent API"]
  end

  App --> Login
  App --> Dashboard
  Dashboard --> EmailView
  Dashboard --> CalendarView
  App --> AppContext
  App --> useAuth
  Dashboard --> useApi
  useAuth --> AuthService
  useApi --> EmailService
  useApi --> CalendarService
  useApi --> AgentService

  classDef reactApp fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
  classDef contextHooks fill:#f1f8e9,stroke:#388e3c,stroke-width:2px
  classDef services fill:#fff3e0,stroke:#f57c00,stroke-width:2px

  class React_Application reactApp
  class Context_and_Hooks contextHooks
  class Services services
```

### Backend Architecture

```mermaid
graph TD

  subgraph Express_Backend["Express Backend"]
    Server["server.js<br/>Application Entry"]
  end

  subgraph Routes["Routes"]
    AuthRoutes["/auth/*<br/>Authentication"]
    EmailRoutes["/api/emails/*<br/>Email"]
    CalendarRoutes["/api/calendar/*<br/>Calendar"]
    AgentRoutes["/api/agent/*<br/>AI Processing"]
    DatabaseRoutes["/api/database/*<br/>Queries"]
  end

  subgraph Services["Services"]
    AuthSvc["authService<br/>OAuth & Tokens"]
    GmailSvc["gmailService<br/>Email Retrieval"]
    CalendarSvc["calendarService<br/>Event Management"]
    AgentSvc["agentService<br/>AI Processing"]
  end

  subgraph Core_Infrastructure["Core Infrastructure"]
    DB["database.js<br/>SQLite Operations"]
    Logger["validation.js<br/>Logging"]
    ErrorHandler["Error Handling"]
  end

  Server --> AuthRoutes
  Server --> EmailRoutes
  Server --> CalendarRoutes
  Server --> AgentRoutes
  Server --> DatabaseRoutes

  AuthRoutes --> AuthSvc
  EmailRoutes --> GmailSvc
  CalendarRoutes --> CalendarSvc
  AgentRoutes --> AgentSvc

  AuthSvc --> DB
  GmailSvc --> DB
  CalendarSvc --> DB
  AgentSvc --> DB

  AuthSvc --> Logger
  GmailSvc --> Logger
  CalendarSvc --> Logger
  AgentSvc --> Logger

  classDef expressBackend fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
  classDef routes fill:#f1f8e9,stroke:#388e3c,stroke-width:2px
  classDef services fill:#fff3e0,stroke:#f57c00,stroke-width:2px
  classDef infrastructure fill:#fce4ec,stroke:#c2185b,stroke-width:2px

  class Express_Backend expressBackend
  class Routes routes
  class Services services
  class Core_Infrastructure infrastructure
```

### AI Agent Architecture

```mermaid
graph TB

  subgraph AI_Agent_System["AI Agent System"]
    Orchestrator["Agent Orchestrator<br/>Main Controller"]
  end

  subgraph Specialized_Agents["Specialized Agents"]
    Analyzer["Email Analyzer Agent"]
    Extractor["Information Extractor"]
    Planner["Event Planner Agent"]
    Executor["Calendar Executor"]
  end

  subgraph External_AI["External AI"]
    Gemini["Gemini API<br/>NLP Processing"]
  end

  subgraph Decision_Engine["Decision Engine"]
    Rules["Business Rules"]
    Validator["Event Validator"]
  end

  Orchestrator --> Analyzer
  Orchestrator --> Extractor
  Orchestrator --> Planner
  Orchestrator --> Executor
  Analyzer --> Gemini
  Extractor --> Gemini
  Planner --> Rules
  Executor --> Validator
  Planner --> Executor

  classDef agentSystem fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
  classDef specializedAgents fill:#e0f2f1,stroke:#4caf50,stroke-width:2px
  classDef externalAI fill:#fff3e0,stroke:#ff9800,stroke-width:2px
  classDef decisionEngine fill:#fce4ec,stroke:#e91e63,stroke-width:2px

  class AI_Agent_System agentSystem
  class Specialized_Agents specializedAgents
  class External_AI externalAI
  class Decision_Engine decisionEngine
```

## Data Design

### Database Schema

```mermaid
erDiagram

  USERS {
    INTEGER id PK "Primary Key"
    TEXT email UK "Unique Email"
    TEXT access_token "OAuth Access Token"
    TEXT refresh_token "OAuth Refresh Token"
    DATETIME created_at "Created Timestamp"
    DATETIME updated_at "Updated Timestamp"
  }

  PROCESSED_EMAILS {
    INTEGER id PK "Primary Key"
    TEXT message_id UK "Unique Gmail ID"
    INTEGER user_id FK "References USERS(id)"
    TEXT subject "Email Subject"
    TEXT sender "Sender Address"
    TEXT body_preview "Snippet of Email"
    TEXT full_analysis "AI Processed Content"
    TEXT calendar_event_id "Linked Calendar Event"
    DATETIME email_date "Original Date"
    DATETIME processed_at "Processing Timestamp"
    TEXT status "Processing Status"
  }

  AGENT_LOGS {
    INTEGER id PK "Primary Key"
    INTEGER user_id FK "References USERS(id)"
    TEXT action_type "Action Performed"
    TEXT details "Execution Details"
    TEXT status "Result Status"
    DATETIME timestamp "Log Timestamp"
  }

  USERS ||--o{ PROCESSED_EMAILS : "has many"
  USERS ||--o{ AGENT_LOGS : "has many"
```

### Data Flow Architecture

```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant B as Backend
  participant G as Gmail_API
  participant A as AI_Agent
  participant M as Gemini_API
  participant C as Calendar_API
  participant D as Database

  U->>F: Trigger Email Processing
  F->>B: POST /api/agent/process
  B->>G: Fetch Emails
  G->>B: Return Emails

  loop For Each Email
    B->>A: Process Email
    A->>M: Analyze Content
    M->>A: Return Analysis
    A->>A: Extract Event Details
    A->>C: Create Calendar Event
    C->>A: Return Event ID
    A->>D: Save Results
    A->>B: Success
  end

  B->>F: Return Summary
  F->>U: Display Results
```

## Technology Stack

### Selected Technologies
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Context API
- **Backend:** Node.js, Express.js, SQLite (single-user)
- **LLM:** Gemini via API
- **Integrations:** Google APIs — Gmail (read), Calendar (write)

### Why these technologies
- Fast developer experience and modern UI stack (React + Vite + Tailwind).
- Gemini is available for development and provides strong NLP capabilities.
- SQLite is lightweight for a single-user prototype with an easy upgrade path.
- Google APIs provide official, supported access for Gmail and Calendar.

## Integration & Security

### Integration Architecture

```mermaid
graph LR

  subgraph Application_Core["Application Core"]
    Backend["Express Backend"]
    Frontend["React Frontend"]
  end

  subgraph Google_Workspace["Google Workspace"]
    OAuth["OAuth 2.0"]
    GmailAPI["Gmail API"]
    CalendarAPI["Calendar API"]
  end

  subgraph AI_Services["AI Services"]
    GeminiAPI["Gemini API"]
  end

  subgraph Dev_Tools["Dev Tools"]
    Git["GitHub"]
    Vite["Vite"]
    ESLint["ESLint"]
  end

  Backend --> OAuth
  Backend --> GmailAPI
  Backend --> CalendarAPI
  Backend --> GeminiAPI
  Frontend --> Backend

  classDef appCore fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
  classDef googleWorkspace fill:#f1f8e9,stroke:#388e3c,stroke-width:2px
  classDef aiServices fill:#fff3e0,stroke:#f57c00,stroke-width:2px
  classDef devTools fill:#fce4ec,stroke:#c2185b,stroke-width:2px

  class Application_Core appCore
  class Google_Workspace googleWorkspace
  class AI_Services aiServices
  class Dev_Tools devTools
```

### Security Architecture

```mermaid
graph TD

  subgraph Security_Layers["Security Layers"]
    subgraph Authentication["Authentication"]
      OAuth["OAuth 2.0"]
    end

    subgraph Authorization["Authorization"]
      Scopes["API Scopes"]
      Validation["Request Validation"]
    end

    subgraph Data_Protection["Data Protection"]
      Encryption["Token Encryption"]
      HTTPS["HTTPS Only"]
    end

    subgraph Privacy["Privacy"]
      LocalDB["Local Database"]
      Minimal["Minimal Data Collection"]
    end
  end

  classDef securityLayer fill:#ffebee,stroke:#d32f2f,stroke-width:2px
  classDef authentication fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
  classDef authorization fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
  classDef dataProtection fill:#fff3e0,stroke:#f57c00,stroke-width:2px
  classDef privacy fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

  class Security_Layers securityLayer
  class Authentication authentication
  class Authorization authorization
  class Data_Protection dataProtection
  class Privacy privacy
```

### Operational & Bonus Features
- **Monitoring UI:** logs dashboard, email processing status, event management.
- **Operational features:** batch processing, error recovery, retry policies.
- **Authentication:** OAuth2 for Google; admin role-based controls possible for future work.

## Performance & Quality Assurance

### Performance Capabilities
- Optimized for single-user usage with a design path to scale to multi-tenant deployment (PostgreSQL).
- Event-driven processing and caching to minimize repeated LLM calls.
- Light-weight architecture to keep latency low for interactive use.

### Quality Measures
- ESLint, structured logging, input validation, and robust error handling.
- Unit and integration tests for parsers and API endpoints; manual tests for OAuth flows and calendar creation.

## Conclusion

### Conclusion
The Mail Calendar AI Agent turns email clutter into scheduled, actionable items using a practical, modern stack. It balances automation and privacy and provides a clear upgrade path for scaling.

## Appendices
### Repository
**GitHub:** https://github.com/BitWiseNexus/SDE_Deliverable_Application

### LLM Interaction Log
- **Log 1:** ChatGPT Share #1 — https://chatgpt.com/share/68ca9371-f9b0-800a-a530-816fd071a68a
- **Log 2:** ChatGPT Share #2 — https://chatgpt.com/share/68ca93ed-f4b4-800a-8a69-fc748e3b3808
- **Log 3:** ChatGPT Share #3 — https://chatgpt.com/share/68ca9408-a1bc-800a-9638-50642cbe8000
- **Log 4:** Claude Share — https://claude.ai/share/11af856f-3bc2-4b09-b7a1-bb3f5d342792
