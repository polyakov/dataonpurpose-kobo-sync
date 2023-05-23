# For testing

docker run -d --name postgres-test -p 5432:5432 -e POSTGRES_PASSWORD=Password1 -d postgres


docker build --tag polyakov/dop-kobo-sync:latest .
docker rm kobo-sync
docker run --name kobo-sync polyakov/dop-kobo-sync:latest