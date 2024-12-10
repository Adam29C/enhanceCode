const mongoose = require('mongoose');

const timeHistorySchema = new mongoose.Schema({
    isActive: {
        type: Boolean,
        default: false
    },
    collectionName: {
        type: String,
    },
    name:{
        type:String,
    },
    deleteTime: {
        type: Number,
        default: 0,
    },
    description:{
        type:String
    }
}, {
    timestamps: true
})
module.exports = mongoose.model('timeHistory', timeHistorySchema);