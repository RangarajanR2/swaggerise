#!/usr/bin/env node

let j2s = require('joi-to-swagger');

let writeJson = require('write-json-file');

let annotations = require('./annotations');

let path = require('path');

let lodash = require('lodash');

let readline = require('readline');

let yaml = require('json2yaml');

const fs = require('fs');
const fsPromises = fs.promises;

let conf = null;

let readConfFile = function(){
  return new Promise( (resolve, reject) => {
    let fileName = 'swagger-conf.json';
    let filePath = process.cwd()+path.sep+fileName
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
      conf = require(filePath);
      resolve();
    }
  })
}

let workingPath = function(fileName){
  return process.cwd()+path.sep+fileName;
}

/**
 * Prompt for confirmation on STDOUT/STDIN
 */

let confirm = function (msg, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question(msg, function (input) {
    rl.close()
    callback(/^y|yes|ok|true$/i.test(input))
  })
}

let constructBodyParameter = function(meta, required){
  let parameter = {
    in : 'body',
    name : 'body',
    required : required,
    description : meta.desc.bodyDescription,
    schema : {
      "$ref" : "#/definitions/"+meta.bodyObjKey
    }
  }
  return parameter;
}

let constructQueryParameter = function(meta, swagObject){
  let parameters = [];
  let props = swagObject.properties;
  for(let propKey in props){
    let parameter = {
      in : 'query',
      name : propKey,
      description : meta.desc.parameters[propKey] || ""
    }
    if(swagObject.required && swagObject.required.indexOf(propKey) > -1){
      parameter.required = true;
    }
    Object.assign(parameter, props[propKey]);
    parameters.push(parameter);
  }
  return parameters;
}

let constructParam = function(meta, swagObject){
  let parameters = [];
  let props = swagObject.properties;
  for(let propKey in props){
    let parameter = {
      in : 'path',
      name : propKey,
      description : meta.desc.parameters[propKey] || ""
    }
    if(swagObject.required && swagObject.required.indexOf(propKey) > -1){
      parameter.required = true;
    }
    Object.assign(parameter, props[propKey]);
    parameters.push(parameter);
  }
  return parameters;
}

let standardResponses = {
  "200": {
    "description": "successful operation"
  }
}

let findRouter = function(file){
  let possibleRouter = require(file);
  if(typeof(possibleRouter) == 'function' && possibleRouter.hasOwnProperty('stack')){
    return possibleRouter;
  }
  return null;
}

let swag = {
  paths : {},
  tags : [],
  definitions : {}
}

let processDir = function(folder,clonableParents){
  return new Promise((resolve, reject) => {
    fsPromises.readdir(folder).then( (files) => {
      let promises = lodash._.map(files, function(fileKey){
        return new Promise( (resolution, rejection) => {
          let file = folder+path.sep+fileKey;
          let parents = lodash._.cloneDeep(clonableParents);
          if(fs.statSync(file).isDirectory()){
            parents.push(fileKey)
            return processDir(file, parents).then( () => {
              resolution();
            })
          }else if(fs.statSync(file).isFile()){
            return processFile(file, parents).then( (fileMeta) => {
              Object.assign(swag['paths'], fileMeta.paths);
              swag['tags'].push(fileMeta.tags);
              resolution();
            }).catch((err) => {
              console.log({err : err, file : file});
              resolution();
            })
          }
        })
      });
      Promise.all(promises).then( (results) => {
        return resolve();
      })
    }).catch((err) => {
      console.log(err);
      process.exit(-1);
    })
  })
}

let processFile = function(file, parents){
  console.log('processing '+file)
  return new Promise((resolve, reject) => {
    let router = findRouter(file);
    if(!router){
      return reject("Cannot find a valid router in "+file);
    }
  annotations.get(file, (err, annotations) => {
    if(err){
      return reject(err);
    }
    let moduleMeta = annotations['module'];
    delete annotations['module'];
    let moduleDesc = {
      name : (parents instanceof Array) ? parents[parents.length - 1] : parents,
      description : moduleMeta.description,
      externalDocs : {
        description : moduleMeta.externalDocDesc,
        url : moduleMeta.externalDocUrl
      }
    }
    let annotationKeys = Object.keys(annotations);
    for(let keyIndex in annotationKeys){
      if(parseInt(annotationKeys[keyIndex]) === NaN){
        delete annotations[annotationKeys[keyIndex]];
      }
    }
    let processedAnnos = processAnnotation(annotations, router, parents);
    resolve({
      paths : processedAnnos,
      tags : moduleDesc
    });
  })
  })
}

