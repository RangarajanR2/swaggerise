const annoLib = require('../annotations');

const { getModuleName } = require('./utils');

const SchemaParser = require('./schema-parser');

const defBuilder = require('./definition-builder').getInstance();

function prepareModuleMetadata(metadata, moduleParents) {
  if (!metadata) {
    return null;
  }
  let meta = {};

  meta.name = (moduleParents instanceof Array) ? (moduleParents.length == 0 ? getModuleName(file) : moduleParents[moduleParents.length - 1]) : moduleParents;
  meta.description = metadata.description;

  if (metadata.externalDocDesc || metadata.externalDocUrl) {
    meta.externalDocs = {
      description: metadata.externalDocDesc,
      url: metadata.externalDocUrl
    }
  }
  return meta;
}

exports.readAnnotations = function (file) {
  return new Promise((resolve, reject) => {
    annoLib.get(file, (err, annotations) => {
      if (err) return reject(err);
      else return resolve(annotations);
    })
  })
}

function parseData(annotationKV, router, moduleParents) {
  let retObj = {};
  try {
    for (let routerNumber in annotationKV) {
      routerNumber = parseInt(routerNumber);
      let endPoint = router.stack[routerNumber].route.path;
      if (!retObj[endPoint]) {
        retObj[endPoint] = {};
      }
      let methods = annotationKV[routerNumber];
      for (let method in methods) {
        let currentObj = {}
        let annos = methods[method];
        if (annos['parameters']) {
          let params = parseRequestSchema(annos['parameters']);
          if (params) {
            Object.assign(currentObj, params);
          }
        }
        if (annos['summary']) {
          currentObj['summary'] = annos['summary']
        }
        if (moduleParents) {
          if (moduleParents instanceof String) {
            moduleParents = [moduleParents];
          }
          currentObj['tags'] = moduleParents;
        }
        if (annos['description']) {
          currentObj['description'] = annos['description']
        }
        if (annos['operationId']) {
          currentObj['operationId'] = annos['operationId']
        }
        if (annos['produces']) {
          try {
            if (annos['produces'] instanceof String) {
              annos['produces'] = [annos['produces']];
            }
            currentObj['produces'] = JSON.parse(annos['produces']);
          } catch (error) {
            console.log('Annotation:Produces must be array object for endPoint ' + endPoint + " and method " + method)
          }
        }
        if (annos['consumes']) {
          try {
            if (annos['consumes'] instanceof String) {
              annos['consumes'] = [annos['consumes']];
            }
            currentObj['consumes'] = JSON.parse(annos['consumes']);
          } catch (error) {
            console.log('Annotation:consumes must be array object for endPoint ' + endPoint + " and method " + method)
          }
        }
        try {
          console.log('Parsing response schema', annos['responses'])
          currentObj['responses'] = parseResponseSchema(annos['responses']);
          console.log('Parsed data', currentObj['responses']);
        } catch (error) {
          console.log('err', annos['responses'], error);
          currentObj['responses'] = annos['responses'];
        }
        retObj[endPoint][method] = currentObj;
      }
    }
  } catch (error) {
    console.log(error);
    process.exit(-1);
  }
  return retObj;
}

let constructQueryParam = function (swagObject) {
  let parameters = [];
  let props = swagObject.properties;
  for (let propKey in props) {
    let prop = props[propKey];
    let parameter = {
      in: 'query',
      name: propKey,
    }
    Object.assign(parameter, prop);
    if (swagObject.required && swagObject.required.indexOf(propKey) > -1) {
      parameter.required = true;
    }
    parameters.push(parameter);
  }
  return parameters;
}

let constructParam = function (meta, swagObject) {
  let parameters = [];
  let props = swagObject.properties;
  for (let propKey in props) {
    let parameter = {
      in: 'path',
      name: propKey,
      description: meta.desc.parameters[propKey] || ""
    }
    if (swagObject.required && swagObject.required.indexOf(propKey) > -1) {
      parameter.required = true;
    }
    Object.assign(parameter, props[propKey]);
    parameters.push(parameter);
  }
  return parameters;
}

let constructBodyParam = function(swaggerObject, key){
  let parameter = {}
  parameter.name = key;
  parameter.schema = {};
  if(swaggerObject.description) parameter.description = swaggerObject.description;
  if(swaggerObject.required) parameter.required = true; //If something is required in the object, then the object is itself required. 
  if(swaggerObject.title){
    let title = swaggerObject.title.replace(/\s+/,"");
    defBuilder.addDef(title,swaggerObject);
    parameter.schema["$ref"] = `#/definitions/${title}`
  }else{
    parameter.schema = swaggerObject;
  }
  return parameter;
}

let constructRequestParameter = function(swaggerObject, key){
  let parameter = {};
  parameter.in = key;
  switch(key){
    case 'body' :
      Object.assign(parameter, constructBodyParam(swaggerObject,key));
      break;
    case 'param' :
      //TODO
    break;
    case 'query' :
      parameter = constructQueryParam(swaggerObject);
      break;
    default:
      throw new Error(`Unrecognisable request property ${key}. Should be one of body, param, query`)
  }
  return parameter;
}

function parseRequestSchema(schemaString) {

  let swaggered = SchemaParser.parseJoiSchema(schemaString);
  if (!swaggered) {
    return null;
  }
  let holder = {
    parameters: []
  }
  let props = swaggered.properties;
  for (propKey in props) {
    let prop = props[propKey];
    let param = constructRequestParameter(prop,propKey);
    if(param instanceof Array){
      holder.parameters = holder.parameters.concat(param);
    }else{
      holder['parameters'].push(param);
    }
  }
  console.log('Returning holder',holder);
  return holder;
}

function parseResponseSchema(response) {
  let standardResponses = {
    "200": {
      "description": "successful operation"
    },
    "404": {
      "description": "Resource not found"
    }
  };
  if (!response) {
    return standardResponses;
  }
  function isSchemaString(str) {
    return str.startsWith('#');
  }
  if (isSchemaString(response)) {
    let swaggered = SchemaParser.parseJoiSchema(response);
    console.log('Swaggered',JSON.stringify(swaggered, null, 4));
    let responseObj = {};
    for(let prop in swaggered.properties) {
      responseObj[prop] = {description : "test"};
      let srcObj = swaggered.properties[prop];
      responseObj[prop].schema = {
        type : srcObj.type,
        properties : srcObj.properties
      }
      if(srcObj.title){
        //Doesnot support array parsing now
        let title = srcObj.title.replace(/\s+/g,"");
        defBuilder.addDef(title,srcObj);
        responseObj[prop].schema = {
          $ref : `#/definitions/${title}`
        }
      }
    }
    return responseObj;
  } else {
    return JSON.parse(response);
  }
}

exports.parse = async function (file, parents) {
  let annotations = await exports.readAnnotations(file);

  let moduleMeta = prepareModuleMetadata(annotations['module'], parents);

  delete annotations['module'];

  let returnable = { annotations, metadata : moduleMeta};

  let router = require(file);

  let data = parseData(annotations, router, parents);

  returnable.data = data;

  return returnable;


}

