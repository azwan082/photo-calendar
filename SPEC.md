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

    APP_SETTINGS {
        int id PK
        string key UK
        text value 
        text description
        datetime updated_at
    }

    %% Relationships
    USER ||--o{ SOCIAL_ACCOUNT : "has one or more"
    SOCIAL_ACCOUNT ||--o{ POST : "owns posts"
    POST ||--o{ MEDIA : "has one or more"
    SOCIAL_ACCOUNT ||--o{ SYNC_LOG : "sync logs"
    USER ||--o{ POST : "author"
```

## REST API Endpoints

### Authentication Flow 

`/api/auth/login` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li>`provider` (query, required) → e.g. "google", "azuread", "keycloak" <li>`redirect_uri` (query, optional override) <li>`state` (query, generated server-side) |
| Output     | Redirect to IdP authorization endpoint |
| HTTP Codes | `302` (success redirect) <br> `400` (invalid request) |

`/api/auth/callback` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `provider` (query, required) <li> `code` (query, required) <li> `state` (query, required) |
| Output     | <pre>{ "access_token": "string", "id_token": "string", "refresh_token": "string", "expires_in": 3600 }</pre> |
| HTTP Codes | `200` (success) <br> `400` (invalid request) <br> `401` (token exchange failed) |

`/api/auth/token` (POST)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `provider` (body, required) <li> `grant_type`: "`authorization_code`" or "`refresh_token`" <li> `code` (if grant_type=authorization_code) <li> `refresh_token` (if grant_type=refresh_token) |
| Output     | Same as `/api/auth/callback` |
| HTTP Codes | `200` (success) <br> `400` (invalid grant_type) <br> `401` (invalid token) |

`/api/auth/refresh` (POST)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `provider` (body, required) <li> `refresh_token` (required) |
| Output     | <pre> { "access_token": "string", "expires_in": 3600 } |
| HTTP Codes | `200` (success) <br> `401` (invalid/expired refresh token) |

`/api/auth/logout` (GET, POST)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `provider` (query or body, required) <li> `id_token_hint` (optional) |
| Output     | <pre> { "message": "Logged out" } |
| HTTP Codes | `200` (success), `400` (invalid request) |

`/api/auth/userinfo` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) <li> `provider` (query, optional — backend can auto‑detect from `iss` claim in token) |
| Output     | <pre> { "sub": "user-id", "name": "Full Name", "email": "user@example.com", "roles": ["admin","user"] } |
| HTTP Codes | `200` (success) <br> `401` (invalid/expired token) |

### Session & Token Management

`/api/session` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) <li> `provider` (query, optional — backend can auto‑detect from `iss`) |
| Output     | <pre> { "user": { "id": "123", "name": "Azwan" }, "expires_at": "2026-02-23T07:22:00Z" } |
| HTTP Codes | `200` (success) <br> `401` (no active session) |

`/api/session/validate` (POST)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `token` (body, required) <li> `provider` (body, optional — backend can auto‑detect from `iss`) |
| Output     | <pre> { "valid": true, "claims": { "sub": "123", "exp": 1670000000 } } |
| HTTP Codes | `200` (success) <br> `401` (invalid token) |

`/api/session/revoke` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `token` (body, required) <li> `provider` (body, optional — backend can auto‑detect from `iss`) |
| Output     | <pre> { "message": "Token revoked" } |
| HTTP Codes | `200` (success) <br> `400` (invalid request) |

### Posts


`/api/posts` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) <li> `page` (int, optional) → pagination page number <li> `limit` (int, optional) → number of posts per page <li> `from_timestamp` (datetime, optional) → filter posts newer than this timestamp <li> `to_timestamp` (datetime, optional) → filter posts older than this timestamp <li> `sort` (string, optional: asc|desc) → sort by timestamp |
| Output     | <pre>{ <br>  "page": 1,<br>  "limit": 10,<br>  "total": 125,<br>  "posts": [<br>    {<br>      "id": 101,<br>      "external_post_id": "fb_12345",<br>      "caption": "Sunset view!",<br>      "timestamp": "2026-02-20T18:30:00",<br>      "account_id": 5,<br>      "media": [<br>        {<br>          "id": 501,<br>          "media_url": "https://cdn.app/photos/sunset.jpg",<br>          "media_type": "photo",<br>          "width": 1080,<br>          "height": 720<br>        }<br>      ]<br>    }<br>  ]<br>} |
| HTTP Codes | `200` (success) <br> `400` (invalid request) <br> `401` (unauthorized) <br> `404` (no posts found) <br> `500` (internal server error) |

`/api/posts/{id}` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) <li> `id` (int) → Unique identifier of the post |
| Output     | <pre>{<br>  "id": 101,<br>  "external_post_id": "fb_12345",<br>  "caption": "Sunset view!",<br>  "timestamp": "2026-02-20T18:30:00Z",<br>  "account_id": 5,<br>  "media": [<br>    {<br>      "id": 501,<br>      "media_url": "https://cdn.app/photos/sunset.jpg",<br>      "media_type": "photo",<br>      "width": 1080,<br>      "height": 720<br>    },<br>    {<br>      "id": 502,<br>      "media_url": "https://cdn.app/photos/sunset2.jpg",<br>      "media_type": "photo",<br>      "width": 640,<br>      "height": 480<br>    }<br>  ]<br>} |
| HTTP Codes | `200` (success) <br> `400` (invalid request) <br> `401` (unauthorized) <br> `404` (no posts found) <br> `500` (internal server error) |

### App Settings

`/api/settings` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) |
| Output     | <pre>{<br>  "settings": [<br>    {<br>      "key": "sync_interval_minutes",<br>      "value": "30", "description": "Interval for background sync jobs",<br>      "updated_at": "2026-02-22T10:00:00Z"<br>    }<br>  ]<br>} |
| HTTP Codes | `200` (success) <br> `400` (invalid request) <br> `401` (unauthorized) <br> `500` (internal server error) |

`/api/settings/{key}` (GET)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) <li> `key` (query, required) → app setting key |
| Output     | <pre>{ "key": "sync_interval_minutes", "value": "30", "description": "Interval for background sync jobs", "updated_at": "2026-02-22T10:00:00Z" } |
| HTTP Codes | `200` (success) <br> `400` (invalid request) <br> `401` (unauthorized) <br> `404` (not found) <br> `500` (internal server error) |

`/api/settings` (POST)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) <li> JSON body: <pre>{<br>  "key": "max_upload_size_mb",<br>  "value": "50",<br>  "description": "Maximum media upload size" <br>} |
| Output     | <pre> { "key": "max_upload_size_mb", "value": "50", "description": "Maximum media upload size", "updated_at": "2026-02-23T07:30:00Z" } |
| HTTP Codes | `201` (created) <br> `400` (invalid request) <br> `401` (unauthorized) <br> `500` (internal server error) |

`/api/settings/{key}` (PUT)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) <li> `key` (query, required) → app setting key <li> JSON Body: <pre>{ "value": "60", "description": "Updated sync interval" } |
| Output | <pre> { "key": "sync_interval_minutes", "value": "60", "description": "Updated sync interval", "updated_at": "2026-02-23T07:35:00Z" } |
| HTTP Codes | `200` (success) <br> `400` (invalid request) <br> `401` (unauthorized) <br> `404` (not found) <br> `500` (internal server error) |

`/api/settings/{key}` (DELETE)

| Aspect     | Details |
| ---------- | ------- |
| Parameters | <li> `Authorization: Bearer` (header, required) <li> `key` (query, required) → app setting key |
| Output     | <pre> { "message": "Setting 'sync_interval_minutes' deleted successfully." } |
| HTTP Codes | `200` (success) <br> `400` (invalid request) <br> `401` (unauthorized) <br> `404` (not found) <br> `500` (internal server error) |
