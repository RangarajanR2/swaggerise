
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
  let tagsInPaths = [];
  for(let file in retobj){
    let fileObj =  retobj[file];
    let paths = fileObj.paths;
    for(let pathIdx in paths){
      let path = paths[pathIdx];
      for(let method in path){
        let methodTags = path[method].tags;
        if(!methodTags instanceof Array){
          methodTags = [methodTags];
        }
        tagsInPaths = tagsInPaths.concat(methodTags);
      }
    }
  }
  tagsInPaths = [...new Set(tagsInPaths)];
  for(let file in retobj){
    let fileObj = retobj[file];
    Object.assign(paths, fileObj.paths);
    for(let tagId in fileObj.tags){
      let tag = fileObj.tags[tagId];
      if(!tagNames.includes(tag.name) && tagsInPaths.indexOf(tag.name) > -1){
        tagNames.push(tag.name);
        tags.push(tag);
      }
    }
  }
  console.log('Tags in path', tagsInPaths);
  swaggerJson.tags = tags;
  swaggerJson.paths = paths;
  swaggerJson.definitions = defBuilder.getDefs();
  filewriter.write(`${config.swaggerFileName}.json`,JSON.stringify(swaggerJson, null, 4));
  filewriter.write(`${config.swaggerFileName}.yaml`,yaml.stringify(swaggerJson));
}


run();



