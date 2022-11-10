FROM node:16.16.0
WORKDIR /app
COPY package.json .
RUN npm install --force
COPY . .
ENV REACT_APP_NAME=mercuryWallet
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]