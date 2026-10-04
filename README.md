# Pharmacy Manager

A mobile-friendly pharmacy management web app for handling medicines, stock, purchases, sales, batches, expiry dates, suppliers, customers, invoices, alerts, reports, and role-based login.

The app is built as a lightweight browser-based dashboard and connects to Supabase for authentication and database storage.

## Features

- Admin and staff login with Supabase Auth
- Medicine add, edit, delete
- Medicine category management
- Company/manufacturer management
- Supplier management
- Customer management
- Purchase entry
- Sales entry
- Current stock view
- Batch number tracking
- Expiry date tracking
- Expiry alerts
- Low-stock alerts
- Purchase history
- Sales history
- Invoice view and print
- Daily/monthly sales report
- Purchase report
- Profit/loss report
- Medicine search by name, company, category, or barcode
- Barcode lookup
- Camera barcode scanner support where the browser supports it
- Dashboard with sales, stock, expiry, and database status
- JSON backup export
- Mobile-friendly responsive design

## Tech Stack

```text
Frontend: HTML, CSS, JavaScript
Backend/Auth: Supabase
Database: Supabase PostgreSQL
Hosting: Vercel, Netlify, or GitHub Pages
```

## Project Structure

```text
pharmacy/
  index.html     Main website layout
  styles.css     Responsive UI styling
  app.js         App logic, Supabase connection, reports, stock flow
  README.md      Project documentation
```

## Architecture

The app uses a simple single-page architecture:

```text
Browser UI
  -> Supabase Auth
  -> Supabase PostgreSQL tables
  -> Dashboard, stock, reports, invoices
```

Core data flow:

```text
Medicine
  -> Purchase
  -> Batch Stock
  -> Sale
  -> Invoice + Reports
```

Purchases create stock batches. Sales reduce stock from a selected available batch. Reports are calculated from purchase, sale, and batch cost data.

## Supabase Setup

Create a Supabase project, then create these tables:

- `profiles`
- `categories`
- `companies`
- `suppliers`
- `customers`
- `medicines`
- `batches`
- `purchases`
- `sales`

### Starter SQL

Open Supabase:

```text
SQL Editor -> New query
```

Then run:

```sql
create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  due numeric default 0,
  created_at timestamptz default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  due numeric default 0,
  created_at timestamptz default now()
);

create table medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic text,
  category_id uuid references categories(id),
  company_id uuid references companies(id),
  barcode text unique,
  low_stock integer default 10,
  sale_price numeric not null default 0,
  created_at timestamptz default now()
);

create table batches (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  batch_no text not null,
  expiry_date date not null,
  quantity integer not null default 0,
  purchase_price numeric not null default 0,
  sale_price numeric not null default 0,
  created_at timestamptz default now()
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id),
  medicine_id uuid references medicines(id),
  batch_id uuid references batches(id),
  quantity integer not null,
  purchase_price numeric not null,
  total numeric not null,
  paid numeric default 0,
  due numeric default 0,
  purchase_date date not null default current_date,
  created_at timestamptz default now()
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  customer_id uuid references customers(id),
  medicine_id uuid references medicines(id),
  batch_id uuid references batches(id),
  quantity integer not null,
  sale_price numeric not null,
  total numeric not null,
  paid numeric default 0,
  due numeric default 0,
  cost_total numeric default 0,
  sale_date date not null default current_date,
  created_at timestamptz default now()
);
```

### Enable Row Level Security

Run this in the Supabase SQL Editor:

```sql
alter table profiles enable row level security;
alter table categories enable row level security;
alter table companies enable row level security;
alter table suppliers enable row level security;
alter table customers enable row level security;
alter table medicines enable row level security;
alter table batches enable row level security;
alter table purchases enable row level security;
alter table sales enable row level security;

create policy "authenticated profiles access" on profiles
for all to authenticated using (true) with check (true);

create policy "authenticated categories access" on categories
for all to authenticated using (true) with check (true);

create policy "authenticated companies access" on companies
for all to authenticated using (true) with check (true);

create policy "authenticated suppliers access" on suppliers
for all to authenticated using (true) with check (true);

create policy "authenticated customers access" on customers
for all to authenticated using (true) with check (true);

create policy "authenticated medicines access" on medicines
for all to authenticated using (true) with check (true);

create policy "authenticated batches access" on batches
for all to authenticated using (true) with check (true);

create policy "authenticated purchases access" on purchases
for all to authenticated using (true) with check (true);

create policy "authenticated sales access" on sales
for all to authenticated using (true) with check (true);
```

## Create Admin and Staff Users

In Supabase:

```text
Authentication -> Users -> Add user
```

Create users with email and password.

Then copy each user's `id` and insert a profile row:

```sql
insert into profiles (id, name, role)
values
('PASTE_ADMIN_USER_ID_HERE', 'Admin', 'admin'),
('PASTE_STAFF_USER_ID_HERE', 'Staff', 'staff');
```

Website login uses only:

```text
Email
Password
```

The user ID is only used inside Supabase to connect the user to an admin or staff role.

## Configure Supabase In The App

In `app.js`, set:

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "your-publishable-key";
```

Use the Supabase publishable/anon key only. Do not put the `service_role` key, database password, or connection string in frontend code.

## Run Locally

Because this is a static website, you can open `index.html` directly in a browser.

For a cleaner local server, use:

```powershell
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deploy Online

### Option 1: Vercel

1. Push this project to GitHub.
2. Go to Vercel.
3. Import the GitHub repository.
4. Deploy.

### Option 2: Netlify

1. Go to Netlify.
2. Create a new site.
3. Import the GitHub repository, or drag and drop the project folder.
4. Deploy.

### Option 3: GitHub Pages

1. Push this project to GitHub.
2. Go to repository settings.
3. Open Pages.
4. Deploy from the `main` branch.

## First Test Checklist

After deployment, test this flow:

1. Login as admin.
2. Add a category.
3. Add a company.
4. Add a supplier.
5. Add a customer.
6. Add a medicine.
7. Add a purchase entry.
8. Check stock.
9. Create a sale.
10. Print or view the invoice.
11. Refresh the page.
12. Confirm the data is still there.

If the data remains after refresh, the app is connected to Supabase correctly.

## Current Limitations

- One sale currently uses one batch that has enough stock.
- Multi-batch invoice splitting is not implemented yet.
- Backup restore is only enabled in local fallback mode.
- For high-volume real pharmacy use, stock updates should eventually move into secure database functions or backend API routes.

## Future Improvements

- Multi-item invoice cart
- Split one sale across multiple batches automatically
- PDF invoice export
- More detailed staff permissions
- Audit log for edits and deletes
- Supplier payment history
- Customer payment history
- Advanced report filters
- Database backup automation

## License

This project is available for personal and business use. Add a license file if you plan to publish it as open source.
