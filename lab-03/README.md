# Lab 3: REST API, query parameters, validation, debugging

**Name:** Geetha Krishna Kumbha  
**Registration number:** 252U1R9080  
**Section:** CSE GEN-AI  
**Course:** Backend Development Fundamentals  
**Live link:** Not deployed yet — add the Render URL after deployment.

## Objective

Extend the Lab 2 Book Management API into a RESTful API with title search, sorting, pagination, price-range filtering, request validation, appropriate HTTP status codes, consistent JSON error messages, and debugging practice.

## Technologies

- Node.js and Express.js
- SQLite (`sqlite` and `sqlite3`)
- JavaScript
- Postman
- Render (deployment target)

## Project structure

```text
lab-03/
├── database/
│   ├── books.db
│   └── schema.sql
├── screenshots/
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── server.js
└── verify-endpoints.js
```

## Installation and run

Prerequisite: Node.js 18 or later (Node.js 18+ provides the built-in `fetch` used by the test script).

```bash
npm install
npm start
```

The server starts on port `3000` by default. If the hosting platform supplies a `PORT` environment variable, the app uses it automatically.

Optional environment variables:

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Port used by Express | `3000` |
| `DB_PATH` | Optional SQLite database file path | `./database/books.db` |

Do not commit `.env` files or secrets. The supplied database file is a copy of the Lab 2 database.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | API health/welcome message |
| GET | `/books` | List books with optional search, sorting, pagination and price filters |
| GET | `/books/:bookId` | Retrieve one book by ID |
| POST | `/books` | Create a book after validating the request body |
| PUT | `/books/:bookId` | Update an existing book after validating the request body |
| DELETE | `/books/:bookId` | Delete an existing book |

### GET /books query parameters

| Parameter | Default | Description |
|---|---|---|
| `search_q` | Empty | Partial, case-insensitive title search using SQL `LIKE` |
| `order_by` | `id` | Sort column: `id`, `title`, `author`, `price`, or `pages` |
| `order` | `ASC` | Sort direction: `ASC` or `DESC` |
| `limit` | `10` | Number of rows to return; accepted range is 1–100 |
| `offset` | `0` | Number of rows to skip |
| `min_price` | Not applied | Inclusive minimum price |
| `max_price` | Not applied | Inclusive maximum price |

Example:

```http
GET /books?search_q=The&order_by=price&order=ASC&limit=5&offset=0&min_price=200&max_price=600
```

Example POST/PUT JSON body:

```json
{
  "title": "Learning Node.js",
  "author": "A. Student",
  "price": 450,
  "pages": 250
}
```

## HTTP status codes

- `200 OK`: successful GET, PUT, or DELETE.
- `201 Created`: successful POST.
- `400 Bad Request`: invalid ID, query parameter, or request body.
- `404 Not Found`: requested book or endpoint does not exist.
- `500 Internal Server Error`: unexpected server-side error.

Error responses use a consistent JSON shape, for example:

```json
{ "message": "Title is required and must be a non-empty string." }
```

## Postman test list

Use `http://localhost:3000` as the base URL after starting the server.

| # | Method | URL / body | Expected result |
|---|---|---|---|
| 1 | GET | `/books` | 200; list of books |
| 2 | GET | `/books?search_q=The` | 200; titles partially matching “The” |
| 3 | GET | `/books?order_by=price&order=ASC` | 200; ascending price order |
| 4 | GET | `/books?order_by=price&order=DESC` | 200; descending price order |
| 5 | GET | `/books?limit=3&offset=0` | 200; maximum three rows |
| 6 | GET | `/books?min_price=300&max_price=500` | 200; prices in inclusive range |
| 7 | GET | `/books?order_by=invalid` | 400; invalid sort column |
| 8 | GET | `/books?order=SIDEWAYS` | 400; invalid sort direction |
| 9 | GET | `/books?limit=abc` | 400; invalid limit |
| 10 | POST | `/books` with valid JSON body above | 201; created book |
| 11 | POST | `/books` with missing title | 400; validation message |
| 12 | POST | `/books` with `"price": "abc"` | 400; numeric price required |
| 13 | GET | `/books/99999999` | 404; book not found (assuming that ID is unused) |
| 14 | PUT | `/books/1` with valid JSON body | 200; updated book |
| 15 | DELETE | `/books/1` | 200; deleted book (perform after other tests) |

For the successful POST, PUT, and DELETE tests, use a test record or a disposable local copy of the database. Do not delete or overwrite important records in a production database.

## Automated checks

Start the API in one terminal:

```bash
npm start
```

Run the checks in another terminal:

```bash
npm test
```

The script checks the health route, pagination, title search, descending sorting, price range, invalid query values, invalid POST data, and a missing book. It uses the local server at `http://localhost:3000` by default. To test a different server:

```bash
BASE_URL=https://your-render-service.onrender.com npm test
```

On Windows PowerShell:

```powershell
$env:BASE_URL="https://your-render-service.onrender.com"; npm test
```

## Debugging notes

1. **`EADDRINUSE` (port already in use):** stop the other process using port 3000, or start the app with another port. PowerShell: ` $env:PORT=3001; npm start `.
2. **Wrong import path / `MODULE_NOT_FOUND`:** verify the spelling and relative path, including filename case. `path.join(__dirname, "database", "books.db")` resolves the database path relative to this project folder.
3. **`no such table`:** inspect the database schema and use the actual table name. This project uses the singular table name `book`, not `books`.
4. **Missing `await`:** database operations are asynchronous. Await calls such as `db.all`, `db.get`, and `db.run` before using their results or sending the response.

## Screenshots

Add actual screenshots captured from your own Postman and database runs to this folder. Do not use fabricated screenshots.

Suggested filenames:

- `01-get-all-books.png`
- `02-search-books.png`
- `03-sort-ascending.png`
- `04-sort-descending.png`
- `05-pagination.png`
- `06-price-range.png`
- `07-post-success.png`
- `08-validation-error.png`
- `09-put-success.png`
- `10-delete-success.png`
- `11-not-found.png`
- `12-database-view.png`

When captured, embed them here, for example:

```markdown
![GET all books](screenshots/01-get-all-books.png)
```

## Deployment note

Deploy this folder as a Node.js web service on Render (or another platform approved by the faculty), with build command `npm install` and start command `npm start`. Add the resulting public service URL to the Live link at the top of this README. SQLite data stored on a typical ephemeral hosting filesystem may reset after redeployment/restart; use a persistent disk or an approved managed database if persistent production data is required. Confirm the deployed API with Postman before submitting.

## Submission checklist

- [ ] Enter the correct registration number and section above.
- [ ] Run `npm install`, `npm start`, and `npm test` successfully.
- [ ] Capture real Postman screenshots for success and failure cases.
- [ ] Add screenshots under `screenshots/` and embed them in this README.
- [ ] Deploy and add the verified live URL, or explain why deployment was not possible.
- [ ] Commit `lab-03/` to the course repository; do not commit `node_modules/` or `.env`.
