
const config = require('./conf-file-helper').initialiseConfig();

const routeParser = require('./route-parser');

const SchemaParser = require('./schema-parser');

let yaml = require('json2yaml');

let filewriter = require('./filewriter');

const defBuilder = require('./definition-builder').getInstance();

if(config == null){
  console.log('Something happened. Exiting...');
  process.exit(-1);
}

let swaggerJson = config.appMeta;

async function run(){
  let retobj = await routeParser.buildFromRoutes(config.routesFolder);
  let paths = {};
  let tags = [];
  let tagNames = [];
  for(let file in retobj){
    let fileObj = retobj[file];
    Object.assign(paths, fileObj.paths);
    for(let tagId in fileObj.tags){
      let tag = fileObj.tags[tagId];
      if(!tagNames.includes(tag.name)){
        tagNames.push(tag.name);
        tags.push(tag);
      }
    }
  }
  swaggerJson.tags = tags;
  swaggerJson.paths = paths;
  swaggerJson.definitions = defBuilder.getDefs();
  filewriter.write(`${config.swaggerFileName}.json`,JSON.stringify(swaggerJson, null, 4));
  filewriter.write(`${config.swaggerFileName}.yaml`,yaml.stringify(swaggerJson));
}


run();



