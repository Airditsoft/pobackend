const { createServer } = require('http');
const app = require('./app');
const connectToMongoDB = require('./db/connectToMongoDB');




const httpServer = createServer(app);

const PORT = process.env.PORT || 7000;
const MONGODB_URL = process.env.MONGODB_URL;
console.log(MONGODB_URL)
httpServer.listen(PORT, () => {
    connectToMongoDB(MONGODB_URL);
});