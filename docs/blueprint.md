# Neup.Mapper Blueprint

This document outlines the core architectural and styling guidelines for the Neup.Mapper application.

## Core Features

- **AI-Powered Schema Suggestions**: Users can describe their data in natural language, and the application will suggest an optimal database schema (JSON format) for various database types (MongoDB, Firestore, SQL).
- **AI-Powered Operation Suggestions**: Users can describe a desired database operation (e.g., "find all users older than 30"), and the AI will generate the corresponding code.
- **Database Configuration**: Users can configure credentials for different database backends. This configuration is used to generate a `.env` file.
- **Schema Builder**: A UI for manually creating and managing data schemas for different collections. These schemas are saved in the browser's local storage.
- **Data Browser**: A CRUD interface to interact with the configured database. It allows users to get, create, update, and delete documents. The interface uses the saved schemas to provide a structured editing experience.

## Architecture

- **Next.js App Router**: The application is built using the Next.js App Router.
- **Server-Centric Data Access**: All database operations are executed on the server for security. Client-side components do not have direct access to the database or its credentials.
- **Server Actions**: Next.js Server Actions are used to bridge the gap between client-side UI and server-side data logic. Client components call these actions to perform CRUD operations.
- **ORM / Adapters**: A simple ORM-like structure with adapters for different database backends (Firestore, API, SQL) is located in `src/lib/orm/`. This logic runs exclusively on the server.
- **Configuration**: Database credentials are read from server-side environment variables (`.env` file).

## Design and Layout Guidelines

- **Main Layout**:
  - The header should span the full width of the viewport, with a background color and/or shadow that extends edge-to-edge.
  - The main content area, including the sidebar and the primary content, should be centered within a container with a maximum width of `1440px`.
  - The application uses a two-column layout on desktop screens, with a fixed sidebar on the left and the main content area on the right.
  - The main body of the page should be the only element with a scrollbar to ensure a smooth and predictable scrolling experience. Section-specific scrollbars should be avoided.
- **Font**:
  - The primary font for the application is **Raleway**.
- **Styling**:
  - The application uses **Tailwind CSS** for styling and **ShadCN UI** for the component library.
  - Custom styles and theme variables are defined in `src/app/globals.css`.
