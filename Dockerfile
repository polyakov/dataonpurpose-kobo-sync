FROM node:18

WORKDIR /usr/src/kobo-sync

ADD ./dist ./dist
ADD package.json .
RUN npm install

ADD run-import.sh .
CMD ./run-import.sh
