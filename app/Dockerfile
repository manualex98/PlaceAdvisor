FROM  node:12

WORKDIR /src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080
EXPOSE 8000

CMD ["npm", "start"]

