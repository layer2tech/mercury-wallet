FROM node:16.16.0
WORKDIR /tor-adapter
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3001
EXPOSE 3002
CMD ["npm", "start"]