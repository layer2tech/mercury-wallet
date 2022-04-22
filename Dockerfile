FROM node:latest
RUN yarn app-linux
CMD [ "npm", "start" ]
EXPOSE 8080