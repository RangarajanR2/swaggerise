
class DefinitionBuilder {

    constructor(){
        this._defs = {};
    }

    addDef(name, def={}){
        this._defs[name] = def;
    }
    
    getDefs(){
        return this._defs;
    }
}

let instance = null;

exports.getInstance = function(){
    if(!instance) instance = new DefinitionBuilder();
    return instance;
}