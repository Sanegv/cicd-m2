FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
# idk why this is needed, ask Louis
RUN npm install react-scripts --save 

COPY . .

RUN npm run build

EXPOSE 80

CMD ["npm", "start"]