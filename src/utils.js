const path = require('path')

const express = require('express');

exports.isExpressRouter = function(object){
    return typeof(object) == 'function' && object.hasOwnProperty('stack')
}

exports.workingPath = function(fileName){
    return path.join(process.cwd(), fileName)
}

exports.isRouterFile    = function(file){
    if(!file)   return false;
    let obj = require(file);
    return exports.isExpressRouter(obj);
}

exports.getModuleName   = function(file){
    let fileNameParts = file.split(path.sep);
    let fileName = fileNameParts[fileNameParts.length - 1];
    let extensionlessFName = fileName.split('.')[0];
    let tempName = extensionlessFName.toLowerCase();
    return tempName[0].toUpperCase() + tempName.slice(1,tempName.length);
}
