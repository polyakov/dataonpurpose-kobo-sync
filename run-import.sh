#!/bin/bash

#sleep for a 10 minutes to let things start up
echo "going to sleep for 10 minutes at $(date)"
sleep 600

while :
do
	echo "=================================== run sync ======================================"
    node dist/index.js -s ${KOBO_SERVER}  -t ${KOBO_TOKEN}  -a ${KOBO_ASSET} -c ${PSQL_CONNECTION_STR} ]
	echo "=================================== end sunc ======================================"
    echo "LOOP_LENGTH_MINUTES: $LOOP_LENGTH_MINUTES"
	WAIT_TIME=$[ $LOOP_LENGTH_MINUTES - $RANDOM % 30 + 15 ]
	echo "sleeping for "$WAIT_TIME"m starting $(date)"
	sleep $[ $WAIT_TIME * 60 + $RANDOM % 60 ]
done



