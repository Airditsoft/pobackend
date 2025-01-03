const passportConfig = {
    credentials: {
      tenantID: '3cfec137-8fe6-415d-866b-5a235391cacd',
      clientID: 'b473130b-b703-4ae4-b84b-ab71bc16ab37'
    },
    metadata: {
      authority: 'login.microsoftonline.com',
      discovery: '.well-known/openid-configuration',
      version: 'v2.0'
    },
    settings: {
      validateIssuer: true,
      passReqToCallback: true,
      loggingLevel: 'info',
      loggingNoPII: true
    }
    // protectedRoutes: {
    //     todolist: {
    //         endpoint: "/api/todolist",
    //         delegatedPermissions: {
    //             read: ["Todolist.Read", "Todolist.ReadWrite"],
    //             write: ["Todolist.ReadWrite"]
    //         },
    //         applicationPermissions: {
    //             read: ["Todolist.Read.All", "Todolist.ReadWrite.All"],
    //             write: ["Todolist.ReadWrite.All"]
    //         }
    //     }
    // }
  };
  
  module.exports = passportConfig;
  
