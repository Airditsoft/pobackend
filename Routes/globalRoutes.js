const globalRoutes = require("express").Router();

const { isAuthenticated ,isAdmin} = require("../Authentication/authentication");
const { userRegister, getuserProfile } = require("../controller/usercontroller");
const {getPOdetails,saveAllPOData,POdetail,getAvailableFields, approvalCycle, defaultCycle} = require("../controller/poController");
const { handleApprovalOrRejection, getAnalytics, getPOComments, getApprovalHistory, addComments,showLogs, sapLogs, poActions, alternateAction} = require('../controller/approvalController');
const {getAllDepartments, departmentaction} = require("../controller/customcontroller");
const {uploadMultipleFiles, getAttachment, getLinks, uploadLinks} = require('../controller/poattachment');
const {upload} = require('../Middleware/multer');
const { saveGlobalRules,getGlobalRules, deleteRules, getdefaultlevels, updateDefaultLevel } = require("../controller/globalRulesController");
const { powerBI } = require("../controller/api");




//Auth 
globalRoutes.get('/auth',isAuthenticated,isAdmin,getPOdetails);
globalRoutes.post("/register",isAuthenticated ,userRegister);
globalRoutes.get('/profile',isAuthenticated,getuserProfile);

//po 
globalRoutes.get('/getpo/:PONumberId',isAuthenticated,POdetail);
globalRoutes.get("/savedetails",saveAllPOData);
globalRoutes.get('/analytics',isAuthenticated,getAnalytics);
globalRoutes.get('/departments',isAuthenticated,getAllDepartments);
globalRoutes.get("/available-fields",isAuthenticated, getAvailableFields);
globalRoutes.get('/approval-cycle/:ruleID',isAuthenticated,approvalCycle);
globalRoutes.get('/default-cycle',isAuthenticated,defaultCycle);
globalRoutes.get('/dep-action',isAuthenticated,departmentaction);

//approval or rejected ,history
globalRoutes.put('/approval-rejection/:PONumberId', isAuthenticated, handleApprovalOrRejection);
globalRoutes.get('/logs/:PONumberId',isAuthenticated,showLogs);
globalRoutes.get('/pocomments/:PONumberId',isAuthenticated,getPOComments);
globalRoutes.put('/save-action/:PONumberId',isAuthenticated,poActions);
globalRoutes.put('/save-alternate-action',isAuthenticated,alternateAction);
  

//uploadfiles & attachment
globalRoutes.post('/pocomments/:PONumberId',isAuthenticated,addComments);
globalRoutes.post('/uploadattachments/:PONumber',isAuthenticated, upload.array('files', 10), uploadMultipleFiles); // Limit to 10 files
globalRoutes.get('/attachments/:PONumber',isAuthenticated,getAttachment);
globalRoutes.get('/links/:PONumber',isAuthenticated,getLinks);
globalRoutes.post('/links/:PONumber',isAuthenticated,uploadLinks);



//PO Rules 
globalRoutes.post('/save-rules',isAuthenticated,saveGlobalRules);
globalRoutes.get('/get-saved-rules',isAuthenticated,getGlobalRules);
globalRoutes.delete('/delete-rule/:ruleId',isAuthenticated,deleteRules);
globalRoutes.get('/get-default-levels',isAuthenticated,getdefaultlevels);
globalRoutes.put('/update-rules',isAuthenticated,updateDefaultLevel);



//apipowerBI
globalRoutes.get('/powerbi',powerBI);
globalRoutes.get('/saplogs/:PONumber',sapLogs);






module.exports = globalRoutes;