let processAnnotation = function(annotationObject, router, parents){
    //Do Something here.
    let retObj = {};
    for(let routerNumber in annotationObject){
      let endPoint = router.stack[routerNumber].route.path;
      if(!retObj[endPoint]){
        retObj[endPoint] = {};
      }
      let methods = annotationObject[routerNumber];
      for(let method in methods){
        let currentObj = {}
        let annotations = methods[method];
        if(annotations['parameters']){
          let params = joiToSwagger(annotations['parameters']);
          Object.assign(currentObj, params);
        }
        if(annotations['summary']){
          currentObj['summary'] = annotations['summary']
        }
        if(parents){
          if(parents instanceof String){
            parents = [parents];
          }
          currentObj['tags'] = parents;
        }
        if(annotations['description']){
          currentObj['description'] = annotations['description']
        }
        if(annotations['operationId']){
          currentObj['operationId'] = annotations['operationId']
        }
        if(annotations['produces']){
          try {
            currentObj['produces'] = JSON.parse(annotations['produces']);
          } catch (error) {
            console.log('Annotation:Produces must be array object for endPoint '+endPoint+" and method "+method)
          }
        }
        if(annotations['consumes']){
          try {
            currentObj['consumes'] = JSON.parse(annotations['consumes']);
          } catch (error) {
            console.log('Annotation:consumes must be array object for endPoint '+endPoint+" and method "+method)
          }
        }
        if(!annotations['responses']){
          annotations['responses'] = JSON.stringify(standardResponses);
        }
        currentObj['responses'] = JSON.parse(annotations['responses']);
        retObj[endPoint][method] = currentObj;
      }
    }
    return retObj;
}

let joiToSwagger = function(schemaString){
  let schema = readSchema(schemaString);
  let desc = schema.desc;
  let bodyObjKey = schema.bodyObjKey;
  let meta = {
    desc : desc,
    bodyObjKey : bodyObjKey
  }
  delete schema.desc;
  delete schema.bodyObjKey;
  let keys = Object.keys(schema);
  let holder = {
    parameters : []
  }
  let swaggered = j2s(schema).swagger;
  let props = swaggered.properties;
  if(meta.bodyObjKey){
    swag.definitions[meta.bodyObjKey] = swaggered.properties.body;
  }
  for(propKey in props){
      if(propKey == 'body'){
        holder['parameters'].push(constructBodyParameter(meta, swaggered.required.indexOf('body') > -1));
      }
      else if(propKey == 'query'){
        let arr = constructQueryParameter(meta, props[propKey])
        holder['parameters']  = holder['parameters'].concat(arr);
      }else if(propKey == 'params'){
        let arr = constructParam(meta, props[propKey]);
        holder['parameters']  = holder['parameters'].concat(arr);
      }
  }
  return holder;
}

let readSchema = function(schemaString){
  let parsedSchemaLocation = parseSchemaLocation(schemaString);
  let schema = require(parsedSchemaLocation.file);
  if(!parsedSchemaLocation.param){
    return schema;
  }
  return schema[parsedSchemaLocation.param];
}

let parseSchemaLocation = function(schemaString){
  if(!schemaString.startsWith('#')){
    console.log('Not a valid schema string : '+schemaString+". Schema string must start with #");
  }
  schemaString = schemaString.substring(1).replace('\\',path.sep).replace('\/',path.sep);
  let tempString = schemaString.replace('\.js\.','.')
  let param = tempString.split('.')[1];
  let folderPath = schemaString.replace(param,'');
  folderPath = folderPath.slice(0,-1);
  let file = workingPath(conf.schemaFolder)+folderPath;
  if(!fs.existsSync(file) && !fs.existsSync(file+'.js')){
    console.log("Can't find specified schema file : "+file);
  }
  let obj = {
    file : file
  }
  if(param){
    obj['param'] = param
  }
  return obj;
}

readConfFile().then( () => {
  if(conf == null){
    console.log('Something happened. Exiting...');
    process.exit(-1);
  }
  if(!fs.existsSync(workingPath(conf.routesFolder)) && !(fs.existsSync(workingPath(conf.schemaFolder)))){
    console.log("Please execute swagger in express project root folder with proper 'routes' and 'schema' folders.");
    process.exit(-1);
  }
  Object.assign(swag, conf.appMeta)
  processDir(workingPath(conf.routesFolder),[]).then( () => {
    console.log('Done');
    writeJson.sync('swag.json', swag);
    console.log("Wrote file : swag.json");
    fs.writeFileSync(workingPath('swag.yaml'),yaml.stringify(swag));
    console.log("Wrote file : swag.yaml");
    process.exit(0);
  })
})