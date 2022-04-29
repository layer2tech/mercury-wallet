FROM ubuntu:20.04
# update libraries and install nodejs
RUN apt update
RUN apt install nodejs
RUN apt install -y npm
# make a directory build
WORKDIR /build
# copy all the contents in here to build
COPY . .
# force npm install
RUN npm install --force
# switch to user 1000
USER 1000
# port
EXPOSE 8080
# run the dev script
CMD ["npm", "run", "dev"]