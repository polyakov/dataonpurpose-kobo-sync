# Kobo Sync Container
The purpose of this container is to sync all Kobo forms to a Postgres database as JSON data.  This approach allows syncing even forms change and creates a foundation for future processing.

# Prerequisites
To run this process you will need API access to a Kobo instance and Postgres database.

## Kobo
Account: https://kf.kobotoolbox.org/
Token: https://support.kobotoolbox.org/api.html

**Steps**

1. Create postgres container
1. Deploy database and sync table
1. Deploy sync container

## Postgres
Run postgres container:
```
DB_ADMIN_PASSWORD=Password1

docker run -d --name postgres-test -p 5432:5432 -e POSTGRES_PASSWORD=$DB_ADMIN_PASSWORD -d postgres
```
## Setup database and table
Using pgAdmin or another tool create the user and database
```
CREATE USER kobosync password 'Password2';
```
and
```
CREATE DATABASE kobosync
     WITH OWNER=kobosync
```
Set up environment variables for later:
```
DATABASE_NAME=kobosync
SYNC_USERNAME=kobosync
SYNC_USER_PASSWORD=Password2
```
Login as this user and create table:
```
CREATE TABLE IF NOT EXISTS public.kobo_form_sync
(
    form json,
    sync_date timestamp without time zone DEFAULT now(),
	id bigint not null PRIMARY KEY
)
TABLESPACE pg_default;
```

## Run sync container
Set environment variables using values recovered from kobo portal.
```
KOBO_SERVER=https://kf.kobotoolbox.org
KOBO_FORM_ID=<formid>
KOBO_TOKEN=<api-token>
```

Get IP of the postgres container using the name used in the `docker run` command using  `docker inspect postgres-test`.  This IP will be used in the connection string. Define variable for IP address:
```
PSQL_SERVER=172.17.0.2
```
Define the connection string:
```
PSQL_CONNECTION_STR="postgresql://$SYNC_USERNAME:$SYNC_USER_PASSWORD@$PSQL_SERVER/$DATABASE_NAME?sslmode=disable"
```
Run kobo-sync container:
```
docker run -d \
-e KOBO_SERVER=$KOBO_SERVER \
-e KOBO_TOKEN=$KOBO_TOKEN \
-e KOBO_ASSET=$KOBO_FORM_ID \
-e PSQL_CONNECTION_STR=$PSQL_CONNECTION_STR \
-e LOOP_LENGTH_MINUTES=30 \
--name kobo-sync \
polyakov/dop-kobo-sync
```
## Monitor execution
```
docker logs -f kobo-sync
```

You should see output that looks like this:
```
going to sleep for 5 minutes at Fri Jun 21 18:54:50 UTC 2024
=================================== run sync ======================================
Last sync date:  null
Total records to scan:  3
Records inserted:  3
exiting
=================================== end sunc ======================================
LOOP_LENGTH_MINUTES: 30
sleeping for 34m starting Fri Jun 21 19:00:22 UTC 2024
```
Check the database:
```
SELECT * FROM kobo_form_sync
```
### Powershell
Set envoronment variables using powershell
```
$Env:DATABASE_NAME=kobosync
$Env:SYNC_USERNAME=kobosync
$Env:SYNC_USER_PASSWORD=Password2

$Env:KOBO_SERVER="https://kf.kobotoolbox.org"
$Env:KOBO_FORM_ID=<form_id>
$Env:KOBO_TOKEN=<api-token>

PSQL_SERVER=172.17.0.2

PSQL_CONNECTION_STR="postgresql://$Env:SYNC_USERNAME:$Env:SYNC_USER_PASSWORD@$Env:PSQL_SERVER/$Env:DATABASE_NAME?sslmode=disable"
```

Run the container in powershell:
```
docker run -d `
-e KOBO_SERVER=$Env:KOBO_SERVER `
-e KOBO_TOKEN=$Env:KOBO_TOKEN `
-e KOBO_ASSET=$Env:KOBO_FORM_ID `
-e PSQL_CONNECTION_STR=$Env:PSQL_CONNECTION_STR `
-e LOOP_LENGTH_MINUTES=30 `
--name kobo-sync `
polyakov/dop-kobo-sync
```

# Building the container
```npm run build
docker build --tag polyakov/dop-kobo-sync:latest .
docker push polyakov/dop-kobo-sync:latest
```

