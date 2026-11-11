# Deploying OrbiTutor on classes.orbit-core.com

This builds one frappe_docker image with Frappe 16, payments, Frappe Learning 16 and OrbiTutor, then
puts it under the existing site. Every command below runs on the server (spark-main). Apache in
front of the site needs no change: OrbiTutor's pages are served by Frappe like any other.

## 1. Put this app on GitHub

```bash
cd orbitutor
git init -b main
git add .
git commit -m "OrbiTutor build 1"
git remote add origin https://github.com/YOUR-GITHUB-USER/orbitutor.git
git push -u origin main
```

A private repository is fine. The image build then needs a token: make a fine-grained GitHub token
with read access to that one repository, and write its URL in `apps.json` as
`https://<token>@github.com/YOUR-GITHUB-USER/orbitutor`. The file is passed to the build as a
secret, so the token isn't kept in the image.

## 2. apps.json

Copy `deploy/apps.json` and put your GitHub user (and token, if private) in the last entry:

```json
[
  { "url": "https://github.com/frappe/payments", "branch": "version-16" },
  { "url": "https://github.com/frappe/lms", "branch": "version-16" },
  { "url": "https://github.com/YOUR-GITHUB-USER/orbitutor", "branch": "main" }
]
```

Frappe Learning 16 needs payments, so it's there too.

## 3. Build the image

```bash
git clone https://github.com/frappe/frappe_docker
cd frappe_docker
cp /path/to/apps.json .

docker build \
  --no-cache \
  --build-arg=FRAPPE_PATH=https://github.com/frappe/frappe \
  --build-arg=FRAPPE_BRANCH=version-16 \
  --secret=id=apps_json,src=apps.json \
  --tag=orbitutor-lms:16-build1 \
  --file=images/layered/Containerfile .
```

The layered image starts from Frappe's own version-16 base (Python 3.14, Node 24), so there's
nothing else to set. OrbiTutor's screens are already built (`orbitutor/public/ui`), so the image
build doesn't compile them.

## 4. Back up the site

Before anything changes:

```bash
docker compose -p <your-project> exec backend \
  bench --site classes.orbit-core.com backup --with-files
```

The backup lands in the sites volume under `classes.orbit-core.com/private/backups/`. Copy it off
the server (`docker compose cp backend:/home/frappe/frappe-bench/sites/classes.orbit-core.com/private/backups ./backups`).

## 5. Switch the stack to the new image

In the env file you use with frappe_docker:

```txt
CUSTOM_IMAGE=orbitutor-lms
CUSTOM_TAG=16-build1
PULL_POLICY=missing
```

Make the compose file again the way you made it before (`docker compose --env-file ... config > compose.custom.yaml`),
then start it:

```bash
docker compose -p <your-project> -f compose.custom.yaml up -d
```

## 6. Update the site and install OrbiTutor

```bash
B="docker compose -p <your-project> exec backend bench --site classes.orbit-core.com"

$B install-app payments        # skip if it says it's installed already
$B migrate                     # brings the site up to Frappe 16 and Frappe Learning 16
$B install-app orbitutor       # after Frappe Learning, so its emails and sign-in win
$B clear-cache
$B clear-website-cache
$B execute orbitutor.checks.run
```

If the site was on Frappe 15, `migrate` is the upgrade. It runs once and can take a few minutes.

The self-check prints one line per check: `ok`, `note` (worth a look) or `FAIL` (students would
notice). Fix any FAIL, then do the settings in the main README ("Setting it up").

## 7. Look at it

- `https://classes.orbit-core.com/` signed out goes to OrbiTutor's sign-in.
- Sign in as a student: Home, then a course, then a lesson.
- `https://classes.orbit-core.com/catalogue` signed out shows the courses (with Allow Guest Access on).
- Staff sign in and land on Teach (`/teach`). `/lms` addresses go to OrbiTutor's pages; the desk
  is at `/desk`. Frappe's own sign-in is at `/staff-login`.

## Later builds

Push the new code to GitHub, then build again with a new tag and a cache bust so the build fetches
it:

```bash
docker build \
  --build-arg=FRAPPE_PATH=https://github.com/frappe/frappe \
  --build-arg=FRAPPE_BRANCH=version-16 \
  --build-arg=CACHE_BUST=$(date +%s) \
  --secret=id=apps_json,src=apps.json \
  --tag=orbitutor-lms:16-build4 \
  --file=images/layered/Containerfile .
```

Change `CUSTOM_TAG`, `up -d`, then `migrate`, `clear-cache` and the self-check. (Use the next
number each time: this one is `16-build4`.)

## Going back

- To put Frappe Learning's own pages back on the student addresses without changing the image:
  `bench --site classes.orbit-core.com uninstall-app orbitutor` (it removes the OrbiTutor course
  fields and join requests, so back up first).
- To go back to the old image: set `CUSTOM_TAG` to the old tag and restore the backup from step 4
  (`bench --site classes.orbit-core.com restore <database file> --with-public-files <file> --with-private-files <file>`).
  A database that has been migrated to 16 doesn't run on 15.
