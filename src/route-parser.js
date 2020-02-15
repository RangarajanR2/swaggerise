const { workingPath, isRouterFile, getModuleName } = require('./utils');

const path = require('path');

const lodash = require('lodash');

const fs = require('fs');

const fsPromises = fs.promises;

const annotationParser = require('./annotation-parser');

exports.buildFromRoutes = async function (routesFolder) {

    let exists = await checkFileExists(workingPath(routesFolder));

    if (!exists) {
        console.log('Unable to locate the routes folder ', routesFolder);
        console.log('Exiting...');
        process.exit(0);
    }

    let tuples = await processDir(routesFolder, []);

    let retObj = {};

    let tags = [];

    let paths = {};

    for(let tupleKey in tuples){
        let tuple = tuples[tupleKey];
        retObj[tuple.file] = {};
        let temp = await parseFile(tuple.file, tuple.parents);
        tags.push(temp.metadata);
        let tagName = temp.metadata.name;
        let pathObj = {};
        pathObj.tags = [tagName];
        Object.assign(paths, temp.data);
        Object.assign(retObj[tuple.file], {paths, tags});
    }

    return retObj;
}

function FileTuple(file, parents) {

    this.file = file;

    this.parents = parents;
}

async function parseFile(file, parents) {

    let router = isRouterFile(file);
    if (!router) {
        console.log("Cannot find a valid router in " + file + ".. Skipping.");
        return null;
    }
    //This is a router file. Add parents info if not exists.
    parents = parents instanceof Array ? (parents.length == 0 ? [getModuleName(file)] : parents) : parents;

    let { annotations, metadata, data } = await annotationParser.parse(file, parents);

    return { annotations, metadata, data};
}

async function processDir(folder, clonableParents) {
    try {
        let files = await fsPromises.readdir(folder);
        let fileTuples = [];
        files.forEach(async file => {
            let fullPath = path.join(folder, file);
            let parents = lodash._.cloneDeep(clonableParents);
            if (fs.statSync(fullPath).isDirectory()) {
                parents.push(fullPath);
                let tuples = await processDir(fullPath, parents);
                fileTuples.concat(tuples);
            } else if (fs.statSync(fullPath).isFile()) {
                fileTuples.push(new FileTuple(workingPath(fullPath), parents));
            }
        });
        return fileTuples;
    } catch (error) {
        console.log(error);
        process.exit(-1);
    }
}

function checkFileExists(file) {
    return fs.existsSync(file);
}