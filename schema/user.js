'use strict'

const Joi = require('joi');

module.exports = {
    add: {
        body: Joi.object().keys({
            name: Joi.string().trim().required(),
            email: Joi.string().email().trim().required()
        }).required(),
        bodyObjKey : 'user',
        desc : {
            bodyDescription : "User object that needs to be added",
            parameters : {
                name : "Name of the user",
                email : "Email id of the user"
            }
        },
    },
    edit: {
        body: Joi.object().keys({
            name: Joi.string().trim().optional(),
            email: Joi.string().email().trim().optional()
        }).min(1).required(),
        params: Joi.object().keys({
            userId: Joi.number().min(1).integer().required()
        }).required(),
        bodyObjKey : 'user',
        desc : {
            bodyDescription : "User object that needs to be edited",
            parameters : {
                userId : 'Id of the user that needs to be edited'
            }
        },
    },
    delete: {
        params: Joi.object().keys({
            userId: Joi.number().min(1).integer().required()
        }).required(),
        desc : {
            parameters : {
                userId : 'Id of the user that needs to be deleted'
            }
        },
    },
    list: {
        query: Joi.object().keys({
            searchTerm: Joi.string().trim().optional(),
            sortField: Joi.string().trim().optional(),
            sortBy: Joi.string().trim().optional(),
            offset: Joi.number().integer().optional(),
            limit: Joi.number().integer().optional()
        }).optional(),
        desc : {
            // bodyDescription : "User object that needs to be added",
            parameters : {
                searchTerm: "Search term",
        sortField: "Field to sort",
        sortBy: "Sort direction",
        offset: "Offset",
        limit: "Limit"
            }
        },
    },
    getById: {
        params: Joi.object().keys({
            userId: Joi.number().min(1).integer().required()
        }).required(),
        desc : {
            // bodyDescription : "User object that needs to be added",
            parameters : {
                userId: "userId",
            }
        },
    },
}