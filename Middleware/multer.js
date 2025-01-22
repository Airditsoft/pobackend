
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const uploadDirectory = path.join(__dirname, 'uploads');


// Ensure upload directory exists
if (!fs.existsSync(uploadDirectory)){
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });
module.exports = { upload};