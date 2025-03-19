const passportConfig = {
    credentials: {
      tenantID: '338e5fde-efbf-41e2-8b52-eb4b78c8118b',
      clientID: '35db81e3-52bb-42a9-9d79-0a40236ee492'
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
  
