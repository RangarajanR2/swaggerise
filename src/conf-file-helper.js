
const {workingPath}  = require('./utils');

const fs = require('fs');

let config = null;      //Will be initialised once per run, which is okay for us.

exports.initialiseConfig = function(){
  if(config) return config;
  config = readConfFile();
  return config;
}

let readConfFile = function(){
      let fileName = 'swagger-conf.json';
      let filePath = workingPath(fileName);
      if(!fs.existsSync(filePath)){
        console.log("Cannot find "+filePath+". \r\n");
        confirm("Do you like to copy a sample conf file [y/n]?...", (ok) => {
          if(ok){
            fs.copyFileSync(__dirname+path.sep+fileName, filePath);
            console.log("Successfully created a sample configuration file. \r\n Please go through and edit the file and then try 'swagger' to generate the swagger file.");
            process.exit(0);
          }else{
            console.log("Exiting...");
            process.exit(-1);
          }
        })
        // process.exit(-1);
      }else{
        config = require(filePath);
        return config;
      }
  }