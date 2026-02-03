# Introduction

**@neupgroup/mapper**

A lightweight, fluent ORM and query builder designed for simplicity and ease of use. It revolves around a single entry point with four core commands, making it intuitive to manage connections, perform CRUD operations, handle migrations, and execute raw SQL.

## Core Concepts

The library is built around the `Mapper` class, which exposes four static methods:

1.  **`init()`**: Initialize and manage database connections.
2.  **`base()`**: Perform standard CRUD (Create, Read, Update, Delete) operations.
3.  **`migrator()`**: Handle database schema changes (DDL).
4.  **`raw()`**: Execute raw SQL queries directly.

## Installation

```bash
npm install @neupgroup/mapper
```
