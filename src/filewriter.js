const fs = require('fs');
exports.write = function(fileName, data){

    fs.writeFileSync(fileName,data);
}