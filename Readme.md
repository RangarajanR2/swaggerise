swaggerise
===

A command-line utility to generate Swagger compatible yaml and json by parsing Router annotations. 

Installation
===

```bash
NA
```

Notes
---
1.  It can only be run on the root folder of a express-style project. ( It must have a route folder where all router files are present)
2.  The project root folder can contain a schema folder which will be scanned for external object schema. ( Useful for representing objects which are sent in the body of a request. Currently only JOI schema is supported)
3.  A conf file will be generated if not present in the project folder. Users must take care to edit the conf file before generating the swagger yaml.
4.  All route files must export only the router object. Else, it won't be considered as a route file.

Usage
---

Run the index file on a express project root folder.

```bash
express-project-root> node ./path-to-swaggerise/index.js

```
Router annotations : 
1. @parameters  -  Reference to external schema file. Syntax is '#/path-to-schema-file'. If more than one schema is   exported from the schema file, access it like a regular JSON. Ex. '#/path-to-schema-file.propertyKey'.
2. @description -   Description for this particular endpoint.
3. @summary     -   Summary for the particular endpoint.
4. @operationId -   Unique operation id
5. @produces    -   Stringified JSON array of response type.
6. @consumes    -   Stringified JSON array of api input type.
7. @responses   -   Stringified JSON object of possible response codes and description for them.

Module annotations : 
1. @@description    -   Description for the whole router file/module.
2. @externalDocDesc -   Description for external document for the module.
3. @externalDocUrl  -   Url for the external document.

Example
===

Router annotation : 

```javascript
/**
 * @parameters #/user.js.add  
 * @description Description for this path
 * @summary Summary for this route
 * @operationId Unique operation id
 * @produces ["application/json"]
 * @consumes ["application/json"] 
 * @responses   '{"200":{"description":"successful operation"}}' 
 */

server.post('/add', validation(schema.add), async (req, res, next) => {
    //Endpoint handler.
}
```
Module annotation : 

```javascript
/**
 * @description hello
 * @externalDocDesc doc
 * @externalDocUrl  http://tis.io/terms/
 */
module.exports = router;

```

TO-DO
---
1. Add support for other external schema types other than Joi. 