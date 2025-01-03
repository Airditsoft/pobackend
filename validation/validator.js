const joi = require('joi');

const userSchema = joi.object({
    username: joi.string().min(3).required().messages({
        "string.empty": "Username cannot be empty",
        "string.min": "Username should be at least 5 characters long",
    }),
    email: joi.string().email().required().messages({
        "string.empty": "Email cannot be empty",
        "string.email": "Please enter a valid email"
    }),
    phonenumber: joi.string().pattern(/^\d{10}$/).required().messages({
        'string.empty': "Please enter the phone number",
        'string.pattern.base': 'Please enter a valid 10-digit mobile number'
    }),
    designation: joi.string().required().messages({
        "string.empty": "Designation cannot be empty"
    }),
    level: joi.number().required().messages({
        "number.empty": "Level cannot be empty"
    })
}).unknown(false);




// Schema for the approval/rejection action
const approvalSchema = joi.object({
    action: joi.string().valid('approve', 'reject').required().messages({
        'string.empty': 'Action is required',
        'any.only': 'Action must be either "approve" or "reject"',
    }),
    comment: joi.string().optional().allow('').messages({
        'string.empty': 'Comment cannot be empty if rejection is selected',
    }).when('action', {
        is: 'reject',
        then: joi.string().required().messages({
            'string.empty': 'Rejection comment is required',
        }),
        otherwise: joi.string().optional().allow(''),
    }),
}).unknown(false);





const userLastLevelSchema = joi.object({
    level: joi.number().strict().required().messages({
      'number.base': 'Level must be a number',
      'number.empty': 'Level is required',
      'any.required': 'Level is required'
    })
  }).unknown(false);

module.exports = { userSchema , approvalSchema,userLastLevelSchema};



