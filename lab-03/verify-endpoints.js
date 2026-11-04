const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status, body };
}

async function run() {
  const checks = [];
  const check = (name, condition, details) => {
    checks.push({ name, passed: Boolean(condition), details });
    console.log(`${condition ? "PASS" : "FAIL"} - ${name}${details ? `: ${details}` : ""}`);
  };

  let result = await request("/");
  check("Health route", result.status === 200, `HTTP ${result.status}`);

  result = await request("/books?limit=3&offset=0");
  check("List with pagination", result.status === 200 && Array.isArray(result.body.books) && result.body.books.length <= 3, `HTTP ${result.status}`);

  result = await request("/books?search_q=The");
  check("Title search", result.status === 200 && result.body.books.every(book => book.title.toLowerCase().includes("the")), `HTTP ${result.status}`);

  result = await request("/books?order_by=price&order=DESC");
  const prices = result.body?.books?.map(book => book.price) || [];
  check("Price descending sort", result.status === 200 && prices.every((price, i) => i === 0 || prices[i - 1] >= price), `HTTP ${result.status}`);

  result = await request("/books?min_price=300&max_price=500");
  check("Price range filter", result.status === 200 && result.body.books.every(book => book.price >= 300 && book.price <= 500), `HTTP ${result.status}`);

  result = await request("/books?order_by=unknown");
  check("Invalid sort column rejected", result.status === 400, `HTTP ${result.status}`);

  result = await request("/books?limit=abc");
  check("Invalid limit rejected", result.status === 400, `HTTP ${result.status}`);

  result = await request("/books", { method: "POST", body: JSON.stringify({ title: "", author: "Test Author", price: "not-a-number", pages: 100 }) });
  check("Invalid POST body rejected", result.status === 400, `HTTP ${result.status}`);

  result = await request("/books/99999999");
  check("Missing book returns 404", result.status === 404, `HTTP ${result.status}`);

  const failed = checks.filter(item => !item.passed);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
  if (failed.length) process.exitCode = 1;
}

run().catch(error => {
  console.error("Test run failed:", error.message);
  process.exitCode = 1;
});
