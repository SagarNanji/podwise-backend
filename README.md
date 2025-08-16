# Podwise Backend

This is the backend for the Podwise application.

## API Endpoints

### Chat Endpoints

*   **POST /chat/:sessionId**
    *   Processes chat messages for a given session.

### Session Endpoints

*   **GET /session/**
    *   Checks if the session endpoint is ready to accept POST requests for file uploads.
*   **POST /session/**
    *   Uploads a file to create a new session.
    *   Requires `multer` for file uploads.


"# podwise-backend" 
