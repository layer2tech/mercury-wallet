FROM node:16.16.0
WORKDIR /tor-adapter
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]