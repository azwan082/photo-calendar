# Software Design Specification

## Context Diagram

```mermaid
C4Context
Person(users, "Users")
System(app, "Photo Calendar")
System_Ext(socmed, "Social Media", "e.g Daun")
Rel(users, app, "access")
BiRel(app, socmed, "get<br>content")
```

## Container Diagram

```mermaid
C4Container
UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
Person(users, "Users")
System_Ext(socmed, "Social Media", "e.g Daun")
Boundary(app, "Photo Calendar") {
    Container(web, "Web app", "NuxtJS")
    ContainerQueue(worker, "Worker", "BullMQ")
    ContainerDb(redis, "Queue store", "Redis")
    ContainerDb(db, "Database", "MariaDB")
}
Rel(users, web, "access")
BiRel(web, socmed, "get content")
Rel(web, db, "store app data")
Rel(web, worker, "run background tasks")
Rel(worker, redis, "store queue data")
```

## Component Diagram

```mermaid
C4Component
Container_Boundary(web, "Web app") {
    Component(ua, "User auth", "", "Handles user authn & authz")
    Component(as, "App settings", "", "Handles app settings page")
    Component(cg, "Calendar grid", "", "Handles main calendar<br>grid interface")
}
Container_Boundary(worker, "Worker") {
    ComponentQueue(cs, "Content syncer", "", "Sync users content<br>periodically")
}
```

## Dynamic Diagram

### User auth
```mermaid
C4Dynamic
UpdateLayoutConfig($c4ShapeInRow="1")
Container(web, "Web app")
System_Ext(socmed, "Social Media", "e.g Daun")
Container(web-auth, "Web app")
Rel(web, socmed, "Login with SSO")
Rel(socmed, web-auth, "Return access token")
```

### Calendar grid
```mermaid
C4Dynamic
UpdateLayoutConfig($c4ShapeInRow="1")
Container_Boundary(web, "Web app") {
    Component(fe, "Frontend")
    Component(be, "Backend")
    Component(db, "Database")
}
Rel(fe, be, "Get user content")
BiRel(be, db, "Query data")
Rel(be, fe, "Render calendar layout")
UpdateRelStyle(fe, be, $offsetY="-10")
UpdateRelStyle(be, fe, $offsetY="10")
```

### Content syncer
```mermaid
C4Dynamic
System_Ext(socmed, "Social Media API")
Container_Boundary(worker, "Worker") {
    Component(worker, "Worker")
    Component(scheduler, "Scheduler")
}
Component(db, "Database")
Rel(scheduler, worker, "Trigger task")
BiRel(worker, socmed, "Fetch user content")
Rel(worker, db, "Store data")
```

## Deployment Diagram

```mermaid
C4Deployment
Deployment_Node(lb, "Load balancer", "") {
    Container(lb, "Nginx")
}
Deployment_Node(k8s, "Cluster", "K8s") {
    Deployment_Node(nuxt, "Web app", "Bun") {
        Container(web-1, "NuxtJS", "replica-1")
        Container(web-2, "NuxtJS", "replica-2")
        Container(web-3, "NuxtJS", "replica-3")
    }
    Deployment_Node(worker, "Worker", "Bun") {
        Container(worker-1, "BullMQ", "scheduler")
        Container(worker-2, "BullMQ", "replica-1")
        Container(worker-3, "BullMQ", "replica-2")
    }
    Deployment_Node(galera, "Database", "Galera") {
        Container(db-1, "MariaDB", "primary")
        Container(db-2, "MariaDB", "replica-1")
        Container(db-3, "MariaDB", "replica-2")
    }
    Deployment_Node(sentinel, "Queue store", "Redis Sentinal") {
        Container(redis-1, "Redis", "master")
        Container(redis-2, "Redis", "replica-1")
        Container(redis-3, "Redis", "replica-2")
    }
}
```

## Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        int id PK
        string email
        string display_name
        enum auth_type  "sso | local"
        string username
        text password_hash
        boolean is_superadmin
        datetime created_at
    }

    SOCIAL_ACCOUNT {
        int id PK
        int user_id FK
        string provider
        string account_id
        text access_token
        text refresh_token
        datetime expires_at
    }

    POST {
        int id PK
        int user_id FK
        int account_id FK
        string external_post_id
        text caption
        datetime timestamp
        datetime synced_at
    }

    MEDIA {
        int id PK
        int post_id FK
        text media_url
        string media_type
        int width
        int height
    }

    SYNC_LOG {
        int id PK
        int account_id FK
        datetime started_at
        datetime finished_at
        boolean success
        text message
    }

    %% Relationships
    USER ||--o{ SOCIAL_ACCOUNT : "has one or more"
    SOCIAL_ACCOUNT ||--o{ POST : "owns posts"
    POST ||--o{ MEDIA : "has one or more"
    SOCIAL_ACCOUNT ||--o{ SYNC_LOG : "sync logs"
    USER ||--o{ POST : "author"
```