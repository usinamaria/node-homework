# Getting Started with Node Development

Welcome to Code the Dream's Node/Express class!

In this course, you will write JavaScript that runs outside the browser. You will use Node.js to build server-side programs, Express applications, REST APIs, and database-backed projects.

This README helps you set up your computer for the course. You do not need to understand every tool deeply yet. The goal is to install the tools, connect them, and make sure your `node-homework` repository is ready for assignments.

## About This Project

This repository has grown, assignment by assignment, into a full Task List REST API built with Node.js, Express, and Prisma, backed by PostgreSQL. It is the Code the Dream Node/Express class final project.

- **Live deployment:** [https://node-homework-ibwz.onrender.com](https://node-homework-ibwz.onrender.com) (Render, connected to a Neon.tech Postgres database)
- **API documentation:** once the server is running, interactive Swagger docs are available at `/api-docs` (e.g. `http://localhost:3000/api-docs` locally)

### Tech Stack

- **Runtime/Framework:** Node.js, Express 5
- **Database/ORM:** PostgreSQL, [Prisma](https://www.prisma.io/) (`prisma/schema.prisma`, migrations in `prisma/migrations/`)
- **Auth:** JSON Web Tokens in an HttpOnly cookie, with a CSRF token required (via the `X-CSRF-TOKEN` header) on state-changing requests
- **Validation:** [Joi](https://joi.dev/) schemas in `validation/`
- **Security middleware:** `helmet`, `express-rate-limit`, `express-xss-sanitizer`, Google reCAPTCHA verification on registration
- **API docs:** `swagger-jsdoc` + `swagger-ui-express`, served at `/api-docs`
- **Testing:** Jest + Supertest + `node-mocks-http`, run against a local PostgreSQL test database

### Data Model

- **User** — `id`, `name`, `email`, `hashedPassword`, `roles` (optional comma-delimited list, e.g. `"manager"`), `createdAt`. A user has many tasks.
- **Task** — `id`, `title`, `isCompleted`, `priority` (`low`/`medium`/`high`), `userId`, `createdAt`. A task belongs to a user and has many log entries.
- **Log** — `id`, `taskId`, `status`, `createdAt`. A progress log entry for a task; deleting a task cascades to delete its log entries.

### API Overview

All task and analytics routes require authentication (the `jwt` cookie set by logon/registration). State-changing requests (`POST`/`PATCH`/`PUT`/`DELETE`) also require the `X-CSRF-TOKEN` header, using the token returned by logon/registration.

**Users** (`/api/users`)

| Method | Route | Description |
| --- | --- | --- |
| POST | `/register` | Register a new user (requires reCAPTCHA verification), auto-creates 3 welcome tasks, logs the user in |
| POST | `/logon` | Log in and receive a JWT cookie + CSRF token |
| POST | `/googleLogon` | Log in (or auto-register) via a Google OAuth authorization code; sets a JWT cookie |
| POST | `/logoff` | Clear the JWT cookie (auth required) |

**Tasks** (`/api/tasks`, auth required)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/` | List the logged-in user's tasks — supports pagination, filtering (`find`, `isCompleted`, `priority`, `min_date`, `max_date`), and sorting |
| POST | `/` | Create a task |
| PATCH | `/` | Bulk-update every task matching filter query parameters (at least one filter required) |
| DELETE | `/` | Bulk-delete every task matching filter query parameters (at least one filter required) |
| POST | `/bulk` | Create multiple tasks in one request |
| PATCH | `/bulk` | Bulk-update tasks by an `{ ids: [...] }` array in the body |
| DELETE | `/bulk` | Bulk-delete tasks by an `{ ids: [...] }` array in the body |
| GET | `/:id` | Get a single task (pass `?include=logs` to include its progress log entries) |
| PATCH | `/:id` | Update a single task |
| DELETE | `/:id` | Delete a single task (cascades to delete its log entries) |
| POST | `/:id/logs` | Add a progress log entry to a task |

**Analytics** (`/api/analytics`, auth required, **manager role required**)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/users/:id` | Task completion stats, recent tasks, and weekly progress for a user |
| GET | `/users` | All users with task counts (paginated) |
| GET | `/tasks/search` | Full-text-style search across task titles and user names |

Every route above (and each request/response shape) is also documented interactively in the Swagger UI at `/api-docs`.

### Role-Based Access Control

Users may optionally be given a `roles` value (a comma-delimited string, e.g. `"manager"`) directly in the database — for example via Prisma Studio (`npx prisma studio`). When present, the role travels in the signed JWT and is exposed as `req.user.roles` after `jwtMiddleware` runs. The `/api/analytics` routes are gated by a `requireManager` middleware that returns `401` unless `"manager"` is present in the caller's roles.

### Environment Variables

In addition to the `DB_URL`, `DATABASE_URL`, and `TEST_DATABASE_URL` values described later in this README, the final project also needs:

```text
JWT_SECRET=<a long random string used to sign JWTs>
RECAPTCHA_SECRET=<your Google reCAPTCHA v2 secret key>
RECAPTCHA_BYPASS=<a shared secret used only in local/test environments to skip live reCAPTCHA verification>
GOOGLE_CLIENT_ID=<your Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth client secret>
GOOGLE_REDIRECT_URI=<optional; defaults to "postmessage" for popup-based front ends>
```

`RECAPTCHA_BYPASS` lets automated tests and local development register users without a real reCAPTCHA token: send the header `X-Recaptcha-Test: <the same value>` on `POST /api/users/register` instead of a `recaptchaToken`.

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` come from a Google Cloud OAuth client (Google Cloud Console → APIs & Services → Credentials → OAuth client ID, of type "Web application"), and must match the client ID the front end uses to obtain an authorization code. `GOOGLE_REDIRECT_URI` only needs to be set if the front end performs a real page redirect rather than a popup-based flow — it must exactly match the redirect URI configured on the OAuth client.

### Google OAuth Logon

`POST /api/users/googleLogon` implements the "Login with Google" flow described in the class's final-project rubric:

1. The front end obtains an authorization code from Google (e.g. via `@react-oauth/google`'s `useGoogleLogin({ flow: 'auth-code' })`) and sends it as `{ "code": "..." }` (the field name the class's sample front end actually uses; `authorizationCode` is also accepted).
2. The backend exchanges that code for tokens with Google (`google-auth-library`'s `OAuth2Client.getToken`), then verifies the returned id token (`verifyIdToken`) to get the user's verified name and email.
3. If no user exists with that email, one is created with a random, unusable placeholder password hash (Google-authenticated users never log on with a password).
4. The backend sets the same JWT cookie and returns the same `{ name, email, csrfToken }` shape as `/api/users/logon`, so the rest of the app treats a Google-authenticated session identically to a password-authenticated one.

Because this flow depends on a live authorization code from Google and the actual front end, it's only practically testable end-to-end through the real front end (as noted in the class materials) — automated tests here only cover the request-validation path (missing `code`).

### Running the Project

```bash
npm install          # install dependencies
npx prisma migrate dev   # apply Prisma migrations to your local DATABASE_URL
npm run dev           # start the server with nodemon (http://localhost:3000)
```

Run the automated test suite (uses `TEST_DATABASE_URL`, a separate local Postgres database):

```bash
npm test
```

### Deploying to Render

The app is deployed to [Render](https://render.com), using a [Neon.tech](https://neon.tech) Postgres database as `DATABASE_URL`. Because this project uses Prisma, the Render build command needs to both regenerate the Prisma Client and apply pending migrations, not just run `npm install`:

```bash
npm install --production && npx prisma generate && npx prisma migrate deploy
```

If only `npm install` runs (without `prisma generate`), the deployed app can throw confusing errors like `Unknown argument 'someField'` even though the column already exists in the database, because the generated Prisma Client is out of date.

### Extra Features Implemented

Beyond the core CRUD/auth requirements, this project includes several of the final-project "extra function" ideas:

- **Swagger/OpenAPI documentation** — full interactive API docs at `/api-docs`.
- **Google OAuth logon** — `POST /api/users/googleLogon` lets a user log in (or auto-register) with their Google identity instead of a password.
- **Role-based access control** — an optional `manager` role, carried in the JWT, gating the analytics endpoints.
- **Progress logs** — a `Log` model letting a user record a series of status updates for a task, with cascading delete so removing a task doesn't hit a foreign-key error.
- **Bulk update/delete by filter** — `PATCH`/`DELETE /api/tasks` acting on every task matching query parameters like `?isCompleted=true`.
- **Bulk update/delete by id array** — `PATCH`/`DELETE /api/tasks/bulk` acting on a specific set of task ids.
- **Pagination, filtering, and sorting** of the task list, and cross-user analytics/search endpoints.

## What You Will Install

You will need these tools:

- Git
- Node.js and npm
- Postman
- PostgreSQL
- The `node-homework` repository

Git helps you save versions of your work and send your code to GitHub.

Node.js runs JavaScript on your computer instead of in the browser.

npm comes with Node. It installs the packages your projects need.

Postman lets you test APIs by sending requests without building a frontend first.

PostgreSQL is the database you will use later in the course.

The `node-homework` repository is where you will write and submit your assignments.

## Git

Git is a version control tool. It keeps track of changes in your code.

You will use Git throughout the course to create branches, commit your work, push your work to GitHub, and open pull requests.

On MacOS and Linux, Git is usually already installed.

Check your Git version:

```bash
git --version
```

If Git is installed, you should see a version number.

On Windows, install Git for Windows from:

[https://gitforwindows.org/](https://gitforwindows.org/)

You will also need a code editor. For JavaScript development, VSCode is strongly recommended.

## Node.js and npm

Node.js lets JavaScript run outside the browser.

In the browser, JavaScript works with pages, clicks, forms, and browser APIs. In Node, JavaScript can work with files, servers, command-line tools, environment variables, and backend libraries.

Install the latest LTS version of Node from:

[https://nodejs.org/en/download/](https://nodejs.org/en/download/)

LTS stands for Long Term Support. It is the stable version recommended for most users.

On Linux, you can install Node and npm with these commands:

```bash
sudo apt update
sudo apt install nodejs
sudo apt install npm
```

After installation, check that Node and npm are available:

```bash
node --version
npm --version
```

You should see version numbers for both tools.

## Postman

In this class, you will create REST APIs.

A REST API receives requests and sends responses. Later, a frontend application might call those APIs. But while you are learning, you often need a simple way to test the API before you have a frontend.

Postman gives you that testing tool. You can send `GET`, `POST`, `PATCH`, and `DELETE` requests and inspect the response.

Install Postman from:

[https://www.postman.com/downloads/](https://www.postman.com/downloads/)

## PostgreSQL

You will learn and use SQL for relational database access in this course.

The database we use is PostgreSQL. A database stores data in tables, and SQL is the language used to ask questions about that data or change it.

PostgreSQL setup is different depending on your operating system. Choose the section that matches your computer.

<details>
<summary style="font-size: 1.3em;">PostgreSQL on Mac</summary>

On Mac, you can install PostgreSQL 14 with Homebrew.

The `<username>` you use below is your Mac username. It is the value returned by the `whoami` command.

Check your username:

```bash
whoami
```

Then enter these commands in a terminal session:

```bash
brew update
brew install postgresql@14
brew services start postgresql@14
psql -U postgres
CREATE ROLE <username> LOGIN CREATEDB;
CREATE DATABASE nodehomework OWNER <username>;
CREATE DATABASE tasklist OWNER <username>;
CREATE DATABASE testtasklist OWNER <username>;
\q
```

The first three commands install PostgreSQL and start the PostgreSQL service.

The `psql -U postgres` command opens the PostgreSQL command-line program as the `postgres` user.

The `CREATE ROLE` command creates a PostgreSQL user that matches your Mac username.

The three `CREATE DATABASE` commands create the databases used by the course.

On some Macs, the setup is a little different.

When PostgreSQL is installed with Homebrew, it may create a PostgreSQL user that matches your Mac username. For example, if your Mac username is `kendra`, PostgreSQL may create a database user named `kendra` instead of using the `postgres` user.

If that happens, the command `psql -U postgres` may not work. That is okay. You can connect by typing only `psql`, because PostgreSQL will try to use your Mac username by default.

In this version, you also skip the `CREATE ROLE` command. The role already exists, because Homebrew created it for you.

Use this version if PostgreSQL is using your Mac username:

```bash
brew update
brew install postgresql@14
brew services start postgresql@14
psql
CREATE DATABASE nodehomework OWNER <username>;
CREATE DATABASE tasklist OWNER <username>;
CREATE DATABASE testtasklist OWNER <username>;
\q
```

Verify the installation:

```bash
psql --version
```

You should see a version number like `psql (PostgreSQL) 14.x`.

</details>

<details>
<summary style="font-size: 1.3em;">PostgreSQL on Windows</summary>

On Windows, you will install PostgreSQL with the official installer.

During installation, PostgreSQL asks you to create a password for the `postgres` superuser. Write this password down. You will need it later.

After installation, you will also create another PostgreSQL user named `mypguser`. This is the user your homework project will use when connecting to the database.

Choose a password for `mypguser` and write it down. Do not reuse an important password.

Download the PostgreSQL installer from:

[https://www.postgresql.org/download/windows](https://www.postgresql.org/download/windows)

Run the installer and accept the default options.

You can watch this video from 0:00 to 6:00 if you want help checking that PostgreSQL is installed correctly:

[https://youtu.be/GpqJzWCcQXY?si=2ebcJ6FqmGkLChJL](https://youtu.be/GpqJzWCcQXY?si=2ebcJ6FqmGkLChJL)

After installation, open the Windows Services panel in Task Manager and verify that the PostgreSQL service is running.

Then open a `cmd` prompt. Use `cmd`, not Git Bash, for this PostgreSQL setup step.

You need to check your installed PostgreSQL version. The command below uses PostgreSQL version 17. If you installed a different version, change the number in the path.

```text
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost
```

PostgreSQL will ask for the password you created during installation for the `postgres` superuser.

When you type the password, you will not see characters appear on the screen. That is normal. Type the password and press Enter.

If the connection works, you should see something like this:

```text
psql (17.x)
Type "help" for help
postgres=#
```

Now you are connected to PostgreSQL.

Next, create the user and databases for this course. Run each command one at a time. Press Enter after each command.

Replace `<pg-password>` with the password you chose for `mypguser`.

```sql
CREATE ROLE mypguser LOGIN CREATEDB PASSWORD '<pg-password>';
CREATE DATABASE nodehomework OWNER mypguser;
CREATE DATABASE tasklist OWNER mypguser;
CREATE DATABASE testtasklist OWNER mypguser;
\q
```

SQL commands usually end with a semicolon. Strings are written inside single quotes.

</details>

<details>
<summary style="font-size: 1.3em;">PostgreSQL on Linux</summary>

On Linux or WSL, install PostgreSQL with `apt`.

The `<username>` you use below is your Linux username. It is the value returned by the `whoami` command.

Check your username:

```bash
whoami
```

Then run these commands:

```bash
sudo apt update
sudo apt install postgresql
sudo service postgresql start
sudo -su postgres psql
CREATE ROLE <username> LOGIN CREATEDB;
CREATE DATABASE nodehomework OWNER <username>;
CREATE DATABASE tasklist OWNER <username>;
CREATE DATABASE testtasklist OWNER <username>;
\q
```

The `sudo -su postgres psql` command opens the PostgreSQL command-line program as the `postgres` system user.

The `CREATE ROLE` command creates a PostgreSQL user that matches your Linux username.

The three `CREATE DATABASE` commands create the databases used by the course.

</details>

## The PostgreSQL Service

PostgreSQL runs as a service in the background.

On Mac and Linux, the setup commands above start the service now, but they may not start it forever. If you reboot your computer, PostgreSQL may stop running.

That is okay. You do not need PostgreSQL running all the time. You only need it when you are working on assignments that use the database.

If a database assignment suddenly cannot connect, check that the PostgreSQL service is running.

On Windows, the installer usually configures PostgreSQL to start automatically. You can change that later in the Windows Services panel if you do not want it running all the time.

## Additional Steps for Windows

Windows users should use Git Bash for normal Node development.

When you install Git for Windows, you get Git Bash. Git Bash gives you a terminal that behaves more like the Mac and Linux terminals used in many course examples.

Use Git Bash for commands like:

```bash
git status
npm install
node app.js
```

Do not use `cmd.exe` or PowerShell for normal course work unless a lesson specifically tells you to. Those terminals behave differently, and that can make examples harder to follow.

It helps to know a few basic terminal commands:

- `cd`: Change directories.
- `ls`: List files.
- `mkdir`: Create a folder.
- `touch`: Create a file.
- `pwd`: Show the current folder.

If these commands are new to you, this tutorial may help:

[https://ubuntu.com/tutorials/command-line-for-beginners#1-overview](https://ubuntu.com/tutorials/command-line-for-beginners#1-overview)

Configure Git to handle line endings in the Linux/Mac style:

```bash
git config --global core.eol lf
git config --global core.autocrlf input
```

Configure npm to use Git Bash for scripts:

```bash
npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
```

You should also configure VSCode to use Git Bash as the integrated terminal.

Start VSCode from Git Bash:

```bash
code .
```

Open VSCode settings with `Ctrl + ,`.

Search for `line end`. Set the Eol value to `\n`.

Then search for `terminal integrated default profile windows`. Choose Git Bash from the dropdown.

## The `node-homework` Repository

All of your homework, including the class final project, will be created in this repository.

You should create your own GitHub repository first.

Create a repository called `node-homework` in your GitHub account. Make it public. Do not add a README, `.gitignore`, or license file.

Do not fork the Code the Dream `node-homework` repository.

You are going to clone the Code the Dream repository, then change the `origin` remote so it points to your own GitHub repository. This keeps your homework pull requests pointed at your own repository by default.

Copy the URL for your new GitHub repository.

Open a terminal where you want to keep your code, then clone the course repository:

```bash
git clone https://github.com/Code-the-Dream-School/node-homework
```

Move into the new folder:

```bash
cd node-homework
```

Now connect this local repository to your GitHub repository:

```bash
git remote set-url origin <URL>
git remote add upstream https://github.com/Code-the-Dream-School/node-homework
git push origin main
npm install
```

Replace `<URL>` with the URL of the repository you created in your GitHub account.

The `origin` remote points to your own repository.

The `upstream` remote points to the Code the Dream repository. You will use `upstream` only when course updates need to be pulled into your copy.

The `npm install` command installs the packages used by this project.

## Getting Course Updates

Once in a while, Code the Dream may update starter code or tests in this repository.

When that happens, a mentor may ask you to pull updates from `upstream`.

If you are on `main`, use:

```bash
git checkout main
git pull upstream main
```

If you are working on an assignment branch, first update `main`, then merge it into your assignment branch:

```bash
git checkout main
git pull upstream main
git checkout assignmentx
git merge main
```

Replace `assignmentx` with the name of the branch you are working on.

If you have uncommitted changes, Git may not let you switch branches. In that case, stash your work first:

```bash
git stash
git checkout main
git pull upstream main
git checkout assignmentx
git merge main
git stash apply
```

This should be infrequent. You only need it when course materials change.

## Creating Your `.env` File

The `.env` file stores environment variables for this project.

Environment variables are values your app reads from the operating system instead of hardcoding them in your JavaScript files.

Database connection strings belong in `.env` because they can be different on each computer.

Create a file named `.env` in the root of the `node-homework` folder.

The content depends on your operating system.

<details>
<summary>The `.env` file for Mac</summary>

Use your Mac username in place of `<username>`.

```text
DB_URL=postgresql://<username>@localhost/nodehomework?host=/tmp
DATABASE_URL=postgresql://<username>@localhost/tasklist?host=/tmp
TEST_DATABASE_URL=postgresql://<username>@localhost/testtasklist?host=/tmp
```

</details>

<details>
<summary>The `.env` file for Windows</summary>

Use the password you created for the `mypguser` PostgreSQL user.

Replace `<pg-password>` with that password.

```text
DB_URL=postgresql://mypguser:<pg-password>@localhost/nodehomework
DATABASE_URL=postgresql://mypguser:<pg-password>@localhost/tasklist
TEST_DATABASE_URL=postgresql://mypguser:<pg-password>@localhost/testtasklist
```

</details>

<details>
<summary>The `.env` file for Linux</summary>

Use your Linux username in place of `<username>`.

```text
DB_URL=postgresql://<username>@localhost/nodehomework?host=/var/run/postgresql
DATABASE_URL=postgresql://<username>@localhost/tasklist?host=/var/run/postgresql
TEST_DATABASE_URL=postgresql://<username>@localhost/testtasklist?host=/var/run/postgresql
```

</details>

## Validating Your Setup

After PostgreSQL and `.env` are configured, load the sample database.

From the root of the `node-homework` folder, run:

```bash
node load-db
```

You should see messages that tables have been loaded.

If this command does not work, first check that PostgreSQL is running. Then check that your `.env` file matches your operating system and username.

If you still have trouble, ask a mentor or another student for help.

## What `load-db.js` Does

The `load-db.js` file is a database setup script.

It creates the sample database tables used in the SQL and PostgreSQL assignments.

It does four main things:

- Creates five database tables: `customers`, `employees`, `products`, `orders`, and `line_items`.
- Loads sample data from CSV files in the `./csv/` folder.
- Sets up relationships between tables with foreign keys.
- Checks that your database connection is working.

When you run `node load-db`, it builds a small business database system that you will use in assignments.

Make sure PostgreSQL is running before you run it. Also make sure the `./csv/` folder exists with the required data files.

You can inspect the tables with pgAdmin 4, the desktop tool that comes with PostgreSQL.

For example, on Windows you may find them here:

```text
pgAdmin 4 -> Servers -> PostgreSQL 17 -> Databases -> nodehomework -> Schemas -> public -> Tables
```

## Working on Assignments

Each assignment should be developed on its own Git branch.

A branch keeps your assignment work separate from `main` and from other assignments.

Before you start a new assignment, make sure your local `main` branch is up to date:

```bash
git checkout main
git pull origin main
```

Then create a branch for the assignment:

```bash
git checkout -b assignment1
```

For assignment 2, you might use:

```bash
git checkout -b assignment2
```

From the `node-homework` folder, open VSCode:

```bash
code .
```

As you work, commit your code whenever it reaches a stable point.

Check what changed:

```bash
git status
```

Stage your changes:

```bash
git add -A
```

Commit your work:

```bash
git commit -m "Completion of week 1 assignment"
```

Push your branch to GitHub:

```bash
git push origin assignment1
```

Then open your `node-homework` repository on GitHub and create a pull request.

Submit the pull request link in the assignment submission form.

Do not merge the pull request until your reviewer approves it.

Each assignment should start from the latest version of `main`. This helps you avoid carrying unfinished work from one assignment into the next.

## Project Structure

The repository has several folders and files you will use during the course.

- `assignment1/`, `assignment2/`, and similar folders: Places for assignment code that is not part of the final project.
- `tdd/`: Test-driven development files for homework assignments.
- `tests/`: Tests used for assignment 9.
- `project-links.txt`: A place to record pull request links and deployed app URLs later in the course.
- `app.js`, `routes/`, `controllers/`, `utils/`, and `models/`: Common Express application files you will use as the project grows.
- `package.json`: The npm package file for the project.

The repository is structured so it can support local development and later cloud deployment.

Before you begin the assignments, take a little time to read through the files that are already in the `node-homework` repository.

You do not need to understand every line right away. The goal is to get familiar with the shape of the project.

Look at the folder names. Open a few JavaScript files. Notice where routes, controllers, tests, assignment folders, and configuration files live.

This will make later lessons easier, because you will already have a mental map of where things belong.

## Good Luck With the Class

Take the setup one step at a time.

If a command fails, read the error message carefully. Many setup problems come from one of three things:

- The terminal is in the wrong folder.
- PostgreSQL is not running.
- A username, password, or database name does not match the `.env` file.

Ask for help when you are stuck. Setup issues are normal, especially when installing database tools for the first time.

## License

Copyright (c) 2025 Code the Dream

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
