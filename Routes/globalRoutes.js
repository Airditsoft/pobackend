const globalRoutes = require("express").Router();

const { isAuthenticated ,isAdmin} = require("../Authentication/authentication");
const { userRegister, getuserProfile } = require("../controller/usercontroller");
const {getPOdetails,saveAllPOData,POdetail} = require("../controller/poController");
const { handleApprovalOrRejection, getAnalytics, getPOComments, getApprovalHistory, addComments,showLogs} = require('../controller/approvalController');
const {customApproval} = require("../controller/customcontroller");
const {uploadMultipleFiles, getAttachment, getLinks, uploadLinks} = require('../controller/poattachment');
const {upload} = require('../Middleware/multer')




//Auth 
globalRoutes.get('/auth',isAuthenticated,isAdmin,getPOdetails);
globalRoutes.post("/register",isAuthenticated ,userRegister);
globalRoutes.get('/profile',isAuthenticated,getuserProfile);

//po 
globalRoutes.get('/getpo/:PONumberId',isAuthenticated,POdetail);
globalRoutes.get("/savedetails",saveAllPOData);
globalRoutes.post("/custom-approval/:PONumberId",isAuthenticated,customApproval);
globalRoutes.get('/analytics',isAuthenticated,getAnalytics);

//approval or rejected ,history
globalRoutes.put('/approval-rejection/:PONumberId', isAuthenticated, handleApprovalOrRejection);
globalRoutes.get('/logs/:PONumberId',isAuthenticated,showLogs);
globalRoutes.get('/pocomments/:PONumberId',isAuthenticated,getPOComments);
  

//uploadfiles & attachment
globalRoutes.post('/pocomments/:PONumberId',isAuthenticated,addComments);
globalRoutes.post('/uploadattachments/:PONumber',isAuthenticated, upload.array('files', 10), uploadMultipleFiles); // Limit to 10 files
globalRoutes.get('/attachments/:PONumber',isAuthenticated,getAttachment);
globalRoutes.get('/links/:PONumber',isAuthenticated,getLinks);
globalRoutes.post('/links/:PONumber',isAuthenticated,uploadLinks);






module.exports = globalRoutes;
