
const path = require('path');

const fs = require('fs');

const j2s = require('joi-to-swagger');

const { workingPath } = require('./utils');

const Joi = require('joi');

const conf = require('../swagger-conf.json');

const defBuilder = require('./definition-builder').getInstance();

let joiToSwagger = function (schemaString) {
  let schema = readSchema(schemaString);
  if (!schema) {
    return null;
  }
  let swaggered = j2s(schema).swagger;

  return swaggered;
}

let readSchema = function (schemaString) {
  let parsedSchemaLocation = parseSchemaLocation(schemaString);
  if (!parseSchemaLocation) {
    return null;
  }
  let schema = require(parsedSchemaLocation.file);
  if (!schema) {
    return null;
  }
  if (!parsedSchemaLocation.exportParam) {
    return schema;
  }
  return schema[parsedSchemaLocation.exportParam];
}

let parseSchemaLocation = function (schemaString) {
  if (!schemaString.startsWith('#')) {
    console.log('Not a valid schema string : ' + schemaString + ". Schema string must start with #");
  }
  //Let's skip the '#'
  schemaString = schemaString.substring(1);
  //Let's replace the path separators to the current OS specific path separator
  schemaString = schemaString.replace('\\', path.sep).replace('\/', path.sep);

  //If not a .js file, log error and return.
  if (schemaString.indexOf('.js') < 0) {
    console.log('Schema location must be a .js file exporting a valid Joi Schema');
    return null;
  }
  let exportWholeObject = schemaString.endsWith('.js');
  let exportParam = null;
  if (!exportWholeObject) {
    exportParam = schemaString.slice(schemaString.indexOf('.js') + 4, schemaString.length);   // +4 to compensate for '.js'.
  }
  //Let's get rid of the export param and the file extension
  let filePath = schemaString.replace(/\.js.*$/, '.js');

  //Let's search in the schema folder specified in the config file relative the project root directory.
  let file = path.join(workingPath(conf.schemaFolder), filePath);
  if (!fs.existsSync(file)) {
    console.log("Can't find specified schema file : " + file);
    return null;
  }
  let obj = {
    file: file
  }
  if (exportParam) {
    obj['exportParam'] = exportParam;
  }
  return obj;
}

exports.parseJoiSchema = function (schemaString) {
  return joiToSwagger(schemaString)
}
